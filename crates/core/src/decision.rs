use crate::audio::AudioMetadata;
use crate::matching::DuplicateGroup;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum DedupeCriterion {
    /// Prioriza la mayor calidad técnica (Lossless > MP3 320k > Bitrate > Sample Rate)
    HighestQuality,
    /// Prioriza la fecha de modificación más reciente del archivo
    LatestVersion,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscardItem {
    pub track: AudioMetadata,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DedupeDecision {
    pub group_key: String,
    pub keep: AudioMetadata,
    pub discard: Vec<DiscardItem>,
    pub summary_reason: String,
}

pub struct DecisionEngine {
    pub criterion: DedupeCriterion,
    pub protect_dj_cues: bool,
}

impl DecisionEngine {
    pub fn new(criterion: DedupeCriterion, protect_dj_cues: bool) -> Self {
        Self {
            criterion,
            protect_dj_cues,
        }
    }

    /// Evalúa un grupo de duplicados y selecciona al ganador según el criterio configurado
    pub fn decide(&self, group: &DuplicateGroup) -> Option<DedupeDecision> {
        if group.tracks.len() < 2 {
            return None;
        }

        let mut sorted = group.tracks.clone();

        match self.criterion {
            DedupeCriterion::HighestQuality => {
                sorted.sort_by(|a, b| {
                    // 1. Calidad técnica
                    let q_cmp = b.quality_score().cmp(&a.quality_score());
                    if q_cmp != std::cmp::Ordering::Equal {
                        return q_cmp;
                    }

                    // 2. Si se activa protección de datos DJ, priorizar temas con Cues/Playlists
                    if self.protect_dj_cues {
                        let dj_cmp = b.dj_info.dj_importance_score().cmp(&a.dj_info.dj_importance_score());
                        if dj_cmp != std::cmp::Ordering::Equal {
                            return dj_cmp;
                        }
                    }

                    // 3. Desempate: fecha más reciente
                    b.modified_time.cmp(&a.modified_time)
                });
            }
            DedupeCriterion::LatestVersion => {
                sorted.sort_by(|a, b| {
                    // 1. Fecha de modificación más reciente
                    let date_cmp = b.modified_time.cmp(&a.modified_time);
                    if date_cmp != std::cmp::Ordering::Equal {
                        return date_cmp;
                    }

                    // 2. Calidad técnica
                    let q_cmp = b.quality_score().cmp(&a.quality_score());
                    if q_cmp != std::cmp::Ordering::Equal {
                        return q_cmp;
                    }

                    // 3. Score DJ
                    b.dj_info.dj_importance_score().cmp(&a.dj_info.dj_importance_score())
                });
            }
        }

        let winner = sorted.remove(0);
        let mut discard_items = Vec::new();

        for discarded in sorted {
            let reason = self.explain_discard(&winner, &discarded);
            discard_items.push(DiscardItem {
                track: discarded,
                reason,
            });
        }

        let summary_reason = if let Some(first) = discard_items.first() {
            first.reason.clone()
        } else {
            "Duplicado identificado".to_string()
        };

        Some(DedupeDecision {
            group_key: group.key.clone(),
            keep: winner,
            discard: discard_items,
            summary_reason,
        })
    }

    fn explain_discard(&self, winner: &AudioMetadata, discarded: &AudioMetadata) -> String {
        match self.criterion {
            DedupeCriterion::HighestQuality => {
                if winner.is_lossless && !discarded.is_lossless {
                    format!("Conservado Lossless ({}) vs Descartado con pérdida ({})", winner.extension, discarded.extension)
                } else if winner.bitrate_kbps > discarded.bitrate_kbps {
                    format!("Mayor bitrate: {} kbps vs {} kbps", winner.bitrate_kbps, discarded.bitrate_kbps)
                } else if winner.sample_rate_hz > discarded.sample_rate_hz {
                    format!("Mayor frecuencia de muestreo: {} Hz vs {} Hz", winner.sample_rate_hz, discarded.sample_rate_hz)
                } else if winner.dj_info.dj_importance_score() > discarded.dj_info.dj_importance_score() {
                    format!("Mayor integración DJ (Cues/Playlists): {} vs {}", winner.dj_info.dj_importance_score(), discarded.dj_info.dj_importance_score())
                } else if winner.modified_time > discarded.modified_time {
                    format!("Misma calidad, versión más reciente: {}", winner.modified_time.format("%Y-%m-%d"))
                } else {
                    "Calidad técnica superior o idéntica".to_string()
                }
            }
            DedupeCriterion::LatestVersion => {
                if winner.modified_time > discarded.modified_time {
                    format!("Fecha más reciente: {} vs {}", winner.modified_time.format("%Y-%m-%d"), discarded.modified_time.format("%Y-%m-%d"))
                } else if winner.quality_score() > discarded.quality_score() {
                    format!("Misma fecha, mayor calidad: {} kbps ({})", winner.bitrate_kbps, winner.extension)
                } else {
                    "Versión más reciente seleccionada".to_string()
                }
            }
        }
    }
}
