use std::collections::HashMap;
use std::fs::File;
use std::io::Read;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

#[derive(Debug, Clone, Default)]
pub struct SeratoTrackInfo {
    pub crates: Vec<String>,
    pub has_serato_geob_cues: bool,
}

pub struct SeratoInspector {
    pub serato_dir: Option<PathBuf>,
}

impl SeratoInspector {
    pub fn new<P: AsRef<Path>>(serato_dir: Option<P>) -> Self {
        Self {
            serato_dir: serato_dir.map(|p| p.as_ref().to_path_buf()),
        }
    }

    /// Lee todos los archivos .crate de la carpeta _Serato_/Subcrates
    pub fn scan_crates(&self) -> HashMap<String, Vec<String>> {
        let mut track_crates: HashMap<String, Vec<String>> = HashMap::new();
        let Some(serato_path) = &self.serato_dir else {
            return track_crates;
        };

        let subcrates_path = serato_path.join("Subcrates");
        if !subcrates_path.is_dir() {
            return track_crates;
        }

        for entry in WalkDir::new(subcrates_path).into_iter().flatten() {
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("crate") {
                let crate_name = path
                    .file_stem()
                    .map(|s| s.to_string_lossy().to_string())
                    .unwrap_or_else(|| "Unknown".to_string());

                if let Ok(tracks) = parse_serato_crate(path) {
                    for track_path in tracks {
                        let filename = Path::new(&track_path)
                            .file_name()
                            .map(|f| f.to_string_lossy().to_string())
                            .unwrap_or_default();

                        track_crates
                            .entry(track_path.clone())
                            .or_default()
                            .push(crate_name.clone());

                        if !filename.is_empty() {
                            track_crates
                                .entry(filename)
                                .or_default()
                                .push(crate_name.clone());
                        }
                    }
                }
            }
        }

        track_crates
    }
}

/// Parsea un archivo binario `.crate` de Serato para extraer las rutas de pistas
fn parse_serato_crate(crate_path: &Path) -> Result<Vec<String>, std::io::Error> {
    let mut file = File::open(crate_path)?;
    let mut tracks = Vec::new();
    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer)?;

    let mut cursor = 0;
    while cursor + 8 <= buffer.len() {
        let tag = &buffer[cursor..cursor + 4];
        let len = u32::from_be_bytes([
            buffer[cursor + 4],
            buffer[cursor + 5],
            buffer[cursor + 6],
            buffer[cursor + 7],
        ]) as usize;
        cursor += 8;

        if tag == b"otrk" {
            // Un bloque otrk contiene un bloque interno ptrk
            let end = (cursor + len).min(buffer.len());
            let inner_bytes = &buffer[cursor..end];
            if let Some(track_path) = extract_ptrk(inner_bytes) {
                tracks.push(track_path);
            }
            cursor = end;
        } else {
            cursor = (cursor + len).min(buffer.len());
        }
    }

    Ok(tracks)
}

/// Extrae la cadena UTF-16 BE del sub-bloque ptrk
fn extract_ptrk(bytes: &[u8]) -> Option<String> {
    let mut i = 0;
    while i + 8 <= bytes.len() {
        let sub_tag = &bytes[i..i + 4];
        let sub_len = u32::from_be_bytes([bytes[i + 4], bytes[i + 5], bytes[i + 6], bytes[i + 7]]) as usize;
        i += 8;

        if sub_tag == b"ptrk" {
            let end = (i + sub_len).min(bytes.len());
            let str_bytes = &bytes[i..end];
            // Serato escribe la ruta en UTF-16 Big Endian
            let u16_chars: Vec<u16> = str_bytes
                .chunks_exact(2)
                .map(|c| u16::from_be_bytes([c[0], c[1]]))
                .filter(|&c| c != 0) // quitar null terminator
                .collect();

            if let Ok(decoded) = String::from_utf16(&u16_chars) {
                return Some(decoded.replace('\\', "/"));
            }
        }
        i = (i + sub_len).min(bytes.len());
    }
    None
}
