use crate::audio::AudioMetadata;
use dj_libraries::engine_dj::EngineDjDatabase;
use dj_libraries::rekordbox::{RekordboxInspector, RekordboxPdbDatabase};
use dj_libraries::serato::SeratoInspector;
use dj_libraries::{DetectedLibraries, TrackDjInfo};
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::Arc;
use walkdir::WalkDir;

const SUPPORTED_EXTENSIONS: &[&str] = &[
    "mp3", "wav", "aif", "aiff", "flac", "m4a", "aac", "ogg", "opus", "alac",
];

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanProgress {
    pub current: usize,
    pub total: usize,
    pub current_file: String,
    pub log_message: Option<String>,
}

pub struct Scanner {
    pub root_path: PathBuf,
}

impl Scanner {
    pub fn new<P: AsRef<Path>>(root: P) -> Self {
        Self {
            root_path: root.as_ref().to_path_buf(),
        }
    }

    /// Escanea recursivamente el directorio en paralelo, emitiendo progreso en tiempo real
    pub fn scan<F>(&self, cancel_flag: Option<Arc<AtomicBool>>, on_progress: F) -> (Vec<AudioMetadata>, DetectedLibraries)
    where
        F: Fn(ScanProgress) + Send + Sync + 'static,
    {
        // 1. Notificar inicio
        on_progress(ScanProgress {
            current: 0,
            total: 0,
            current_file: String::new(),
            log_message: Some(format!("Iniciando escaneo en: {}", self.root_path.display())),
        });

        // 2. Detectar librerías DJ en la raíz
        let dj_libs = DetectedLibraries::detect_in_root(&self.root_path);

        if dj_libs.has_engine_dj {
            on_progress(ScanProgress {
                current: 0,
                total: 0,
                current_file: String::new(),
                log_message: Some("🎛️ Detectada base de datos de Engine DJ (Database2/m.db)".to_string()),
            });
        }
        if dj_libs.has_serato {
            on_progress(ScanProgress {
                current: 0,
                total: 0,
                current_file: String::new(),
                log_message: Some("🎚️ Detectado entorno de Serato DJ (_Serato_)".to_string()),
            });
        }
        if dj_libs.has_rekordbox {
            on_progress(ScanProgress {
                current: 0,
                total: 0,
                current_file: String::new(),
                log_message: Some("💿 Detectado entorno de Rekordbox / Pioneer".to_string()),
            });
        }

        // Mapas para correlación rápida
        let mut engine_dj_map = HashMap::new();
        if let Some(db_path) = &dj_libs.engine_dj_db_path {
            let engine = EngineDjDatabase::new(db_path);
            if let Ok(tracks) = engine.scan_tracks() {
                on_progress(ScanProgress {
                    current: 0,
                    total: 0,
                    current_file: String::new(),
                    log_message: Some(format!("Indexadas {} pistas de Engine DJ con Cues y Playlists", tracks.len())),
                });
                engine_dj_map = tracks;
            }
        }

        let mut serato_crates_map = HashMap::new();
        if dj_libs.has_serato {
            let serato = SeratoInspector::new(dj_libs.serato_dir.as_ref());
            serato_crates_map = serato.scan_crates();
            on_progress(ScanProgress {
                current: 0,
                total: 0,
                current_file: String::new(),
                log_message: Some("Cajas de Serato (.crate) leídas correctamente".to_string()),
            });
        }

        let mut rekordbox_map = HashMap::new();
        if let Some(rkb_db) = RekordboxPdbDatabase::find_in_drive(&self.root_path) {
            let pdb_tracks = rkb_db.get_tracks_map();
            let count = pdb_tracks.len();
            rekordbox_map = pdb_tracks;
            on_progress(ScanProgress {
                current: 0,
                total: 0,
                current_file: String::new(),
                log_message: Some(format!(
                    "💿 Base de datos de exportación CDJ/Pioneer (export.pdb) leída ({} pistas)",
                    count
                )),
            });
        }
        if let Some(xml_path) = &dj_libs.rekordbox_xml {
            let rkb = RekordboxInspector::new(dj_libs.rekordbox_dir.as_ref(), Some(xml_path));
            if let Ok(tracks) = rkb.parse_xml() {
                for (k, v) in tracks {
                    rekordbox_map.entry(k).or_insert(v);
                }
            }
        }

        // 3. Recolectar rutas de archivos de audio
        on_progress(ScanProgress {
            current: 0,
            total: 0,
            current_file: String::new(),
            log_message: Some("Buscando archivos de audio en las carpetas...".to_string()),
        });

        let mut audio_paths: Vec<PathBuf> = Vec::new();
        for entry in WalkDir::new(&self.root_path).into_iter().flatten() {
            if let Some(cancel) = &cancel_flag {
                if cancel.load(Ordering::Relaxed) {
                    break;
                }
            }

            let path = entry.path();
            if path.is_file() {
                if let Some(ext) = path.extension().and_then(|s| s.to_str()) {
                    if SUPPORTED_EXTENSIONS.contains(&ext.to_lowercase().as_str()) {
                        audio_paths.push(path.to_path_buf());
                    }
                }
            }
        }

        let total_files = audio_paths.len();
        on_progress(ScanProgress {
            current: 0,
            total: total_files,
            current_file: String::new(),
            log_message: Some(format!("Se encontraron {} archivos de audio para analizar.", total_files)),
        });

        if total_files == 0 {
            return (Vec::new(), dj_libs);
        }

        let processed_counter = Arc::new(AtomicUsize::new(0));

        // 4. Procesamiento en paralelo de metadatos de audio con Rayon
        let on_progress_arc = Arc::new(on_progress);

        let mut tracks: Vec<AudioMetadata> = audio_paths
            .par_iter()
            .filter_map(|path| {
                if let Some(cancel) = &cancel_flag {
                    if cancel.load(Ordering::Relaxed) {
                        return None;
                    }
                }

                let res = AudioMetadata::read_from_path(path).ok();
                let current = processed_counter.fetch_add(1, Ordering::Relaxed) + 1;

                // Emitir actualización de progreso con frecuencia controlada (cada 15 archivos o al final)
                if current % 15 == 0 || current == total_files {
                    let filename = path.file_name().unwrap_or_default().to_string_lossy().to_string();
                    let log_msg = if current % 100 == 0 || current == total_files {
                        Some(format!("Procesando [{}/{}]: {}", current, total_files, filename))
                    } else {
                        None
                    };

                    on_progress_arc(ScanProgress {
                        current,
                        total: total_files,
                        current_file: filename,
                        log_message: log_msg,
                    });
                }
                res
            })
            .collect();

        // 5. Correlacionar con datos de DJ detectados
        on_progress_arc(ScanProgress {
            current: total_files,
            total: total_files,
            current_file: String::new(),
            log_message: Some("Correlacionando metadatos con librerías DJ y verificando Hot Cues...".to_string()),
        });

        for track in &mut tracks {
            let filename = &track.filename;
            let full_path_str = track.path.to_string_lossy().to_string();

            let mut dj_info = TrackDjInfo::default();

            // Engine DJ
            if let Some(e_entry) = engine_dj_map.get(&full_path_str).or_else(|| engine_dj_map.get(filename)) {
                dj_info.in_engine_dj = true;
                dj_info.engine_dj_cue_count = e_entry.cue_count;
                dj_info.engine_dj_playlists = e_entry.playlists.clone();
            }

            // Serato
            if let Some(crates) = serato_crates_map.get(&full_path_str).or_else(|| serato_crates_map.get(filename)) {
                dj_info.in_serato = true;
                dj_info.serato_crates = crates.clone();
            }

            // Rekordbox
            if let Some(r_entry) = rekordbox_map.get(&full_path_str).or_else(|| rekordbox_map.get(filename)) {
                dj_info.in_rekordbox = true;
                dj_info.rekordbox_cue_count = r_entry.cue_count;
                dj_info.rekordbox_playlists = r_entry.playlists.clone();
            }

            track.dj_info = dj_info;
        }

        on_progress_arc(ScanProgress {
            current: total_files,
            total: total_files,
            current_file: String::new(),
            log_message: Some("Analizando posibles duplicados según metadatos y duración...".to_string()),
        });

        (tracks, dj_libs)
    }
}
