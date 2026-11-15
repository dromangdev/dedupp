use dedupp_core::{
    group_duplicates, DecisionEngine, DedupeCriterion, DedupeDecision, DiskSpaceInfo,
    DuplicateGroup, SafeActionExecutor, Scanner,
};
use dj_libraries::engine_dj::{
    is_engine_dj_running, EngineCleanupResult, EngineDjDatabase, MissingEngineTrack,
};
use dj_libraries::rekordbox::{
    is_rekordbox_running, RekordboxCleanupResult, RekordboxMissingTrack, RekordboxPdbDatabase,
    RekordboxStatusInfo,
};
use dj_libraries::DetectedLibraries;
use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::Emitter;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineStatusInfo {
    pub has_engine_dj: bool,
    pub is_running: bool,
    pub db_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DriveItem {
    pub label: String,
    pub path: String,
    pub is_usb: bool,
    pub disk_space: Option<DiskSpaceInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanProgressPayload {
    pub current: usize,
    pub total: usize,
    pub current_file: String,
    pub percentage: f32,
    pub log_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResultPayload {
    pub total_tracks_found: usize,
    pub duplicate_groups: Vec<DuplicateGroup>,
    pub detected_libraries: DetectedLibraries,
}

#[tauri::command]
fn list_available_drives() -> Vec<DriveItem> {
    let mut drives = Vec::new();

    // 1. Detectar unidades montadas en macOS (/Volumes)
    #[cfg(target_os = "macos")]
    {
        if let Ok(entries) = std::fs::read_dir("/Volumes") {
            for entry in entries.flatten() {
                let p = entry.path();
                let name = p.file_name().unwrap_or_default().to_string_lossy().to_string();
                if name.starts_with('.') || name == "Recovery" {
                    continue;
                }
                let is_root = p == Path::new("/Volumes/Macintosh HD")
                    || std::fs::read_link(&p).map(|dest| dest == Path::new("/")).unwrap_or(false);

                let disk_space = DiskSpaceInfo::from_path(&p);
                let label = if is_root {
                    if let Some(ref ds) = disk_space {
                        format!("🖥️ Disco Principal ({}) [{} libres de {}]", name, ds.free_formatted, ds.total_formatted)
                    } else {
                        format!("🖥️ Disco Principal ({})", name)
                    }
                } else {
                    if let Some(ref ds) = disk_space {
                        format!("💾 USB / Disco: {} [{} libres de {}]", name, ds.free_formatted, ds.total_formatted)
                    } else {
                        format!("💾 USB / Disco Externo: {}", name)
                    }
                };

                drives.push(DriveItem {
                    label,
                    path: p.to_string_lossy().to_string(),
                    is_usb: !is_root,
                    disk_space,
                });
            }
        }
    }

    // 2. Detectar unidades en Windows (C:\, D:\, etc.)
    #[cfg(target_os = "windows")]
    {
        for letter in b'C'..=b'Z' {
            let root_str = format!("{}:\\", letter as char);
            let p = Path::new(&root_str);
            if p.exists() {
                let is_c = letter == b'C';
                let disk_space = DiskSpaceInfo::from_path(p);
                let label = if is_c {
                    if let Some(ref ds) = disk_space {
                        format!("🖥️ Disco Principal ({}) [{} libres de {}]", root_str, ds.free_formatted, ds.total_formatted)
                    } else {
                        format!("🖥️ Disco Principal ({})", root_str)
                    }
                } else {
                    if let Some(ref ds) = disk_space {
                        format!("💾 Unidad de Disco ({}) [{} libres de {}]", root_str, ds.free_formatted, ds.total_formatted)
                    } else {
                        format!("💾 Unidad de Disco ({})", root_str)
                    }
                };
                drives.push(DriveItem {
                    label,
                    path: root_str,
                    is_usb: !is_c,
                    disk_space,
                });
            }
        }
    }

    // 3. Carpeta de Música del usuario (~/Music)
    if let Ok(home) = std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE")) {
        let music_dir = Path::new(&home).join("Music");
        if music_dir.exists() {
            let disk_space = DiskSpaceInfo::from_path(&music_dir);
            let label = if let Some(ref ds) = disk_space {
                format!("🎵 Colección de Música (~/Music) [{} libres]", ds.free_formatted)
            } else {
                "🎵 Colección de Música (~/Music)".to_string()
            };
            drives.push(DriveItem {
                label,
                path: music_dir.to_string_lossy().to_string(),
                is_usb: false,
                disk_space,
            });
        }
    }

    // 4. Carpeta de trabajo actual
    if let Ok(cwd) = std::env::current_dir() {
        let name = cwd.file_name().unwrap_or_default().to_string_lossy().to_string();
        let disk_space = DiskSpaceInfo::from_path(&cwd);
        drives.push(DriveItem {
            label: format!("📂 Carpeta de Trabajo ({})", name),
            path: cwd.to_string_lossy().to_string(),
            is_usb: false,
            disk_space,
        });
    }

    // Priorizar unidades que contengan colecciones DJ (Engine Library, PIONEER, Serato) y unidades USB
    drives.sort_by_key(|d| {
        let p = Path::new(&d.path);
        let has_dj = p.join("Engine Library").exists()
            || p.join("PIONEER").exists()
            || p.join("pioneer").exists()
            || p.join("_Serato_").exists();
        if has_dj {
            0
        } else if d.is_usb {
            1
        } else {
            2
        }
    });

    drives
}

#[tauri::command]
fn get_disk_usage(path: String) -> Result<DiskSpaceInfo, String> {
    DiskSpaceInfo::from_path(Path::new(&path))
        .ok_or_else(|| format!("No se pudo leer la capacidad de almacenamiento para: {}", path))
}

#[tauri::command]
fn browse_folder(base_path: Option<String>) -> Result<Option<String>, String> {
    let mut dialog = rfd::FileDialog::new()
        .set_title("Selecciona una carpeta dentro de la unidad seleccionada");

    let base = base_path.as_deref().map(Path::new);

    if let Some(p) = base {
        if p.exists() {
            dialog = dialog.set_directory(p);
        }
    }

    let picked = dialog.pick_folder();

    if let (Some(picked_path), Some(base_p)) = (&picked, base) {
        if !picked_path.starts_with(base_p) {
            let unit_name = base_p.file_name().unwrap_or_default().to_string_lossy();
            return Err(format!(
                "Has seleccionado una carpeta fuera de la unidad '{}'. Por favor selecciona una carpeta dentro de {}.",
                unit_name,
                base_p.display()
            ));
        }
    }

    Ok(picked.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
async fn scan_directory(
    app: tauri::AppHandle,
    path: String,
    tolerance_secs: f64,
) -> Result<ScanResultPayload, String> {
    // Ejecutar en hilo de fondo para no bloquear la interfaz gráfica
    tauri::async_runtime::spawn_blocking(move || {
        let p = Path::new(&path);
        if !p.exists() {
            return Err(format!("La ruta '{}' no existe.", path));
        }

        let scanner = Scanner::new(p);
        let app_clone = app.clone();

        let (tracks, dj_libs) = scanner.scan(None, move |prog| {
            let percentage = if prog.total > 0 {
                (prog.current as f32 / prog.total as f32) * 100.0
            } else {
                0.0
            };

            let payload = ScanProgressPayload {
                current: prog.current,
                total: prog.total,
                current_file: prog.current_file,
                percentage,
                log_message: prog.log_message,
            };

            let _ = app_clone.emit("scan-progress", &payload);
        });

        let total_tracks_found = tracks.len();
        let duplicate_groups = group_duplicates(tracks, tolerance_secs);

        Ok(ScanResultPayload {
            total_tracks_found,
            duplicate_groups,
            detected_libraries: dj_libs,
        })
    })
    .await
    .map_err(|e| format!("Error en la tarea de escaneo: {}", e))?
}

#[tauri::command]
fn compute_decisions(
    groups: Vec<DuplicateGroup>,
    criterion: String,
    protect_cues: bool,
) -> Result<Vec<DedupeDecision>, String> {
    let crit = match criterion.as_str() {
        "latest" => DedupeCriterion::LatestVersion,
        _ => DedupeCriterion::HighestQuality,
    };

    let engine = DecisionEngine::new(crit, protect_cues);
    let mut decisions = Vec::new();

    for g in &groups {
        if let Some(dec) = engine.decide(g) {
            decisions.push(dec);
        }
    }

    Ok(decisions)
}

#[tauri::command]
async fn apply_quarantine(
    app: tauri::AppHandle,
    root_dir: String,
    decisions: Vec<DedupeDecision>,
    mode: String,
    dry_run: bool,
) -> Result<dedupp_core::ExecutionResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let elim_mode = if mode == "trash" {
            dedupp_core::EliminationMode::Trash
        } else {
            dedupp_core::EliminationMode::Quarantine
        };

        let executor = SafeActionExecutor::new(&root_dir, dry_run);
        let app_clone = app.clone();

        executor
            .execute_with_progress(&decisions, elim_mode, move |prog| {
                let _ = app_clone.emit("action-progress", &prog);
            })
            .map_err(|e| format!("Error en la ejecución: {}", e))
    })
    .await
    .map_err(|e| format!("Error en hilo de fondo: {}", e))?
}

#[tauri::command]
fn export_csv_report(
    root_dir: String,
    decisions: Vec<DedupeDecision>,
    output_path: String,
) -> Result<String, String> {
    let executor = SafeActionExecutor::new(&root_dir, true);
    executor
        .export_csv(&decisions, Path::new(&output_path))
        .map_err(|e| format!("Error exportando CSV: {}", e))?;
    Ok(format!("Informe guardado con éxito en {}", output_path))
}

#[tauri::command]
fn open_system_trash() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        // 1. Intentar activar Finder y abrir la ventana de la Papelera
        let script = "tell application \"Finder\"\nactivate\nopen trash\nend tell";
        let spawn_res = std::process::Command::new("osascript")
            .arg("-e")
            .arg(script)
            .spawn();

        if let Ok(mut child) = spawn_res {
            // Darle hasta 1 segundo para verificar si corrió bien
            match child.wait() {
                Ok(status) if status.success() => return Ok(()),
                _ => {}
            }
        }

        // 2. Fallback: Abrir la carpeta de la papelera con el comando 'open' nativo
        let home = std::env::var("HOME").unwrap_or_else(|_| "/Users/dromang".to_string());
        let trash_path = format!("{}/.Trash", home);
        let _ = std::process::Command::new("open")
            .arg("-a")
            .arg("Finder")
            .arg(&trash_path)
            .spawn();
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer.exe")
            .arg("shell:RecycleBinFolder")
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn play_system_sound(sound_name: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let sound_path = match sound_name.as_str() {
            "trash" => "/System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/finder/move to trash.aif",
            "empty_trash" => "/System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/finder/empty trash.aif",
            "pop" => "/System/Library/Sounds/Pop.aiff",
            "hero" => "/System/Library/Sounds/Hero.aiff",
            "funk" => "/System/Library/Sounds/Funk.aiff",
            "glass" => "/System/Library/Sounds/Glass.aiff",
            "tink" => "/System/Library/Sounds/Tink.aiff",
            _ => "",
        };

        if !sound_path.is_empty() && Path::new(sound_path).exists() {
            let _ = std::process::Command::new("afplay")
                .arg(sound_path)
                .spawn();
            return Ok(());
        }
    }
    #[cfg(target_os = "windows")]
    {
        if sound_name == "trash" || sound_name == "pop" {
            let _ = std::process::Command::new("powershell")
                .arg("-c")
                .arg("[System.Media.SystemSounds]::Asterisk.Play()")
                .spawn();
        }
    }
    Ok(())
}

