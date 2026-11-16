use chrono::Local;
use quick_xml::events::Event;
use quick_xml::reader::Reader;
use rekordbox_pdb::{Database, TableType};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::fs::File;
use std::io::BufReader;
use std::path::{Component, Path, PathBuf};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum RekordboxError {
    #[error("Error de E/S accediendo a base de datos Rekordbox: {0}")]
    Io(#[from] std::io::Error),
    #[error("Error parseando Rekordbox XML: {0}")]
    Xml(#[from] quick_xml::Error),
    #[error("Error en base de datos DeviceSQL (.pdb): {0}")]
    Pdb(#[from] rekordbox_pdb::PdbError),
    #[error("Base de datos Rekordbox no encontrada en: {0}")]
    NotFound(String),
    #[error("Rekordbox está abierto actualmente. Ciérralo para realizar modificaciones seguras en el USB o base de datos.")]
    AppRunning,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RekordboxTrackInfo {
    pub location: String,
    pub cue_count: usize,
    pub playlists: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RekordboxMissingTrack {
    pub id: u32,
    pub title: String,
    pub artist: String,
    pub filename: String,
    pub pdb_path: String,
    pub last_resolved_path: String,
    pub in_playlists: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RekordboxCleanupResult {
    pub purged_count: usize,
    pub relinked_playlists_count: usize,
    pub backup_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RekordboxStatusInfo {
    pub has_rekordbox: bool,
    pub is_running: bool,
    pub pdb_path: Option<String>,
    pub total_tracks: usize,
    pub missing_tracks_count: usize,
}

/// Comprueba si el proceso de Rekordbox está ejecutándose actualmente en el sistema
pub fn is_rekordbox_running() -> bool {
    #[cfg(target_os = "macos")]
    {
        if let Ok(output) = std::process::Command::new("pgrep")
            .args(["-f", "rekordbox.app/Contents/MacOS/rekordbox"])
            .output()
        {
            if output.status.success() && !output.stdout.is_empty() {
                return true;
            }
        }
    }
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let mut cmd = std::process::Command::new("tasklist");
        cmd.args(["/NH", "/FO", "CSV"]);
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        if let Ok(output) = cmd.output() {
            let out_str = String::from_utf8_lossy(&output.stdout).to_lowercase();
            if out_str.contains("rekordbox.exe") {
                return true;
            }
        }
    }
    #[cfg(target_os = "linux")]
    {
        if let Ok(output) = std::process::Command::new("pgrep")
            .args(["-i", "-f", "rekordbox"])
            .output()
        {
            if output.status.success() && !output.stdout.is_empty() {
                return true;
            }
        }
    }
    false
}

/// Normaliza una ruta resolviendo '..' y '.' sin requerir que exista en disco
pub fn normalize_path<P: AsRef<Path>>(path: P) -> PathBuf {
    let mut out = PathBuf::new();
    for comp in path.as_ref().components() {
        match comp {
            Component::ParentDir => {
                out.pop();
            }
            Component::CurDir => {}
            _ => {
                out.push(comp);
            }
        }
    }
    out
}

/// Gestor de base de datos de exportación DeviceSQL de Rekordbox / Pioneer (`export.pdb`)
pub struct RekordboxPdbDatabase {
    pub pdb_path: PathBuf,
    pub drive_root: PathBuf,
}

impl RekordboxPdbDatabase {
    pub fn new<P: AsRef<Path>, R: AsRef<Path>>(pdb_path: P, drive_root: R) -> Self {
        Self {
            pdb_path: pdb_path.as_ref().to_path_buf(),
            drive_root: drive_root.as_ref().to_path_buf(),
        }
    }

    /// Detecta la ruta de `export.pdb` o la base de datos de Rekordbox a partir de cualquier carpeta o subcarpeta de la unidad USB
    pub fn find_in_drive<P: AsRef<Path>>(drive_root: P) -> Option<Self> {
        let start = drive_root.as_ref();
        let mut curr = Some(start);

        while let Some(dir) = curr {
            let candidate1 = dir.join("PIONEER").join("rekordbox").join("export.pdb");
            if candidate1.is_file() {
                return Some(Self::new(candidate1, dir));
            }
            let candidate2 = dir.join("PIONEER").join("rekordbox").join("exportExt.pdb");
            if candidate2.is_file() {
                return Some(Self::new(candidate2, dir));
            }
            let candidate3 = dir.join("rekordbox").join("export.pdb");
            if candidate3.is_file() {
                return Some(Self::new(candidate3, dir));
            }

            // Búsqueda case-insensitive para soportar distintas estructuras de directorios FAT32/exFAT
            if let Ok(entries) = std::fs::read_dir(dir) {
                for entry in entries.flatten() {
                    let name = entry.file_name().to_string_lossy().to_lowercase();
                    if name == "pioneer" && entry.path().is_dir() {
                        let sub_p = entry.path().join("rekordbox").join("export.pdb");
                        if sub_p.is_file() {
                            return Some(Self::new(sub_p, dir));
                        }
                        if let Ok(sub_entries) = std::fs::read_dir(entry.path()) {
                            for sub_entry in sub_entries.flatten() {
                                if sub_entry.file_name().to_string_lossy().to_lowercase() == "rekordbox" && sub_entry.path().is_dir() {
                                    let p_check = sub_entry.path().join("export.pdb");
                                    if p_check.is_file() {
                                        return Some(Self::new(p_check, dir));
                                    }
                                }
                            }
                        }
                    } else if name == "rekordbox" && entry.path().is_dir() {
                        let sub_p = entry.path().join("export.pdb");
                        if sub_p.is_file() {
                            return Some(Self::new(sub_p, dir));
                        }
                    }
                }
            }

            if crate::is_mount_boundary(dir) {
                break;
            }
            curr = dir.parent();
        }

        None
    }

    /// Obtiene el total de canciones registradas en la base de datos de exportación
    pub fn total_tracks(&self) -> usize {
        Database::from_file(&self.pdb_path).map(|db| db.tracks.len()).unwrap_or(0)
    }

    /// Crea una copia de seguridad fechada antes de cualquier modificación
    pub fn create_backup(&self) -> Result<PathBuf, RekordboxError> {
        if !self.pdb_path.is_file() {
            return Err(RekordboxError::NotFound(self.pdb_path.display().to_string()));
        }
        let timestamp = Local::now().format("%Y%m%d_%H%M%S").to_string();
        let backup_name = format!("export.pdb.backup_{}", timestamp);
        let backup_path = self.pdb_path.with_file_name(backup_name);
        std::fs::copy(&self.pdb_path, &backup_path)?;
        Ok(backup_path)
    }

    /// Resuelve la ruta en disco de un track de Rekordbox
    pub fn resolve_disk_path(&self, relative_or_abs: &str) -> PathBuf {
        let clean = relative_or_abs.trim_start_matches('/');
        let direct = self.drive_root.join(clean);
        if direct.exists() {
            return normalize_path(direct);
        }

        // Si la ruta grabada contiene prefijos como /Volumes/NOMBRE_USB/Contents/...
        let path_obj = Path::new(clean);
        let mut comps = path_obj.components();
        while comps.next().is_some() {
            let sub: PathBuf = comps.as_path().to_path_buf();
            if !sub.as_os_str().is_empty() {
                let check = self.drive_root.join(&sub);
                if check.exists() {
                    return normalize_path(check);
                }
            }
        }

        normalize_path(direct)
    }

    /// Obtiene un mapa de pistas y sus playlists para correlación durante el escaneo
    pub fn get_tracks_map(&self) -> HashMap<String, RekordboxTrackInfo> {
        let mut map = HashMap::new();
        if let Ok(db) = Database::from_file(&self.pdb_path) {
            let mut playlist_names: HashMap<u32, String> = HashMap::new();
            for node in &db.playlist_tree {
                if !node.is_folder {
                    playlist_names.insert(node.id, node.name.clone());
                }
            }
            let mut track_playlists: HashMap<u32, Vec<String>> = HashMap::new();
            for entry in &db.playlist_entries {
                if let Some(pl_name) = playlist_names.get(&entry.playlist_id) {
                    let list = track_playlists.entry(entry.track_id).or_default();
                    if !list.contains(pl_name) {
                        list.push(pl_name.clone());
                    }
                }
            }
            for t in &db.tracks {
                let resolved = self
                    .resolve_disk_path(t.file_path())
                    .to_string_lossy()
                    .to_string();
                let pls = track_playlists.get(&t.id).cloned().unwrap_or_default();
                let info = RekordboxTrackInfo {
                    location: t.file_path().to_string(),
                    cue_count: 0,
                    playlists: pls,
                };
                map.insert(resolved, info.clone());
                if !t.filename().is_empty() {
                    map.insert(t.filename().to_string(), info);
                }
            }
        }
        map
    }

    /// Obtiene las pistas huérfanas / desaparecidas ("pistas rojas" / "TRACK NOT FOUND" en cabina)
    pub fn get_missing_tracks(&self) -> Result<Vec<RekordboxMissingTrack>, RekordboxError> {
        if !self.pdb_path.is_file() {
            return Err(RekordboxError::NotFound(self.pdb_path.display().to_string()));
        }

        let db = Database::from_file(&self.pdb_path)?;

        // Mapear nombres de artistas por ID
        let mut artists_map: HashMap<u32, String> = HashMap::new();
        for a in &db.artists {
            artists_map.insert(a.id, a.name.clone());
        }

        // Mapear playlists por ID (con jerarquía si aplica)
        let mut playlist_names: HashMap<u32, String> = HashMap::new();
        for node in &db.playlist_tree {
            if !node.is_folder {
                playlist_names.insert(node.id, node.name.clone());
            }
        }

        // Mapear qué playlists contienen cada track_id
        let mut track_playlists: HashMap<u32, Vec<String>> = HashMap::new();
        for entry in &db.playlist_entries {
            if let Some(pl_name) = playlist_names.get(&entry.playlist_id) {
                let list = track_playlists.entry(entry.track_id).or_default();
                if !list.contains(pl_name) {
                    list.push(pl_name.clone());
                }
            }
        }

        let mut missing = Vec::new();
        for track in &db.tracks {
            let rel_path = track.file_path();
            if rel_path.is_empty() {
                continue;
            }

            let resolved = self.resolve_disk_path(rel_path);
            if !resolved.exists() {
                let artist_name = artists_map
                    .get(&track.artist_id)
                    .cloned()
                    .unwrap_or_else(|| "Desconocido".to_string());

                let playlists = track_playlists
                    .get(&track.id)
                    .cloned()
                    .unwrap_or_default();

                missing.push(RekordboxMissingTrack {
                    id: track.id,
                    title: track.title().to_string(),
                    artist: artist_name,
                    filename: track.filename().to_string(),
                    pdb_path: rel_path.to_string(),
                    last_resolved_path: resolved.display().to_string(),
                    in_playlists: playlists,
                });
            }
        }

        Ok(missing)
    }

    /// Re-vincula las playlists de Rekordbox cuando Dedupp desduplica archivos
    pub fn relink_and_purge_duplicates(
        &mut self,
        pairs: &[(PathBuf, PathBuf)], // (winner_path, duplicate_path)
    ) -> Result<RekordboxCleanupResult, RekordboxError> {
        if is_rekordbox_running() {
            return Err(RekordboxError::AppRunning);
        }
        if pairs.is_empty() {
            return Ok(RekordboxCleanupResult::default());
        }

        let db = Database::from_file(&self.pdb_path)?;
        let mut path_to_id: HashMap<String, u32> = HashMap::new();
        let mut filename_to_id: HashMap<String, u32> = HashMap::new();

        for t in &db.tracks {
            let resolved = self.resolve_disk_path(t.file_path()).to_string_lossy().to_string();
            path_to_id.insert(resolved, t.id);
            path_to_id.insert(t.file_path().to_string(), t.id);
            if !t.filename().is_empty() {
                filename_to_id.insert(t.filename().to_string(), t.id);
            }
        }

        // Construir mapa de reemplazo de track_id (antiguo descartado -> nuevo ganador conservado)
        let mut id_replacements: HashMap<u32, u32> = HashMap::new();
        for (win_path, dup_path) in pairs {
            let dup_str = dup_path.to_string_lossy().to_string();
            let win_str = win_path.to_string_lossy().to_string();

            let dup_id = path_to_id.get(&dup_str).or_else(|| {
                dup_path
                    .file_name()
                    .and_then(|f| filename_to_id.get(&f.to_string_lossy().to_string()))
            });

            let win_id = path_to_id.get(&win_str).or_else(|| {
                win_path
                    .file_name()
                    .and_then(|f| filename_to_id.get(&f.to_string_lossy().to_string()))
            });

            if let (Some(&old_id), Some(&new_id)) = (dup_id, win_id) {
                if old_id != new_id {
                    id_replacements.insert(old_id, new_id);
                }
            }
        }

        if id_replacements.is_empty() {
            return Ok(RekordboxCleanupResult::default());
        }

        // Copia de seguridad antes de modificar
        let backup = self.create_backup()?;
        let mut raw_bytes = std::fs::read(&self.pdb_path)?;

        let playlist_locations = db.row_locations(TableType::PlaylistEntries);
        let mut relinked_count = 0;

        for (entry, &loc) in db.playlist_entries.iter().zip(playlist_locations) {
            if let Some(&new_track_id) = id_replacements.get(&entry.track_id) {
                // En TableType::PlaylistEntries cada fila tiene:
                // +0: entry_index (u32le)
                // +4: track_id (u32le)
                // +8: playlist_id (u32le)
                let bytes = new_track_id.to_le_bytes();
                if loc + 8 <= raw_bytes.len() {
                    raw_bytes[loc + 4..loc + 8].copy_from_slice(&bytes);
                    relinked_count += 1;
                }
            }
        }

        std::fs::write(&self.pdb_path, raw_bytes)?;

        Ok(RekordboxCleanupResult {
            purged_count: 0,
            relinked_playlists_count: relinked_count,
            backup_path: Some(backup.display().to_string()),
        })
    }

    /// Purga las entradas de playlists que apuntan a pistas desaparecidas / huérfanas
    pub fn purge_missing_tracks(
        &mut self,
        track_ids: &[u32],
    ) -> Result<RekordboxCleanupResult, RekordboxError> {
        if is_rekordbox_running() {
            return Err(RekordboxError::AppRunning);
        }
        if track_ids.is_empty() {
            return Ok(RekordboxCleanupResult::default());
        }

        let db = Database::from_file(&self.pdb_path)?;
        let purge_set: HashSet<u32> = track_ids.iter().copied().collect();

        // Identificar qué entradas de playlists coinciden con los IDs a purgar
        let entries_to_purge: Vec<usize> = db
            .playlist_entries
            .iter()
            .enumerate()
            .filter(|(_, e)| purge_set.contains(&e.track_id))
            .map(|(idx, _)| idx)
            .collect();

        if entries_to_purge.is_empty() {
            return Ok(RekordboxCleanupResult::default());
        }

        let backup = self.create_backup()?;
        let mut raw_bytes = std::fs::read(&self.pdb_path)?;
        let page_size = db.page_size as usize;
        let playlist_locations = db.row_locations(TableType::PlaylistEntries);

        let mut purged_count = 0;
        let mut touched_pages: HashSet<usize> = HashSet::new();

        for &entry_idx in &entries_to_purge {
            if entry_idx >= playlist_locations.len() {
                continue;
            }
            let row_loc = playlist_locations[entry_idx];
            let page_idx = row_loc / page_size;
            let page_off = page_idx * page_size;

            // Determinar slot_index a partir de los offsets del directorio de la página
            let num_rows = raw_bytes[page_off + 0x18] as usize
                + 0x100 * (raw_bytes[page_off + 0x19] & 1) as usize;

            let num_groups = (num_rows.saturating_sub(1)) / 16 + 1;
            let mut found_slot = None;

            for group in 0..num_groups {
                let base = page_off + page_size - group * 0x24;
                let in_group = if group < num_groups - 1 {
                    16
                } else {
                    (num_rows - 1) % 16 + 1
                };

                for bit in 0..in_group {
                    let off_val = u16::from_le_bytes([
                        raw_bytes[base - 6 - 2 * bit],
                        raw_bytes[base - 5 - 2 * bit],
                    ]) as usize;

                    let abs_loc = page_off + 0x28 + off_val;
                    if abs_loc == row_loc {
                        found_slot = Some((base, bit));
                        break;
                    }
                }
                if found_slot.is_some() {
                    break;
                }
            }

            if let Some((base, bit)) = found_slot {
                // Borrar presencia de la fila en el directorio de la página
                let mut present = u16::from_le_bytes([
                    raw_bytes[base - 4],
                    raw_bytes[base - 3],
                ]);
                present &= !(1 << bit);
                raw_bytes[base - 4..base - 2].copy_from_slice(&present.to_le_bytes());

                touched_pages.insert(page_idx);
                purged_count += 1;
            }
        }

        // Actualizar contadores de presencia en la cabecera de cada página modificada
        for &page_idx in &touched_pages {
            let page_off = page_idx * page_size;
            let num_rows = raw_bytes[page_off + 0x18] as usize
                + 0x100 * (raw_bytes[page_off + 0x19] & 1) as usize;
            let num_groups = (num_rows.saturating_sub(1)) / 16 + 1;
            let mut total_present = 0u16;

            for group in 0..num_groups {
                let base = page_off + page_size - group * 0x24;
                let in_group = if group < num_groups - 1 {
                    16
                } else {
                    (num_rows - 1) % 16 + 1
                };
                let mask = if in_group >= 16 {
                    u16::MAX
                } else {
                    (1u16 << in_group) - 1
                };
                let flags = u16::from_le_bytes([raw_bytes[base - 4], raw_bytes[base - 3]]) & mask;
                total_present += flags.count_ones() as u16;
            }

            let overflow = if num_rows > 255 { 1u16 } else { 0u16 };
            let val = (0x20 * total_present) | overflow;
            raw_bytes[page_off + 0x19..page_off + 0x1b].copy_from_slice(&val.to_le_bytes());
        }

        std::fs::write(&self.pdb_path, raw_bytes)?;

        Ok(RekordboxCleanupResult {
            purged_count,
            relinked_playlists_count: 0,
            backup_path: Some(backup.display().to_string()),
        })
    }
}

pub struct RekordboxInspector {
    pub pioneer_dir: Option<PathBuf>,
    pub xml_path: Option<PathBuf>,
}

impl RekordboxInspector {
    pub fn new<P: AsRef<Path>>(pioneer_dir: Option<P>, xml_path: Option<P>) -> Self {
        Self {
            pioneer_dir: pioneer_dir.map(|p| p.as_ref().to_path_buf()),
            xml_path: xml_path.map(|p| p.as_ref().to_path_buf()),
        }
    }

    /// Comprueba si la unidad cuenta con la estructura estándar de exportación USB de Pioneer / AlphaTheta
    pub fn is_pioneer_export_device(&self) -> bool {
        if let Some(dir) = &self.pioneer_dir {
            dir.is_dir()
        } else {
            false
        }
    }

    /// Parsea un archivo rekordbox.xml para extraer tracks y puntos de Hot Cue / Memory Cue
    pub fn parse_xml(&self) -> Result<HashMap<String, RekordboxTrackInfo>, RekordboxError> {
        let mut results: HashMap<String, RekordboxTrackInfo> = HashMap::new();
        let Some(xml_file) = &self.xml_path else {
            return Ok(results);
        };

        if !xml_file.is_file() {
            return Ok(results);
        }

        let file = File::open(xml_file)?;
        let mut reader = Reader::from_reader(BufReader::new(file));
        reader.config_mut().trim_text(true);

        let mut buf = Vec::new();
        let mut current_track: Option<RekordboxTrackInfo> = None;

        loop {
            match reader.read_event_into(&mut buf) {
                Ok(Event::Start(ref e)) | Ok(Event::Empty(ref e)) => {
                    let name = e.name();
                    if name.as_ref() == b"TRACK" {
                        let mut location = String::new();
                        for attr in e.attributes().flatten() {
                            if attr.key.as_ref() == b"Location" {
                                if let Ok(val) = attr.decode_and_unescape_value(reader.decoder()) {
                                    // Limpiar prefijo file://localhost/
                                    let clean = val
                                        .replace("file://localhost/", "/")
                                        .replace("file://localhost", "")
                                        .replace("%20", " ");
                                    location = clean;
                                }
                            }
                        }
                        current_track = Some(RekordboxTrackInfo {
                            location,
                            cue_count: 0,
                            playlists: Vec::new(),
                        });
                    } else if name.as_ref() == b"POSITION_MARK" {
                        if let Some(track) = &mut current_track {
                            track.cue_count += 1;
                        }
                    }
                }
                Ok(Event::End(ref e)) => {
                    if e.name().as_ref() == b"TRACK" {
                        if let Some(track) = current_track.take() {
                            if !track.location.is_empty() {
                                let filename = Path::new(&track.location)
                                    .file_name()
                                    .map(|f| f.to_string_lossy().to_string())
                                    .unwrap_or_default();

                                results.insert(track.location.clone(), track.clone());
                                if !filename.is_empty() {
                                    results.insert(filename, track);
                                }
                            }
                        }
                    }
                }
                Ok(Event::Eof) => break,
                Err(e) => return Err(RekordboxError::Xml(e)),
                _ => (),
            }
            buf.clear();
        }

        Ok(results)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_inspect_real_usb_pdb() {
        let pdb_path = Path::new("/Volumes/DG_1/PIONEER/rekordbox/export.pdb");
        if !pdb_path.exists() {
            println!("No USB mounted at /Volumes/DG_1, skipping live test");
            return;
        }

        let db = rekordbox_pdb::Database::from_file(pdb_path).expect("Failed to read export.pdb");
        println!("Export.pdb read successfully!");
        println!("Total tracks in export.pdb: {}", db.tracks.len());
        println!("Total artists: {}", db.artists.len());
        println!("Total playlists nodes: {}", db.playlist_tree.len());
        println!("Total playlist entries: {}", db.playlist_entries.len());
    }

    #[test]
    fn test_relink_and_purge_pdb_fixture() {
        let fixture_path = concat!(
            env!("HOME"),
            "/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f/rekordbox-pdb-0.1.0/tests/data/bigger-export.pdb"
        );
        if !Path::new(fixture_path).exists() {
            println!("Fixture not found at {}, skipping", fixture_path);
            return;
        }

        // Crear copia temporal para la prueba
        let temp_dir = std::env::temp_dir().join("dedupp_pdb_test");
        let _ = std::fs::create_dir_all(&temp_dir);
        let test_pdb = temp_dir.join("export.pdb");
        std::fs::copy(fixture_path, &test_pdb).unwrap();

        let mut db_mgr = RekordboxPdbDatabase::new(&test_pdb, &temp_dir);

        // Probar que find_in_drive encuentra export.pdb desde una subcarpeta
        let pioneer_sub = temp_dir.join("PIONEER").join("rekordbox");
        let _ = std::fs::create_dir_all(&pioneer_sub);
        let _ = std::fs::copy(fixture_path, pioneer_sub.join("export.pdb"));
        let deep_folder = temp_dir.join("Music").join("Tech_House");
        let _ = std::fs::create_dir_all(&deep_folder);
        let found_from_sub = RekordboxPdbDatabase::find_in_drive(&deep_folder);
        assert!(found_from_sub.is_some(), "Debe encontrar Rekordbox desde subcarpeta");

        let db_raw = Database::from_file(&test_pdb).unwrap();
        println!("db_raw tracks: {}, playlists: {}, entries: {}", db_raw.tracks.len(), db_raw.playlist_tree.len(), db_raw.playlist_entries.len());
        for t in db_raw.tracks.iter().take(3) {
            println!("Track: id={}, title={}, path={}", t.id, t.title(), t.file_path());
        }

        let initial_missing = db_mgr.get_missing_tracks().unwrap();
        println!("Initial missing tracks in fixture: {}", initial_missing.len());
        assert!(!initial_missing.is_empty());

        // Verificar que las entradas tienen nombre de archivo y datos
        assert!(!initial_missing[0].filename.is_empty());

        // Probar purgar el primer track desaparecido
        let track_to_purge = initial_missing[0].id;
        let res = db_mgr.purge_missing_tracks(&[track_to_purge]).unwrap();
        println!("Purged entries: {}, backup: {:?}", res.purged_count, res.backup_path);
        assert!(res.backup_path.is_some());

        // Leer de nuevo con Database y verificar que se redujeron las entradas
        let db_after = Database::from_file(&test_pdb).unwrap();
        let still_has_track = db_after.playlist_entries.iter().any(|e| e.track_id == track_to_purge);
        assert!(!still_has_track, "Track purged should no longer exist in playlist entries!");

        // Probar relink: sustituir track 2 por track 3
        let t2_path = db_raw.tracks.iter().find(|t| t.id == 2).unwrap().file_path().to_string();
        let t3_path = db_raw.tracks.iter().find(|t| t.id == 3).unwrap().file_path().to_string();

        let relink_res = db_mgr
            .relink_and_purge_duplicates(&[(PathBuf::from(t3_path), PathBuf::from(t2_path))])
            .unwrap();
        println!("Relinked entries: {}", relink_res.relinked_playlists_count);
        assert_eq!(relink_res.relinked_playlists_count, 1);

        let db_after_relink = Database::from_file(&test_pdb).unwrap();
        let has_track_2 = db_after_relink.playlist_entries.iter().any(|e| e.track_id == 2);
        assert!(!has_track_2, "Track 2 should have been relinked to Track 3!");
        let track_3_count = db_after_relink.playlist_entries.iter().filter(|e| e.track_id == 3).count();
        assert_eq!(track_3_count, 2, "Track 3 should appear twice (original + relinked)!");

        // Limpiar directorio temporal
        let _ = std::fs::remove_dir_all(&temp_dir);
    }
}
