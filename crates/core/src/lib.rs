pub mod audio;
pub mod decision;
pub mod matching;
pub mod safe_actions;
pub mod scanner;

pub use audio::{AudioFormatTier, AudioMetadata};
pub use decision::{DecisionEngine, DedupeCriterion, DedupeDecision, DiscardItem};
pub use matching::{group_duplicates, DuplicateGroup};
pub use safe_actions::{
    format_bytes, get_disk_space, ActionProgress, DiskSpaceInfo, EliminationMode, ExecutionResult,
    QuarantineManifest, SafeActionExecutor,
};
pub use scanner::{ScanProgress, Scanner};

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use dj_libraries::TrackDjInfo;
    use std::path::PathBuf;

    fn mock_track(
        name: &str,
        ext: &str,
        artist: &str,
        title: &str,
        duration: f64,
        bitrate: u32,
        is_lossless: bool,
        days_ago: i64,
        dj_info: TrackDjInfo,
    ) -> AudioMetadata {
        AudioMetadata {
            path: PathBuf::from(format!("/mock/music/{}", name)),
            filename: name.to_string(),
            file_size_bytes: 10_000_000,
            modified_time: Utc::now() - chrono::Duration::days(days_ago),
            extension: ext.to_string(),
            is_lossless,
            bitrate_kbps: bitrate,
            sample_rate_hz: 44100,
            bit_depth: if is_lossless { Some(16) } else { None },
            duration_seconds: duration,
            title: Some(title.to_string()),
            artist: Some(artist.to_string()),
            album: Some("Mock Album".to_string()),
            quality_tier: if is_lossless {
                AudioFormatTier::Lossless
            } else if bitrate >= 320 {
                AudioFormatTier::LossyHigh
            } else {
                AudioFormatTier::LossyLow
            },
            dj_info,
        }
    }

    #[test]
    fn test_quality_criterion_prefers_lossless_over_lossy() {
        let t1 = mock_track("track1.mp3", "mp3", "Fisher", "Losing It", 248.0, 128, false, 1, TrackDjInfo::default());
        let t2 = mock_track("track2.flac", "flac", "Fisher", "Losing It", 248.0, 1411, true, 10, TrackDjInfo::default());

        let groups = group_duplicates(vec![t1, t2], 3.5);
        assert_eq!(groups.len(), 1);

        let engine = DecisionEngine::new(DedupeCriterion::HighestQuality, true);
        let decision = engine.decide(&groups[0]).expect("Decision should exist");

        assert_eq!(decision.keep.filename, "track2.flac");
        assert_eq!(decision.discard.len(), 1);
        assert_eq!(decision.discard[0].track.filename, "track1.mp3");
    }

    #[test]
    fn test_duration_tolerance_separates_radio_and_extended() {
        let radio = mock_track("song_radio.mp3", "mp3", "Deadmau5", "Strobe", 195.0, 320, false, 1, TrackDjInfo::default());
        let extended = mock_track("song_ext.mp3", "mp3", "Deadmau5", "Strobe", 620.0, 320, false, 1, TrackDjInfo::default());

        let groups = group_duplicates(vec![radio, extended], 3.5);
        assert_eq!(groups.len(), 0);
    }

    #[test]
    fn test_latest_criterion_prefers_newer_file() {
        let old = mock_track("track_v1.mp3", "mp3", "Bicep", "Glue", 269.0, 320, false, 100, TrackDjInfo::default());
        let new = mock_track("track_v2.mp3", "mp3", "Bicep", "Glue", 269.0, 320, false, 2, TrackDjInfo::default());

        let groups = group_duplicates(vec![old, new], 3.5);
        assert_eq!(groups.len(), 1);

        let engine = DecisionEngine::new(DedupeCriterion::LatestVersion, true);
        let decision = engine.decide(&groups[0]).unwrap();

        assert_eq!(decision.keep.filename, "track_v2.mp3");
    }

    #[test]
    fn test_protect_dj_cues_prioritizes_track_with_cues() {
        let mut dj_with_cues = TrackDjInfo::default();
        dj_with_cues.in_engine_dj = true;
        dj_with_cues.engine_dj_cue_count = 8;
        dj_with_cues.engine_dj_playlists = vec!["Peak Time Techno".to_string()];

        let loose_track = mock_track("t_loose.mp3", "mp3", "Charlotte", "Age of Love", 380.0, 320, false, 1, TrackDjInfo::default());
        let dj_track = mock_track("t_dj.mp3", "mp3", "Charlotte", "Age of Love", 380.0, 320, false, 10, dj_with_cues);

        let groups = group_duplicates(vec![loose_track, dj_track], 3.5);
        let engine = DecisionEngine::new(DedupeCriterion::HighestQuality, true);
        let decision = engine.decide(&groups[0]).unwrap();

        assert_eq!(decision.keep.filename, "t_dj.mp3");
    }
}
