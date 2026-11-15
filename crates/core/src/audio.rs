use chrono::{DateTime, Utc};
use dj_libraries::TrackDjInfo;
use lofty::file::{AudioFile, TaggedFileExt};
use lofty::probe::Probe;
use lofty::tag::Accessor;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AudioReadError {
    #[error("Error de E/S: {0}")]
    Io(#[from] std::io::Error),
    #[error("Error parseando audio con lofty: {0}")]
    Lofty(#[from] lofty::error::LoftyError),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum AudioFormatTier {
    LossyLow = 1,       // MP3 < 192kbps
    LossyMedium = 2,    // MP3 192-256kbps, AAC < 256
    LossyHigh = 3,      // MP3 320kbps, AAC 256-320kbps, OGG Vorbis/Opus alta calidad
    Lossless = 4,       // FLAC, ALAC, WAV, AIFF
    LosslessHiRes = 5,  // 24-bit / 96kHz+
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioMetadata {
    pub path: PathBuf,
    pub filename: String,
    pub file_size_bytes: u64,
    pub modified_time: DateTime<Utc>,
    pub extension: String,
    pub is_lossless: bool,
    pub bitrate_kbps: u32,
    pub sample_rate_hz: u32,
    pub bit_depth: Option<u8>,
    pub duration_seconds: f64,
    pub title: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub quality_tier: AudioFormatTier,
    pub dj_info: TrackDjInfo,
}

impl AudioMetadata {
    /// Lee e inspecciona un archivo de audio con lofty de forma ultra-rápida
    pub fn read_from_path<P: AsRef<Path>>(path: P) -> Result<Self, AudioReadError> {
        let path = path.as_ref();
        let metadata = fs::metadata(path)?;
        let file_size_bytes = metadata.len();
        let modified_sys = metadata.modified().unwrap_or(std::time::SystemTime::UNIX_EPOCH);
        let modified_time: DateTime<Utc> = modified_sys.into();

        let filename = path
            .file_name()
            .map(|f| f.to_string_lossy().to_string())
            .unwrap_or_default();
        let extension = path
            .extension()
            .map(|e| e.to_string_lossy().to_lowercase())
            .unwrap_or_default();

        let tagged_file = Probe::open(path)?.read()?;
        let properties = tagged_file.properties();

        let duration_seconds = properties.duration().as_secs_f64();
        let bitrate_kbps = properties.audio_bitrate().unwrap_or(0);
        let sample_rate_hz = properties.sample_rate().unwrap_or(44100);
        let bit_depth = properties.bit_depth();

        // Extracción de etiquetas principales (ID3, Vorbis, MP4, etc.)
        let tag = tagged_file.primary_tag().or_else(|| tagged_file.first_tag());
        let title = tag.and_then(|t| t.title().map(|s| s.to_string()));
        let artist = tag.and_then(|t| t.artist().map(|s| s.to_string()));
        let album = tag.and_then(|t| t.album().map(|s| s.to_string()));

        let is_lossless = matches!(
            extension.as_str(),
            "flac" | "wav" | "aif" | "aiff" | "alac"
        );

        let quality_tier = calculate_tier(is_lossless, bitrate_kbps, sample_rate_hz, bit_depth);

        Ok(Self {
            path: path.to_path_buf(),
            filename,
            file_size_bytes,
            modified_time,
            extension,
            is_lossless,
            bitrate_kbps,
            sample_rate_hz,
            bit_depth,
            duration_seconds,
            title,
            artist,
            album,
            quality_tier,
            dj_info: TrackDjInfo::default(),
        })
    }

    /// Puntuación técnica de calidad de 0 a 10000 para ordenar con precisión
    pub fn quality_score(&self) -> u64 {
        let mut score: u64 = match self.quality_tier {
            AudioFormatTier::LosslessHiRes => 9000,
            AudioFormatTier::Lossless => 7000,
            AudioFormatTier::LossyHigh => 4000,
            AudioFormatTier::LossyMedium => 2000,
            AudioFormatTier::LossyLow => 1000,
        };

        // Añadir peso por bitrate (hasta 320+ kbps)
        score += (self.bitrate_kbps as u64).min(500);

        // Añadir peso por sample rate
        if self.sample_rate_hz >= 96000 {
            score += 400;
        } else if self.sample_rate_hz >= 48000 {
            score += 200;
        }

        // Añadir peso por bit depth
        if let Some(depth) = self.bit_depth {
            if depth >= 24 {
                score += 300;
            }
        }

        score
    }
}

fn calculate_tier(
    is_lossless: bool,
    bitrate_kbps: u32,
    sample_rate_hz: u32,
    bit_depth: Option<u8>,
) -> AudioFormatTier {
    if is_lossless {
        if sample_rate_hz >= 96000 || bit_depth.unwrap_or(16) > 16 {
            AudioFormatTier::LosslessHiRes
        } else {
            AudioFormatTier::Lossless
        }
    } else if bitrate_kbps >= 300 {
        AudioFormatTier::LossyHigh
    } else if bitrate_kbps >= 192 {
        AudioFormatTier::LossyMedium
    } else {
        AudioFormatTier::LossyLow
    }
}
