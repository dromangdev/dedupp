use crate::audio::AudioMetadata;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs::File;
use std::io::{BufReader, Read};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DuplicateGroup {
    pub key: String,
    pub tracks: Vec<AudioMetadata>,
}

/// Normaliza texto de artista o título eliminando ruidos comunes y caracteres especiales
pub fn normalize_string(input: &str) -> String {
    let lower = input.to_lowercase();
    let mut result = String::with_capacity(lower.len());

    // Reemplazos de acentos comunes
    for c in lower.chars() {
        match c {
            'á' | 'à' | 'ä' | 'â' => result.push('a'),
            'é' | 'è' | 'ë' | 'ê' => result.push('e'),
            'í' | 'ì' | 'ï' | 'î' => result.push('i'),
            'ó' | 'ò' | 'ö' | 'ô' => result.push('o'),
            'ú' | 'ù' | 'ü' | 'û' => result.push('u'),
            'ñ' => result.push('n'),
            c if c.is_alphanumeric() || c == ' ' => result.push(c),
            _ => result.push(' '),
        }
    }

    // Limpiar espacios múltiples y palabras de relleno
    let words: Vec<&str> = result
        .split_whitespace()
        .filter(|w| !matches!(*w, "hq" | "hd" | "official" | "audio" | "video" | "mp3" | "free" | "download"))
        .collect();

    words.join(" ")
}

/// Calcula el hash SHA-256 de un archivo para detectar duplicados byte a byte
pub fn compute_file_sha256<P: AsRef<Path>>(path: P) -> Result<String, std::io::Error> {
    let file = File::open(path)?;
    let mut reader = BufReader::new(file);
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 65536];

    loop {
        let count = reader.read(&mut buffer)?;
        if count == 0 {
            break;
        }
        hasher.update(&buffer[..count]);
    }

    Ok(format!("{:x}", hasher.finalize()))
}

/// Agrupa canciones duplicadas considerando metadata y duración
pub fn group_duplicates(tracks: Vec<AudioMetadata>, duration_tolerance_secs: f64) -> Vec<DuplicateGroup> {
    // 1. Primer paso: agrupar por clave acústica (Artista + Título normalizados o nombre de archivo)
    let mut candidate_buckets: HashMap<String, Vec<AudioMetadata>> = HashMap::new();

    for track in tracks {
        let key = if let (Some(artist), Some(title)) = (&track.artist, &track.title) {
            let n_artist = normalize_string(artist);
            let n_title = normalize_string(title);
            if !n_artist.is_empty() && !n_title.is_empty() {
                format!("{} - {}", n_artist, n_title)
            } else {
                normalize_string(&track.filename)
            }
        } else {
            // Extraer del nombre de archivo (ej. "Artista - Titulo.mp3")
            let stem = Path::new(&track.filename)
                .file_stem()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or_else(|| track.filename.clone());
            normalize_string(&stem)
        };

        if !key.is_empty() {
            candidate_buckets.entry(key).or_default().push(track);
        }
    }

    // 2. Segundo paso: refinar subgrupos por duración similar (para no juntar un Radio Edit y un Extended Mix)
    let mut finalized_groups: Vec<DuplicateGroup> = Vec::new();

    for (key, items) in candidate_buckets {
        if items.len() < 2 {
            continue;
        }

        // Sub-agrupamos por ventanas de duración
        let mut sub_clusters: Vec<Vec<AudioMetadata>> = Vec::new();

        for track in items {
            let mut added = false;
            for cluster in &mut sub_clusters {
                // Si la duración está dentro de la tolerancia de la primera pista del cluster
                if (cluster[0].duration_seconds - track.duration_seconds).abs() <= duration_tolerance_secs {
                    cluster.push(track.clone());
                    added = true;
                    break;
                }
            }
            if !added {
                sub_clusters.push(vec![track]);
            }
        }

        for (idx, cluster) in sub_clusters.into_iter().enumerate() {
            if cluster.len() > 1 {
                let group_key = if idx == 0 {
                    key.clone()
                } else {
                    format!("{}_v{}", key, idx + 1)
                };
                finalized_groups.push(DuplicateGroup {
                    key: group_key,
                    tracks: cluster,
                });
            }
        }
    }

    finalized_groups
}
