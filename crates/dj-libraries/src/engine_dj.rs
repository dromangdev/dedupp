use chrono::Local;
use rusqlite::{Connection, OpenFlags};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::path::{Component, Path, PathBuf};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum EngineDjError {
    #[error("Error al abrir o modificar la base de datos SQLite de Engine DJ: {0}")]
    SqliteError(#[from] rusqlite::Error),
    #[error("Base de datos no encontrada: {0}")]
    NotFound(String),
    #[error("Error de entrada/salida al acceder a archivos: {0}")]
    IoError(#[from] std::io::Error),
    #[error("Engine DJ está abierto en este momento. Ciérralo para poder sincronizar la base de datos.")]
    AppRunning,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineTrackEntry {
    pub id: i64,
    pub path: String,
    pub cue_count: usize,
    pub playlists: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MissingEngineTrack {
    pub id: i64,
    pub title: String,
    pub artist: String,
    pub filename: String,
    pub db_path: String,
    pub last_resolved_path: String,
    pub in_playlists: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct EngineCleanupResult {
    pub purged_count: usize,
    pub relinked_playlists_count: usize,
    pub backup_path: Option<String>,
}

/// Comprueba si el proceso de Engine DJ está ejecutándose actualmente en el sistema
pub fn is_engine_dj_running() -> bool {
    #[cfg(target_os = "macos")]
    {
        if let Ok(output) = std::process::Command::new("pgrep")
            .args(["-f", "Engine DJ.app/Contents/MacOS/Engine DJ"])
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
            if out_str.contains("engine dj.exe") || out_str.contains("enginedj.exe") || out_str.contains("engine.exe") {
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

/// Lector y gestor de la base de datos Engine DJ (m.db)
pub struct EngineDjDatabase {
    pub db_path: PathBuf,
}

impl EngineDjDatabase {
    pub fn new<P: AsRef<Path>>(path: P) -> Self {
        Self {
            db_path: path.as_ref().to_path_buf(),
        }
    }

    /// Busca la base de datos de Engine DJ en una unidad USB o carpeta, ascendiendo por los directorios padres si se seleccionó una subcarpeta
    pub fn find_in_root<P: AsRef<Path>>(root: P) -> Option<Self> {
        let start = root.as_ref();
        let mut curr = Some(start);

        while let Some(dir) = curr {
            let db1 = dir.join("Engine Library").join("Database2").join("m.db");
            if db1.is_file() {
                return Some(Self::new(db1));
            }
            let db2 = dir.join("Database2").join("m.db");
            if db2.is_file() {
                return Some(Self::new(db2));
            }
            let db3 = dir.join("Engine Library").join("m.db");
            if db3.is_file() {
                return Some(Self::new(db3));
            }

            // Búsqueda case-insensitive para compatibilidad con distintos formatos de disco
            if let Ok(entries) = std::fs::read_dir(dir) {
                for entry in entries.flatten() {
                    let name = entry.file_name().to_string_lossy().to_lowercase();
                    if name == "engine library" && entry.path().is_dir() {
                        let c1 = entry.path().join("Database2").join("m.db");
                        if c1.is_file() {
                            return Some(Self::new(c1));
                        }
                        let c2 = entry.path().join("m.db");
                        if c2.is_file() {
                            return Some(Self::new(c2));
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

    /// Genera una copia de seguridad automática de m.db antes de cualquier modificación
    pub fn create_backup(&self) -> Result<PathBuf, EngineDjError> {
        if !self.db_path.exists() {
            return Err(EngineDjError::NotFound(self.db_path.display().to_string()));
        }
        let now = Local::now();
        let backup_filename = format!("m.db.backup_{}", now.format("%Y-%m-%d_%H%M%S"));
        let backup_path = self.db_path.with_file_name(backup_filename);
        std::fs::copy(&self.db_path, &backup_path)?;
        Ok(backup_path)
    }

    /// Directorio base a partir del cual Engine DJ resuelve las rutas relativas
    fn base_dir(&self) -> PathBuf {
        let db_str = self.db_path.to_string_lossy();
        if db_str.contains("Database2") {
            // "Engine Library/Database2/m.db" -> base es "Engine Library" (abuelo de m.db)
            self.db_path
                .parent()
                .and_then(|p| p.parent())
                .unwrap_or_else(|| self.db_path.parent().unwrap())
                .to_path_buf()
        } else {
            self.db_path
                .parent()
                .unwrap_or_else(|| Path::new("."))
                .to_path_buf()
        }
    }

    /// Resuelve la ruta física absoluta de un archivo registrado en m.db
    pub fn resolve_disk_path(&self, db_track_path: &str) -> Option<PathBuf> {
        let path_obj = Path::new(db_track_path);
        if path_obj.is_absolute() && path_obj.exists() {
            return Some(path_obj.to_path_buf());
        }

        let base = self.base_dir();

        // 1. Probar ruta normalizada directa
        let direct = normalize_path(base.join(db_track_path));
        if direct.exists() {
            return Some(direct);
        }

        // 2. Probar reemplazando U+F022 (carácter privado que exFAT/Windows usa para sustituir dos puntos o comillas)
        if db_track_path.contains('\u{f022}') {
            let colon_str = db_track_path.replace('\u{f022}', ":");
            let colon_resolved = normalize_path(base.join(colon_str));
            if colon_resolved.exists() {
                return Some(colon_resolved);
            }
        }

        None
    }

    /// Lee la base de datos y mapea cada pista por su ruta o nombre de archivo
    pub fn scan_tracks(&self) -> Result<HashMap<String, EngineTrackEntry>, EngineDjError> {
        if !self.db_path.exists() {
            return Err(EngineDjError::NotFound(self.db_path.display().to_string()));
        }

        // Abrimos en solo lectura para máxima seguridad durante escaneos
        let conn = Connection::open_with_flags(&self.db_path, OpenFlags::SQLITE_OPEN_READ_ONLY)?;

        let mut track_map: HashMap<String, EngineTrackEntry> = HashMap::new();

        let mut stmt = conn.prepare("SELECT id, path FROM Track")?;
        let rows = stmt.query_map([], |row| {
            let id: i64 = row.get(0)?;
            let path: String = row.get(1)?;
            Ok((id, path))
        })?;

        for r in rows.flatten() {
            let (id, path) = r;
            let norm_path = path.replace('\\', "/");
            let filename = Path::new(&norm_path)
                .file_name()
                .map(|f| f.to_string_lossy().to_string())
                .unwrap_or_default();

            let entry = EngineTrackEntry {
                id,
                path: norm_path.clone(),
                cue_count: 0,
                playlists: Vec::new(),
            };

            track_map.insert(norm_path, entry.clone());
            if !filename.is_empty() {
                track_map.insert(filename, entry);
            }
        }

        // Intentar contar cues desde PerformanceData si la tabla existe
        if let Ok(mut perf_stmt) = conn.prepare("SELECT trackId, count(*) FROM PerformanceData GROUP BY trackId") {
            if let Ok(rows) = perf_stmt.query_map([], |row| {
                let track_id: i64 = row.get(0)?;
                let count: i64 = row.get(1)?;
                Ok((track_id, count as usize))
            }) {
                for r in rows.flatten() {
                    let (track_id, count) = r;
                    for entry in track_map.values_mut() {
                        if entry.id == track_id {
                            entry.cue_count = count;
                        }
                    }
                }
            }
        }

        // Obtener nombres de playlists asociadas si existen las tablas Playlist y PlaylistEntity
        let pl_query = "
            SELECT pe.trackId, p.title
            FROM PlaylistEntity pe
            JOIN Playlist p ON pe.listId = p.id
        ";
        if let Ok(mut pl_stmt) = conn.prepare(pl_query) {
            if let Ok(rows) = pl_stmt.query_map([], |row| {
                let track_id: i64 = row.get(0)?;
                let pl_title: String = row.get(1)?;
                Ok((track_id, pl_title))
            }) {
                for r in rows.flatten() {
                    let (track_id, pl_title) = r;
                    for entry in track_map.values_mut() {
                        if entry.id == track_id && !entry.playlists.contains(&pl_title) {
                            entry.playlists.push(pl_title.clone());
                        }
                    }
                }
            }
        }

        Ok(track_map)
    }

    /// Identifica todas las pistas registradas en m.db cuyo archivo físico no existe en disco (pistas rojas)
    pub fn scan_missing_tracks(&self) -> Result<Vec<MissingEngineTrack>, EngineDjError> {
        if !self.db_path.exists() {
            return Err(EngineDjError::NotFound(self.db_path.display().to_string()));
        }

        let conn = Connection::open_with_flags(&self.db_path, OpenFlags::SQLITE_OPEN_READ_ONLY)?;
        let mut missing = Vec::new();

        // Mapa de playlists por trackId
        let mut track_playlists: HashMap<i64, Vec<String>> = HashMap::new();
        if let Ok(mut pl_stmt) = conn.prepare("SELECT pe.trackId, p.title FROM PlaylistEntity pe JOIN Playlist p ON pe.listId = p.id") {
            if let Ok(rows) = pl_stmt.query_map([], |row| {
                let tid: i64 = row.get(0)?;
                let title: String = row.get(1)?;
                Ok((tid, title))
            }) {
                for (tid, title) in rows.flatten() {
                    track_playlists.entry(tid).or_default().push(title);
                }
            }
        }

        let base = self.base_dir();
        let mut stmt = conn.prepare("SELECT id, path, filename, title, artist FROM Track")?;
        let rows = stmt.query_map([], |row| {
            let id: i64 = row.get(0)?;
            let path: String = row.get(1)?;
            let filename: String = row.get(2).unwrap_or_default();
            let title: String = row.get(3).unwrap_or_default();
            let artist: String = row.get(4).unwrap_or_default();
            Ok((id, path, filename, title, artist))
        })?;

        for r in rows.flatten() {
            let (id, path, filename, title, artist) = r;
            if self.resolve_disk_path(&path).is_none() {
                let expected = normalize_path(base.join(&path)).to_string_lossy().to_string();
                let playlists = track_playlists.get(&id).cloned().unwrap_or_default();

                missing.push(MissingEngineTrack {
                    id,
                    title,
                    artist,
                    filename,
                    db_path: path,
                    last_resolved_path: expected,
                    in_playlists: playlists,
                });
            }
        }

        Ok(missing)
    }

    /// Elimina de forma atómica y segura las pistas huérfanas/rojas especificadas por ID
    pub fn purge_missing_tracks(&self, track_ids: &[i64]) -> Result<EngineCleanupResult, EngineDjError> {
        if track_ids.is_empty() {
            return Ok(EngineCleanupResult::default());
        }

        if is_engine_dj_running() {
            return Err(EngineDjError::AppRunning);
        }

        let backup = self.create_backup()?;
        let mut conn = Connection::open(&self.db_path)?;
        conn.execute("PRAGMA foreign_keys = ON;", [])?;
        let tx = conn.transaction()?;

        for &id in track_ids {
            // En Engine DJ, eliminar de PlaylistEntity dispara trigger_before_delete_PlaylistEntity
            // que actualiza nextEntityId para no dejar huecos rotos en la lista enlazada
            tx.execute("DELETE FROM PlaylistEntity WHERE trackId = ?1", [id])?;
            let _ = tx.execute("DELETE FROM PreparelistEntity WHERE trackId = ?1", [id]);
            let _ = tx.execute("DELETE FROM PerformanceData WHERE trackId = ?1", [id]);
            tx.execute("DELETE FROM Track WHERE id = ?1", [id])?;
        }

        tx.commit()?;
        Ok(EngineCleanupResult {
            purged_count: track_ids.len(),
            relinked_playlists_count: 0,
            backup_path: Some(backup.display().to_string()),
        })
    }

    /// Re-vincula playlists de Engine DJ reemplazando duplicados descartados por los ganadores,
    /// y purga los descartados de la base de datos m.db
    pub fn relink_and_purge_duplicates(
        &self,
        pairs: &[(PathBuf, PathBuf)], // (winner_path, discarded_path)
    ) -> Result<EngineCleanupResult, EngineDjError> {
        if pairs.is_empty() {
            return Ok(EngineCleanupResult::default());
        }

        if is_engine_dj_running() {
            return Err(EngineDjError::AppRunning);
        }

        let backup = self.create_backup()?;
        let mut conn = Connection::open(&self.db_path)?;
        conn.execute("PRAGMA foreign_keys = ON;", [])?;

        // 1. Mapear todas las pistas de m.db por nombre de archivo y por path
        let mut path_to_id: HashMap<String, i64> = HashMap::new();
        let mut fname_to_id: HashMap<String, i64> = HashMap::new();

        {
            let mut stmt = conn.prepare("SELECT id, path, filename FROM Track")?;
            let rows = stmt.query_map([], |row| {
                let id: i64 = row.get(0)?;
                let path: String = row.get(1)?;
                let filename: String = row.get(2).unwrap_or_default();
                Ok((id, path, filename))
            })?;

            for (id, path, filename) in rows.flatten() {
                path_to_id.insert(path.replace('\\', "/"), id);
                if !filename.is_empty() {
                    fname_to_id.insert(filename, id);
                }
            }
        }

        let mut relinked_playlists = 0;
        let mut purged_tracks = HashSet::new();

        let tx = conn.transaction()?;

        for (winner_path, discarded_path) in pairs {
            let win_fname = winner_path.file_name().map(|f| f.to_string_lossy().to_string()).unwrap_or_default();
            let disc_fname = discarded_path.file_name().map(|f| f.to_string_lossy().to_string()).unwrap_or_default();

            // Buscar IDs en la base de datos
            let winner_id = fname_to_id.get(&win_fname).copied();
            let discarded_id = fname_to_id.get(&disc_fname).copied();

            if let (Some(win_id), Some(disc_id)) = (winner_id, discarded_id) {
                if win_id == disc_id {
                    continue;
                }

                // Buscar playlists donde estaba la pista descartada
                let mut pl_stmt = tx.prepare("SELECT id, listId FROM PlaylistEntity WHERE trackId = ?1")?;
                let pl_rows: Vec<(i64, i64)> = pl_stmt
                    .query_map([disc_id], |row| Ok((row.get(0)?, row.get(1)?)))?
                    .flatten()
                    .collect();

                for (_entity_id, list_id) in pl_rows {
                    // Comprobar si la pista ganadora ya está en esa misma playlist
                    let already_in_pl: bool = tx
                        .query_row(
                            "SELECT EXISTS(SELECT 1 FROM PlaylistEntity WHERE listId = ?1 AND trackId = ?2)",
                            [list_id, win_id],
                            |row| row.get(0),
                        )
                        .unwrap_or(false);

                    if already_in_pl {
                        // Si ya está, eliminamos la descartada para que no aparezca repetida
                        tx.execute(
                            "DELETE FROM PlaylistEntity WHERE listId = ?1 AND trackId = ?2",
                            [list_id, disc_id],
                        )?;
                    } else {
                        // Si no estaba, re-vinculamos la posición al nuevo track ganador
                        tx.execute(
                            "UPDATE PlaylistEntity SET trackId = ?1 WHERE listId = ?2 AND trackId = ?3",
                            [win_id, list_id, disc_id],
                        )?;
                        relinked_playlists += 1;
                    }
                }

                // Purgar de Track, PerformanceData, PreparelistEntity
                let _ = tx.execute("DELETE FROM PreparelistEntity WHERE trackId = ?1", [disc_id]);
                let _ = tx.execute("DELETE FROM PerformanceData WHERE trackId = ?1", [disc_id]);
                let _ = tx.execute("DELETE FROM PlaylistEntity WHERE trackId = ?1", [disc_id]);
                let _ = tx.execute("DELETE FROM Track WHERE id = ?1", [disc_id]);

                purged_tracks.insert(disc_id);
            }
        }

        tx.commit()?;

        Ok(EngineCleanupResult {
            purged_count: purged_tracks.len(),
            relinked_playlists_count: relinked_playlists,
            backup_path: Some(backup.display().to_string()),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_engine_dj_flow() {
        let dir = std::env::temp_dir().join(format!("test_engine_flow_{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos()));
        let db_dir = dir.join("Engine Library").join("Database2");
        std::fs::create_dir_all(&db_dir).unwrap();
        let db_file = db_dir.join("m.db");

        // Crear archivos de audio falsos
        let music_dir = dir.join("Music");
        std::fs::create_dir_all(&music_dir).unwrap();
        let file_winner = music_dir.join("Song_Winner.flac");
        let file_discard = music_dir.join("Song_Discarded.mp3");
        std::fs::write(&file_winner, b"flac data").unwrap();
        // file_discard NO lo escribimos para simular que no existe en disco

        // Crear base de datos y esquema
        let conn = Connection::open(&db_file).unwrap();
        conn.execute_batch(
            "
            CREATE TABLE Track (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                path TEXT NOT NULL,
                filename TEXT,
                title TEXT,
                artist TEXT
            );
            CREATE TABLE Playlist (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL
            );
            CREATE TABLE PlaylistEntity (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                listId INTEGER NOT NULL,
                trackId INTEGER NOT NULL,
                databaseUuid TEXT,
                nextEntityId INTEGER,
                membershipReference INTEGER
            );
            CREATE TABLE PerformanceData (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                trackId INTEGER NOT NULL
            );
            CREATE TABLE PreparelistEntity (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                trackId INTEGER NOT NULL
            );
            ",
        )
        .unwrap();

        // Insertar Playlist
        conn.execute("INSERT INTO Playlist (id, title) VALUES (1, 'House')", []).unwrap();

        // Insertar Pista 1 (Ganadora, existe en disco)
        let rel_winner = format!("../Music/Song_Winner.flac");
        conn.execute(
            "INSERT INTO Track (id, path, filename, title, artist) VALUES (1, ?1, 'Song_Winner.flac', 'House Track', 'DJ Test')",
            [&rel_winner],
        ).unwrap();

        // Insertar Pista 2 (Descartada/huérfana, no existe en disco)
        let rel_discard = format!("../Music/Song_Discarded.mp3");
        conn.execute(
            "INSERT INTO Track (id, path, filename, title, artist) VALUES (2, ?1, 'Song_Discarded.mp3', 'House Track', 'DJ Test')",
            [&rel_discard],
        ).unwrap();

        // La pista 2 está en la playlist 'House'
        conn.execute(
            "INSERT INTO PlaylistEntity (id, listId, trackId, nextEntityId) VALUES (10, 1, 2, 0)",
            [],
        ).unwrap();

        // Insertar PerformanceData (Hot cues) para pista 2
        conn.execute("INSERT INTO PerformanceData (trackId) VALUES (2)", []).unwrap();

        let engine_db = EngineDjDatabase::find_in_root(&dir).expect("Debe encontrar la base de datos");

        // Comprobar que también la encuentra desde una subcarpeta
        let subfolder = dir.join("Music").join("Deep_House");
        std::fs::create_dir_all(&subfolder).unwrap();
        let engine_sub = EngineDjDatabase::find_in_root(&subfolder).expect("Debe encontrar la base de datos desde subcarpeta");
        assert_eq!(engine_sub.db_path, engine_db.db_path);

        // 1. Escanear pistas rojas/huérfanas
        let missing = engine_db.scan_missing_tracks().unwrap();
        assert_eq!(missing.len(), 1);
        assert_eq!(missing[0].id, 2);
        assert_eq!(missing[0].in_playlists, vec!["House"]);

        // 2. Re-vincular y purgar duplicados
        let pairs = vec![(file_winner.clone(), file_discard.clone())];
        let cleanup_res = engine_db.relink_and_purge_duplicates(&pairs).unwrap();
        assert_eq!(cleanup_res.purged_count, 1);
        assert_eq!(cleanup_res.relinked_playlists_count, 1);
        assert!(cleanup_res.backup_path.is_some());

        // Comprobar que en PlaylistEntity ahora el trackId es 1 (la ganadora)
        let new_track_id: i64 = conn
            .query_row("SELECT trackId FROM PlaylistEntity WHERE id = 10", [], |row| row.get(0))
            .unwrap();
        assert_eq!(new_track_id, 1);

        // Comprobar que la pista 2 fue eliminada de Track y PerformanceData
        let count_track2: i64 = conn
            .query_row("SELECT count(*) FROM Track WHERE id = 2", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count_track2, 0);

        let count_perf2: i64 = conn
            .query_row("SELECT count(*) FROM PerformanceData WHERE trackId = 2", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count_perf2, 0);

        let _ = std::fs::remove_dir_all(&dir);
    }
}