#[tauri::command]
fn check_engine_status(root_dir: String) -> EngineStatusInfo {
    let p = Path::new(&root_dir);
    let db_opt = EngineDjDatabase::find_in_root(p);
    let has_engine_dj = db_opt.is_some();
    let db_path = db_opt.map(|db| db.db_path.to_string_lossy().to_string());
    let is_running = is_engine_dj_running();

    EngineStatusInfo {
        has_engine_dj,
        is_running,
        db_path,
    }
}

#[tauri::command]
async fn get_engine_missing_tracks(root_dir: String) -> Result<Vec<MissingEngineTrack>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let p = Path::new(&root_dir);
        let db = EngineDjDatabase::find_in_root(p)
            .ok_or_else(|| format!("No se encontró ninguna base de datos Engine DJ en {}", root_dir))?;

        db.scan_missing_tracks()
            .map_err(|e| format!("Error escaneando pistas de Engine DJ: {}", e))
    })
    .await
    .map_err(|e| format!("Error en hilo de fondo: {}", e))?
}

#[tauri::command]
async fn purge_engine_missing_tracks(
    root_dir: String,
    track_ids: Option<Vec<i64>>,
) -> Result<EngineCleanupResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        if is_engine_dj_running() {
            return Err("Engine DJ está abierto en este momento. Ciérralo completamente para poder purgar las pistas de forma segura sin corromper la base de datos.".to_string());
        }

        let p = Path::new(&root_dir);
        let db = EngineDjDatabase::find_in_root(p)
            .ok_or_else(|| format!("No se encontró ninguna base de datos Engine DJ en {}", root_dir))?;

        let ids_to_purge = match track_ids {
            Some(ids) if !ids.is_empty() => ids,
            _ => {
                let missing = db.scan_missing_tracks()
                    .map_err(|e| format!("Error identificando pistas rojas: {}", e))?;
                missing.into_iter().map(|m| m.id).collect()
            }
        };

        db.purge_missing_tracks(&ids_to_purge)
            .map_err(|e| format!("Error al purgar pistas de Engine DJ: {}", e))
    })
    .await
    .map_err(|e| format!("Error en hilo de fondo: {}", e))?
}

