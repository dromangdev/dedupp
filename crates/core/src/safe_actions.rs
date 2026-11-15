use crate::decision::DedupeDecision;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use thiserror::Error;

#[cfg(target_os = "macos")]
use trash::macos::{DeleteMethod, TrashContextExtMacos};

pub fn send_to_trash<P: AsRef<Path>>(path: P) -> Result<(), ActionError> {
    let mut ctx = trash::TrashContext::default();
    #[cfg(target_os = "macos")]
    ctx.set_delete_method(DeleteMethod::NsFileManager);

    ctx.delete(path.as_ref())
        .map_err(|e| ActionError::TrashError(e.to_string()))
}

#[derive(Error, Debug)]
pub enum ActionError {
    #[error("Error de archivo o directorio: {0}")]
    Io(#[from] std::io::Error),
    #[error("Error de serialización JSON: {0}")]
    Json(#[from] serde_json::Error),
    #[error("Error enviando archivo a la papelera: {0}")]
    TrashError(String),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum EliminationMode {
    /// Envía a la papelera nativa del sistema operativo (permite liberar espacio al vaciarla)
    Trash,
    /// Mueve a la subcarpeta oculta de cuarentena en la propia unidad (.dedupp_quarantine)
    Quarantine,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionProgress {
    pub current: usize,
    pub total: usize,
    pub current_file: String,
    pub percentage: f32,
    pub mode: EliminationMode,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuarantineManifestItem {
    pub original_path: PathBuf,
    pub quarantined_path: PathBuf,
    pub reason: String,
    pub kept_path: PathBuf,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuarantineManifest {
    pub timestamp: String,
    pub root_scanned: PathBuf,
    pub items: Vec<QuarantineManifestItem>,
}

pub fn format_bytes(bytes: u64) -> String {
    const KB: f64 = 1024.0;
    const MB: f64 = KB * 1024.0;
    const GB: f64 = MB * 1024.0;
    const TB: f64 = GB * 1024.0;

    let b = bytes as f64;
    if b >= TB {
        format!("{:.2} TB", b / TB)
    } else if b >= GB {
        format!("{:.2} GB", b / GB)
    } else if b >= MB {
        format!("{:.1} MB", b / MB)
    } else if b >= KB {
        format!("{:.0} KB", b / KB)
    } else {
        format!("{} B", bytes)
    }
}

pub fn get_disk_space(path: &Path) -> Option<(u64, u64)> {
    #[cfg(unix)]
    {
        use std::ffi::CString;
        use std::os::unix::ffi::OsStrExt;

        let target_path = if path.exists() {
            path.to_path_buf()
        } else if let Some(parent) = path.parent() {
            parent.to_path_buf()
        } else {
            PathBuf::from("/")
        };

        let c_path = CString::new(target_path.as_os_str().as_bytes()).ok()?;
        let mut stat: libc::statvfs = unsafe { std::mem::zeroed() };
        if unsafe { libc::statvfs(c_path.as_ptr(), &mut stat) } == 0 {
            let total = stat.f_blocks as u64 * stat.f_frsize as u64;
            let free = stat.f_bavail as u64 * stat.f_frsize as u64;
            Some((total, free))
        } else {
            None
        }
    }

    #[cfg(windows)]
    {
        use std::os::windows::ffi::OsStrExt;

        let target_path = if path.exists() {
            path.to_path_buf()
        } else if let Some(parent) = path.parent() {
            parent.to_path_buf()
        } else {
            PathBuf::from("C:\\")
        };

        let mut wide_path: Vec<u16> = target_path.as_os_str().encode_wide().collect();
        wide_path.push(0);

        let mut free_bytes_available: u64 = 0;
        let mut total_number_of_bytes: u64 = 0;
        let mut total_number_of_free_bytes: u64 = 0;

        extern "system" {
            fn GetDiskFreeSpaceExW(
                lpDirectoryName: *const u16,
                lpFreeBytesAvailableToCaller: *mut u64,
                lpTotalNumberOfBytes: *mut u64,
                lpTotalNumberOfFreeBytes: *mut u64,
            ) -> i32;
        }

        let ret = unsafe {
            GetDiskFreeSpaceExW(
                wide_path.as_ptr(),
                &mut free_bytes_available,
                &mut total_number_of_bytes,
                &mut total_number_of_free_bytes,
            )
        };

        if ret != 0 {
            Some((total_number_of_bytes, free_bytes_available))
        } else {
            None
        }
    }

    #[cfg(not(any(unix, windows)))]
    {
        None
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskSpaceInfo {
    pub path: String,
    pub total_bytes: u64,
    pub free_bytes: u64,
    pub used_bytes: u64,
    pub used_percentage: f32,
    pub total_formatted: String,
    pub free_formatted: String,
    pub used_formatted: String,
}

impl DiskSpaceInfo {
    pub fn from_path<P: AsRef<Path>>(path: P) -> Option<Self> {
        let p = path.as_ref();
        let (total_bytes, free_bytes) = get_disk_space(p)?;
        let used_bytes = total_bytes.saturating_sub(free_bytes);
        let used_percentage = if total_bytes > 0 {
            ((used_bytes as f64 / total_bytes as f64) * 100.0) as f32
        } else {
            0.0
        };

        Some(Self {
            path: p.to_string_lossy().to_string(),
            total_bytes,
            free_bytes,
            used_bytes,
            used_percentage,
            total_formatted: format_bytes(total_bytes),
            free_formatted: format_bytes(free_bytes),
            used_formatted: format_bytes(used_bytes),
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionResult {
    pub timestamp: String,
    pub mode: EliminationMode,
    pub total_moved: usize,
    pub total_bytes_freed: u64,
    pub formatted_bytes_freed: String,
    pub destination_summary: String,
    pub items: Vec<QuarantineManifestItem>,
}

pub struct SafeActionExecutor {
    pub root_dir: PathBuf,
    pub dry_run: bool,
}

impl SafeActionExecutor {
    pub fn new<P: AsRef<Path>>(root: P, dry_run: bool) -> Self {
        Self {
            root_dir: root.as_ref().to_path_buf(),
            dry_run,
        }
    }

    /// Ejecuta la acción de cuarentena sobre las decisiones tomadas con callback de progreso
    pub fn execute_with_progress<F>(
        &self,
        decisions: &[DedupeDecision],
        mode: EliminationMode,
        on_progress: F,
    ) -> Result<ExecutionResult, ActionError>
    where
        F: Fn(ActionProgress) + Send + Sync + 'static,
    {
        let timestamp_str = Utc::now().format("%Y%m%d_%H%M%S").to_string();
        let timestamp_display = chrono::Local::now().format("%Y-%m-%d %H.%M.%S").to_string();
        
        let quarantine_base = self
            .root_dir
            .join(".dedupp_quarantine")
            .join(&timestamp_str);

        let trash_folder_name = format!("Duplicados Eliminados DJ [{}]", timestamp_display);
        let trash_staging_base = self.root_dir.join(&trash_folder_name);

        let total_items: usize = decisions.iter().map(|d| d.discard.len()).sum();
        let mut manifest_items = Vec::new();
        let mut current_idx = 0;

        for dec in decisions {
            for discarded in &dec.discard {
                current_idx += 1;
                let orig_path = &discarded.track.path;
                let filename = &discarded.track.filename;

                let percentage = if total_items > 0 {
                    (current_idx as f32 / total_items as f32) * 100.0
                } else {
                    100.0
                };

                on_progress(ActionProgress {
                    current: current_idx,
                    total: total_items,
                    current_file: filename.clone(),
                    percentage,
                    mode,
                });

                let quarantined_dest: PathBuf;

                if !self.dry_run {
                    let rel_path = orig_path
                        .strip_prefix(&self.root_dir)
                        .unwrap_or_else(|_| Path::new(filename));

                    match mode {
                        EliminationMode::Trash => {
                            let target_path = trash_staging_base.join(rel_path);
                            if let Some(parent) = target_path.parent() {
                                fs::create_dir_all(parent)?;
                            }
                            if orig_path.exists() {
                                if fs::rename(orig_path, &target_path).is_err() {
                                    fs::copy(orig_path, &target_path)?;
                                    let _ = fs::remove_file(orig_path);
                                }
                            }
                            quarantined_dest = target_path;
                        }
                        EliminationMode::Quarantine => {
                            let target_path = quarantine_base.join(rel_path);

                            if let Some(parent) = target_path.parent() {
                                fs::create_dir_all(parent)?;
                            }
                            if orig_path.exists() {
                                if fs::rename(orig_path, &target_path).is_err() {
                                    fs::copy(orig_path, &target_path)?;
                                    let _ = fs::remove_file(orig_path);
                                }
                            }
                            quarantined_dest = target_path;
                        }
                    }
                } else {
                    quarantined_dest = match mode {
                        EliminationMode::Trash => trash_staging_base.join(filename),
                        EliminationMode::Quarantine => quarantine_base.join(filename),
                    };
                }

                manifest_items.push(QuarantineManifestItem {
                    original_path: orig_path.clone(),
                    quarantined_path: quarantined_dest,
                    reason: discarded.reason.clone(),
                    kept_path: dec.keep.path.clone(),
                });
            }
        }

        let destination_summary = match mode {
            EliminationMode::Trash => format!("Papelera (Carpeta: {})", trash_folder_name),
            EliminationMode::Quarantine => quarantine_base.display().to_string(),
        };

        if !self.dry_run && !manifest_items.is_empty() {
            match mode {
                EliminationMode::Trash => {
                    // Escribir un archivo resumen explicativo dentro de la carpeta antes de moverla a la papelera
                    let summary_text = format!(
                        "============================================================\n\
                         DJ DEDUPE - DUPLICADOS ELIMINADOS\n\
                         ============================================================\n\
                         Fecha: {}\n\
                         Unidad origen: {}\n\
                         Total archivos duplicados en esta carpeta: {}\n\n\
                         Todas las versiones de mayor calidad y metadatos DJ (Hot Cues,\n\
                         Beatgrids y Playlists) se conservaron intactas en tu unidad.\n\
                         ============================================================\n",
                        timestamp_display,
                        self.root_dir.display(),
                        manifest_items.len()
                    );
                    let _ = fs::write(trash_staging_base.join("LEEME_info_duplicados.txt"), summary_text);

                    // Mover la carpeta completa a la papelera (aparece como una única carpeta agrupada)
                    // Utiliza NSFileManager en macOS para evitar congelar el Finder cuando hay nombres especiales (como ':')
                    if trash_staging_base.exists() {
                        send_to_trash(&trash_staging_base)?;
                    }
                }
                EliminationMode::Quarantine => {
                    fs::create_dir_all(&quarantine_base)?;
                    let manifest_file = quarantine_base.join("manifest.json");
                    let manifest = QuarantineManifest {
                        timestamp: timestamp_str.clone(),
                        root_scanned: self.root_dir.clone(),
                        items: manifest_items.clone(),
                    };
                    let json = serde_json::to_string_pretty(&manifest)?;
                    fs::write(manifest_file, json)?;
                }
            }
        }

        let total_bytes_freed: u64 = decisions
            .iter()
            .flat_map(|d| &d.discard)
            .map(|disc| disc.track.file_size_bytes)
            .sum();

        Ok(ExecutionResult {
            timestamp: timestamp_str,
            mode,
            total_moved: manifest_items.len(),
            total_bytes_freed,
            formatted_bytes_freed: format_bytes(total_bytes_freed),
            destination_summary,
            items: manifest_items,
        })
    }

    /// Versión simplificada para compatibilidad
    pub fn execute(&self, decisions: &[DedupeDecision]) -> Result<QuarantineManifest, ActionError> {
        let res = self.execute_with_progress(decisions, EliminationMode::Quarantine, |_| {})?;
        Ok(QuarantineManifest {
            timestamp: res.timestamp,
            root_scanned: self.root_dir.clone(),
            items: res.items,
        })
    }

    /// Genera un informe detallado en formato CSV
    pub fn export_csv(&self, decisions: &[DedupeDecision], output_path: &Path) -> Result<(), std::io::Error> {
        let mut lines = Vec::new();
        lines.push("Estado,Grupo,Ruta Archivo,Formato,Bitrate (kbps),SampleRate (Hz),Duracion (s),Fecha Modif,Cues DJ,Playlists DJ,Motivo".to_string());

        for dec in decisions {
            let k = &dec.keep;
            lines.push(format!(
                "CONSERVADO,\"{}\",\"{}\",{},{},{},{:.1},{},{},\"{}\",\"Ganador ({})\"",
                dec.group_key.replace('"', "\"\""),
                k.path.display().to_string().replace('"', "\"\""),
                k.extension,
                k.bitrate_kbps,
                k.sample_rate_hz,
                k.duration_seconds,
                k.modified_time.format("%Y-%m-%d %H:%M:%S"),
                k.dj_info.engine_dj_cue_count + k.dj_info.serato_cue_count + k.dj_info.rekordbox_cue_count,
                k.dj_info.engine_dj_playlists.join(" | "),
                dec.summary_reason.replace('"', "\"\"")
            ));

            for disc in &dec.discard {
                let d = &disc.track;
                lines.push(format!(
                    "DESCARTADO,\"{}\",\"{}\",{},{},{},{:.1},{},{},\"{}\",\"{}\"",
                    dec.group_key.replace('"', "\"\""),
                    d.path.display().to_string().replace('"', "\"\""),
                    d.extension,
                    d.bitrate_kbps,
                    d.sample_rate_hz,
                    d.duration_seconds,
                    d.modified_time.format("%Y-%m-%d %H:%M:%S"),
                    d.dj_info.engine_dj_cue_count + d.dj_info.serato_cue_count + d.dj_info.rekordbox_cue_count,
                    d.dj_info.engine_dj_playlists.join(" | "),
                    disc.reason.replace('"', "\"\"")
                ));
            }
        }

        fs::write(output_path, lines.join("\n"))?;
        Ok(())
    }
}






