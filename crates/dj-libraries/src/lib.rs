pub mod engine_dj;
pub mod rekordbox;
pub mod serato;

pub use rekordbox::{
    is_rekordbox_running, RekordboxCleanupResult, RekordboxInspector, RekordboxMissingTrack,
    RekordboxPdbDatabase, RekordboxStatusInfo, RekordboxTrackInfo,
};

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

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
    /// Detecta qué software de DJ tiene presencia en la ruta especificada (disco o USB).
    pub fn detect_in_root<P: AsRef<Path>>(root: P) -> Self {
        let root = root.as_ref();
        let mut detected = Self::default();

        // 1. Engine DJ: Busca "Engine Library/Database2/m.db" o "Database2/m.db"
        let engine_db1 = root.join("Engine Library").join("Database2").join("m.db");
        let engine_db2 = root.join("Database2").join("m.db");
        if engine_db1.is_file() {
            detected.has_engine_dj = true;
            detected.engine_dj_db_path = Some(engine_db1);
        } else if engine_db2.is_file() {
            detected.has_engine_dj = true;
            detected.engine_dj_db_path = Some(engine_db2);
        }

        // 2. Serato: Busca "_Serato_" o "_Serato_Backup"
        let serato_dir = root.join("_Serato_");
        if serato_dir.is_dir() {
            detected.has_serato = true;
            detected.serato_dir = Some(serato_dir);
        }

        // 3. Rekordbox: Busca carpeta "PIONEER/rekordbox" o archivos xml
        let pioneer_dir = root.join("PIONEER").join("rekordbox");
        let rekordbox_xml = root.join("rekordbox.xml");
        if pioneer_dir.is_dir() {
            detected.has_rekordbox = true;
            detected.rekordbox_dir = Some(pioneer_dir);
        }
        if rekordbox_xml.is_file() {
            detected.has_rekordbox = true;
            detected.rekordbox_xml = Some(rekordbox_xml);
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
