use quick_xml::events::Event;
use quick_xml::reader::Reader;
use std::collections::HashMap;
use std::fs::File;
use std::io::BufReader;
use std::path::{Path, PathBuf};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum RekordboxError {
    #[error("Error de E/S leyendo Rekordbox XML: {0}")]
    Io(#[from] std::io::Error),
    #[error("Error parseando Rekordbox XML: {0}")]
    Xml(#[from] quick_xml::Error),
}

#[derive(Debug, Clone, Default)]
pub struct RekordboxTrackInfo {
    pub location: String,
    pub cue_count: usize,
    pub playlists: Vec<String>,
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
