pub mod engine_dj;
pub mod rekordbox;
pub mod serato;

pub use rekordbox::{
    is_rekordbox_running, RekordboxCleanupResult, RekordboxInspector, RekordboxMissingTrack,
    RekordboxPdbDatabase, RekordboxStatusInfo, RekordboxTrackInfo,
};

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

/// Helper para comprobar si una ruta es la raíz del sistema o un punto de montaje de volúmenes donde detener la búsqueda hacia arriba.
pub fn is_mount_boundary(path: &Path) -> bool {
    #[cfg(target_os = "macos")]
    {
        if path == Path::new("/") || path == Path::new("/Volumes") || path == Path::new("/Users") {
            return true;
        }
    }
    #[cfg(target_os = "windows")]
    {
        if path.parent().is_none() {
            return true;
        }
        if let Some(std::path::Component::Prefix(_)) = path.components().next() {
            if path.components().count() <= 2 {
                return true;
            }
        }
    }
    #[cfg(target_os = "linux")]
    {
        if path == Path::new("/")
            || path == Path::new("/media")
            || path == Path::new("/mnt")
            || path == Path::new("/run/media")
            || path == Path::new("/home")
            || path.parent() == Some(Path::new("/media"))
            || path.parent() == Some(Path::new("/run/media"))
        {
            return true;
        }
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        if path == Path::new("/") || path == Path::new("/mnt") || path == Path::new("/media") {
            return true;
        }
    }
    path.parent().is_none()
}

/// Resumen de los entornos de DJ detectados en la unidad o carpeta escaneada.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DetectedLibraries {
    pub has_engine_dj: bool,
    pub engine_dj_db_path: Option<PathBuf>,
    pub has_serato: bool,
    pub serato_dir: Option<PathBuf>,
    pub has_rekordbox: bool,
    pub rekordbox_dir: Option<PathBuf>,
    pub rekordbox_xml: Option<PathBuf>,
}

impl DetectedLibraries {
    /// Detecta qué software de DJ tiene presencia en la ruta especificada (disco o USB),
    /// buscando en la carpeta y ascendiendo hacia la raíz de la unidad si es una subcarpeta.
    pub fn detect_in_root<P: AsRef<Path>>(root: P) -> Self {
        let start = root.as_ref();
        let mut detected = Self::default();

        let mut curr = Some(start);
        while let Some(dir) = curr {
            // 1. Engine DJ: Busca "Engine Library/Database2/m.db", "Database2/m.db" o variantes
            if !detected.has_engine_dj {
                let engine_db1 = dir.join("Engine Library").join("Database2").join("m.db");
                let engine_db2 = dir.join("Database2").join("m.db");
                let engine_db3 = dir.join("Engine Library").join("m.db");
                if engine_db1.is_file() {
                    detected.has_engine_dj = true;
                    detected.engine_dj_db_path = Some(engine_db1);
                } else if engine_db2.is_file() {
                    detected.has_engine_dj = true;
                    detected.engine_dj_db_path = Some(engine_db2);
                } else if engine_db3.is_file() {
                    detected.has_engine_dj = true;
                    detected.engine_dj_db_path = Some(engine_db3);
                } else if let Ok(entries) = std::fs::read_dir(dir) {
                    for entry in entries.flatten() {
                        let name = entry.file_name().to_string_lossy().to_lowercase();
                        if name == "engine library" {
                            let candidate1 = entry.path().join("Database2").join("m.db");
                            let candidate2 = entry.path().join("m.db");
                            if candidate1.is_file() {
                                detected.has_engine_dj = true;
                                detected.engine_dj_db_path = Some(candidate1);
                                break;
                            } else if candidate2.is_file() {
                                detected.has_engine_dj = true;
                                detected.engine_dj_db_path = Some(candidate2);
                                break;
                            }
                        }
                    }
                }
            }

            // 2. Serato: Busca "_Serato_" o "_Serato_Backup"
            if !detected.has_serato {
                let serato_dir = dir.join("_Serato_");
                let serato_backup = dir.join("_Serato_Backup");
                if serato_dir.is_dir() {
                    detected.has_serato = true;
                    detected.serato_dir = Some(serato_dir);
                } else if serato_backup.is_dir() {
                    detected.has_serato = true;
                    detected.serato_dir = Some(serato_backup);
                }
            }

            // 3. Rekordbox: Busca carpeta "PIONEER/rekordbox", "PIONEER", export.pdb, exportLibrary.db o archivos xml
            if !detected.has_rekordbox {
                let pioneer_dir = dir.join("PIONEER").join("rekordbox");
                let pioneer_base = dir.join("PIONEER");
                let pdb_file = pioneer_dir.join("export.pdb");
                let pdb_ext = pioneer_dir.join("exportExt.pdb");
                let pdb_lib = pioneer_dir.join("exportLibrary.db");
                let rekordbox_xml = dir.join("rekordbox.xml");

                if pdb_file.is_file() || pdb_ext.is_file() || pdb_lib.is_file() {
                    detected.has_rekordbox = true;
                    detected.rekordbox_dir = Some(pioneer_dir);
                } else if pioneer_dir.is_dir() {
                    detected.has_rekordbox = true;
                    detected.rekordbox_dir = Some(pioneer_dir);
                } else if pioneer_base.is_dir() {
                    detected.has_rekordbox = true;
                    detected.rekordbox_dir = Some(pioneer_base);
                } else if rekordbox_xml.is_file() {
                    detected.has_rekordbox = true;
                    detected.rekordbox_xml = Some(rekordbox_xml);
                } else if let Ok(entries) = std::fs::read_dir(dir) {
                    for entry in entries.flatten() {
                        let name = entry.file_name().to_string_lossy().to_lowercase();
                        if name == "pioneer" && entry.path().is_dir() {
                            detected.has_rekordbox = true;
                            detected.rekordbox_dir = Some(entry.path());
                            break;
                        } else if name == "rekordbox" && entry.path().is_dir() {
                            detected.has_rekordbox = true;
                            detected.rekordbox_dir = Some(entry.path());
                            break;
                        }
                    }
                }
            }

            if is_mount_boundary(dir) {
                break;
            }
            curr = dir.parent();
        }

        detected
    }
}

/// Metadatos específicos de DJ asociados a una pista de audio
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct TrackDjInfo {
    pub in_engine_dj: bool,
    pub engine_dj_cue_count: usize,
    pub engine_dj_playlists: Vec<String>,

    pub in_serato: bool,
    pub serato_cue_count: usize,
    pub serato_crates: Vec<String>,

    pub in_rekordbox: bool,
    pub rekordbox_cue_count: usize,
    pub rekordbox_playlists: Vec<String>,
}

impl TrackDjInfo {
    /// Puntuación de relevancia DJ. Entre más cues y presencia en listas tenga una pista,
    /// mayor es su valor y más crítico es preservarla o migrarla.
    pub fn dj_importance_score(&self) -> u32 {
        let mut score = 0;
        if self.in_engine_dj {
            score += 10 + (self.engine_dj_cue_count as u32 * 2) + (self.engine_dj_playlists.len() as u32 * 5);
        }
        if self.in_serato {
            score += 10 + (self.serato_cue_count as u32 * 2) + (self.serato_crates.len() as u32 * 5);
        }
        if self.in_rekordbox {
            score += 10 + (self.rekordbox_cue_count as u32 * 2) + (self.rekordbox_playlists.len() as u32 * 5);
        }
        score
    }
}