#[tauri::command]
async fn sync_engine_duplicates(
    root_dir: String,
    decisions: Vec<DedupeDecision>,
) -> Result<EngineCleanupResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        if is_engine_dj_running() {
            return Err("Engine DJ está abierto en este momento. Ciérralo completamente para poder sincronizar las listas y pistas de forma segura.".to_string());
        }

        let p = Path::new(&root_dir);
        let db = match EngineDjDatabase::find_in_root(p) {
            Some(db) => db,
            None => return Ok(EngineCleanupResult::default()),
        };

        let mut pairs = Vec::new();
        for dec in decisions {
            let win_path = dec.keep.path;
            for discard_item in dec.discard {
                pairs.push((win_path.clone(), discard_item.track.path));
            }
        }

        db.relink_and_purge_duplicates(&pairs)
            .map_err(|e| format!("Error al sincronizar Engine DJ: {}", e))
    })
    .await
    .map_err(|e| format!("Error en hilo de fondo: {}", e))?
}

#[tauri::command]
fn check_rekordbox_status(root_dir: String) -> RekordboxStatusInfo {
    let p = Path::new(&root_dir);
    let is_running = is_rekordbox_running();
    if let Some(rkb_db) = RekordboxPdbDatabase::find_in_drive(p) {
        let total_tracks = rkb_db.total_tracks();
        let missing_count = match rkb_db.get_missing_tracks() {
            Ok(m) => m.len(),
            Err(_) => 0,
        };
        RekordboxStatusInfo {
            has_rekordbox: true,
            is_running,
            pdb_path: Some(rkb_db.pdb_path.to_string_lossy().to_string()),
            total_tracks,
            missing_tracks_count: missing_count,
        }
    } else {
        let dj_libs = DetectedLibraries::detect_in_root(p);
        let has_rekordbox = dj_libs.has_rekordbox;
        let pdb_path = dj_libs
            .rekordbox_dir
            .map(|d| d.to_string_lossy().to_string())
            .or_else(|| dj_libs.rekordbox_xml.map(|x| x.to_string_lossy().to_string()));

        RekordboxStatusInfo {
            has_rekordbox,
            is_running,
            pdb_path,
            total_tracks: 0,
            missing_tracks_count: 0,
        }
    }
}

#[tauri::command]
async fn get_rekordbox_missing_tracks(
    root_dir: String,
) -> Result<Vec<RekordboxMissingTrack>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let p = Path::new(&root_dir);
        let rkb = RekordboxPdbDatabase::find_in_drive(p).ok_or_else(|| {
            format!(
                "No se encontró base de datos Rekordbox (export.pdb) en {}",
                root_dir
            )
        })?;

        rkb.get_missing_tracks()
            .map_err(|e| format!("Error escaneando pistas rojas de Rekordbox: {}", e))
    })
    .await
    .map_err(|e| format!("Error en hilo de fondo: {}", e))?
}

#[tauri::command]
async fn purge_rekordbox_missing_tracks(
    root_dir: String,
    track_ids: Option<Vec<u32>>,
) -> Result<RekordboxCleanupResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        if is_rekordbox_running() {
            return Err("Rekordbox está abierto en este momento. Ciérralo completamente para poder purgar las pistas de forma segura sin corromper la base de datos de cabina.".to_string());
        }

        let p = Path::new(&root_dir);
        let mut rkb = RekordboxPdbDatabase::find_in_drive(p).ok_or_else(|| {
            format!(
                "No se encontró ninguna base de datos Rekordbox (export.pdb) en {}",
                root_dir
            )
        })?;

        let ids_to_purge = match track_ids {
            Some(ids) if !ids.is_empty() => ids,
            _ => {
                let missing = rkb
                    .get_missing_tracks()
                    .map_err(|e| format!("Error identificando pistas rojas de Rekordbox: {}", e))?;
                missing.into_iter().map(|m| m.id).collect()
            }
        };

        rkb.purge_missing_tracks(&ids_to_purge)
            .map_err(|e| format!("Error al purgar pistas de Rekordbox: {}", e))
    })
    .await
    .map_err(|e| format!("Error en hilo de fondo: {}", e))?
}

#[tauri::command]
async fn sync_rekordbox_duplicates(
    root_dir: String,
    decisions: Vec<DedupeDecision>,
) -> Result<RekordboxCleanupResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        if is_rekordbox_running() {
            return Err("Rekordbox está abierto en este momento. Ciérralo completamente para poder sincronizar las listas y pistas de cabina de forma segura.".to_string());
        }

        let p = Path::new(&root_dir);
        let mut rkb = match RekordboxPdbDatabase::find_in_drive(p) {
            Some(db) => db,
            None => return Ok(RekordboxCleanupResult::default()),
        };

        let mut pairs = Vec::new();
        for dec in decisions {
            let win_path = dec.keep.path;
            for discard_item in dec.discard {
                pairs.push((win_path.clone(), discard_item.track.path));
            }
        }

        rkb.relink_and_purge_duplicates(&pairs)
            .map_err(|e| format!("Error al sincronizar Rekordbox: {}", e))
    })
    .await
    .map_err(|e| format!("Error en hilo de fondo: {}", e))?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            list_available_drives,
            browse_folder,
            scan_directory,
            compute_decisions,
            apply_quarantine,
            export_csv_report,
            open_system_trash,
            get_disk_usage,
            play_system_sound,
            check_engine_status,
            get_engine_missing_tracks,
            purge_engine_missing_tracks,
            sync_engine_duplicates,
            check_rekordbox_status,
            get_rekordbox_missing_tracks,
            purge_rekordbox_missing_tracks,
            sync_rekordbox_duplicates
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_list_drives() {
        let drives = list_available_drives();
        assert!(!drives.is_empty());
    }
}
