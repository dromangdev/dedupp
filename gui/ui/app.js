// Interfaz cliente conectada a Tauri v2 IPC con detección resiliente
const invoke = async (cmd, args = {}) => {
  if (window.__TAURI__ && window.__TAURI__.core && typeof window.__TAURI__.core.invoke === "function") {
    return window.__TAURI__.core.invoke(cmd, args);
  }
  if (window.__TAURI__ && typeof window.__TAURI__.invoke === "function") {
    return window.__TAURI__.invoke(cmd, args);
  }
  if (window.__TAURI_INTERNALS__ && typeof window.__TAURI_INTERNALS__.invoke === "function") {
    return window.__TAURI_INTERNALS__.invoke(cmd, args);
  }
  console.error("Tauri IPC no disponible en este entorno", window);
  throw new Error("No se pudo conectar con el motor de Tauri.");
};

// Elementos del DOM
const driveSelect = document.getElementById("drive-select");
const btnRefreshDrives = document.getElementById("btn-refresh-drives");
const btnBrowseFolder = document.getElementById("btn-browse-folder");
const currentPathText = document.getElementById("current-path-text");

const criterionSelect = document.getElementById("criterion-select");
const toleranceInput = document.getElementById("tolerance-input");
const protectCuesCheckbox = document.getElementById("protect-cues");
const btnScan = document.getElementById("btn-scan");
const scanText = document.getElementById("scan-text");
const scanIcon = document.getElementById("scan-icon");
const macSpinner = document.getElementById("mac-spinner");

// Progreso y Logs de Escaneo
const progressPanel = document.getElementById("progress-panel");
const progressTitle = document.getElementById("progress-title");
const progressFilename = document.getElementById("progress-filename");
const progressPercent = document.getElementById("progress-percent");
const progressFill = document.getElementById("progress-fill");
const progressCount = document.getElementById("progress-count");
const btnToggleLog = document.getElementById("btn-toggle-log");

const logConsoleWrap = document.getElementById("log-console-wrap");
const logConsoleBody = document.getElementById("log-console-body");
const btnClearLog = document.getElementById("btn-clear-log");

const badgeEngine = document.getElementById("badge-engine");
const badgeSerato = document.getElementById("badge-serato");
const badgeRekordbox = document.getElementById("badge-rekordbox");

const statsRow = document.getElementById("stats-row");
const statTotal = document.getElementById("stat-total-scanned");
const statGroups = document.getElementById("stat-groups-found");
const statRedundant = document.getElementById("stat-redundant-files");
const statReclaimableSpace = document.getElementById("stat-reclaimable-space");

// Elementos de capacidad de disco
const storageCard = document.getElementById("storage-card");
const storageDriveName = document.getElementById("storage-drive-name");
const storageBadgeType = document.getElementById("storage-badge-type");
const storageFreeVal = document.getElementById("storage-free-val");
const storageTotalVal = document.getElementById("storage-total-val");
const storageUsedPct = document.getElementById("storage-used-pct");
const storageBarUsed = document.getElementById("storage-bar-used");
const storageBarReclaim = document.getElementById("storage-bar-reclaim");
const storageFreedPill = document.getElementById("storage-freed-pill");
const storageFreedText = document.getElementById("storage-freed-text");
const btnRefreshStorage = document.getElementById("btn-refresh-storage");

// Elementos del Modal de Configuración y Sonido
const settingsModal = document.getElementById("settings-modal");
const btnOpenSettings = document.getElementById("btn-open-settings");
const btnCloseSettings = document.getElementById("btn-close-settings");
const btnCancelSettings = document.getElementById("btn-cancel-settings");
const btnXSettings = document.getElementById("btn-x-settings");
const settingSoundEnabled = document.getElementById("setting-sound-enabled");
const settingSoundChoice = document.getElementById("setting-sound-choice");
const settingSoundVolume = document.getElementById("setting-sound-volume");
const volumeValText = document.getElementById("volume-val-text");
const btnTestSound = document.getElementById("btn-test-sound");
const settingProtectCuesDefault = document.getElementById("setting-protect-cues-default");
const settingLanguageChoice = document.getElementById("setting-language-choice");

// Elementos de Engine DJ
const btnEngineClean = document.getElementById("btn-engine-clean");
const engineToolbarCount = document.getElementById("engine-toolbar-count");
const engineModal = document.getElementById("engine-modal");
const btnXEngine = document.getElementById("btn-x-engine");
const btnCancelEngine = document.getElementById("btn-cancel-engine");
const btnConfirmPurgeEngine = document.getElementById("btn-confirm-purge-engine");
const btnConfirmPurgeText = document.getElementById("btn-confirm-purge-text");
const engineRunningAlert = document.getElementById("engine-running-alert");
const btnRecheckEngineRunning = document.getElementById("btn-recheck-engine-running");
const engineDbPathText = document.getElementById("engine-db-path-text");
const engineMissingCount = document.getElementById("engine-missing-count");
const engineTracksCountLabel = document.getElementById("engine-tracks-count-label");
const engineTracksTbody = document.getElementById("engine-tracks-tbody");
const enginePurgeProgress = document.getElementById("engine-purge-progress");
const enginePurgeFile = document.getElementById("engine-purge-file");
const enginePurgePct = document.getElementById("engine-purge-pct");
const enginePurgeBar = document.getElementById("engine-purge-bar");
const enginePurgeCount = document.getElementById("engine-purge-count");
const engineSyncCard = document.getElementById("engine-sync-card");
const checkSyncEngine = document.getElementById("check-sync-engine");

// Elementos de Rekordbox / Cabina Pioneer
const btnRekordboxClean = document.getElementById("btn-rekordbox-clean");
const rekordboxToolbarCount = document.getElementById("rekordbox-toolbar-count");
const rekordboxModal = document.getElementById("rekordbox-modal");
const btnXRekordbox = document.getElementById("btn-x-rekordbox");
const btnCancelRekordbox = document.getElementById("btn-cancel-rekordbox");
const btnConfirmPurgeRekordbox = document.getElementById("btn-confirm-purge-rekordbox");
const btnConfirmPurgeRekordboxText = document.getElementById("btn-confirm-purge-rekordbox-text");
const rekordboxRunningAlert = document.getElementById("rekordbox-running-alert");
const btnRecheckRekordboxRunning = document.getElementById("btn-recheck-rekordbox-running");
const rekordboxDbPathText = document.getElementById("rekordbox-db-path-text");
const rekordboxMissingCount = document.getElementById("rekordbox-missing-count");
const rekordboxTotalTracks = document.getElementById("rekordbox-total-tracks");
const rekordboxTracksCountLabel = document.getElementById("rekordbox-tracks-count-label");
const rekordboxTracksTbody = document.getElementById("rekordbox-tracks-tbody");
const rekordboxPurgeProgress = document.getElementById("rekordbox-purge-progress");
const rekordboxPurgeFile = document.getElementById("rekordbox-purge-file");
const rekordboxPurgePct = document.getElementById("rekordbox-purge-pct");
const rekordboxPurgeBar = document.getElementById("rekordbox-purge-bar");
const rekordboxPurgeCount = document.getElementById("rekordbox-purge-count");
const rekordboxSyncCard = document.getElementById("rekordbox-sync-card");
const checkSyncRekordbox = document.getElementById("check-sync-rekordbox");

let currentEngineStatus = { has_engine_dj: false, is_running: false, db_path: null };
let currentEngineMissingTracks = [];
let currentRekordboxStatus = { has_rekordbox: false, is_running: false, pdb_path: null, total_tracks: 0, missing_tracks_count: 0 };
let currentRekordboxMissingTracks = [];

let currentDiskTotalBytes = 0;
let savedSettingsSnapshot = null;

// ==========================================================================
// Sound Engine (Web Audio API + Sonido Nativo macOS)
// ==========================================================================
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

// ==========================================================================
// Sistema de Internacionalización (i18n: es, en, fr)
// ==========================================================================
let currentLanguage = "es";

const i18n = {
  es: {
    brand_title: "Dedupp",
    brand_subtitle: "Limpiador de Colecciones DJ",
    badge_engine_title: "Base de datos Engine OS / Denon (m.db)",
    badge_serato_title: "Metadatos Serato DJ (_Serato_ y Cues GEOB)",
    badge_rekordbox_title: "Colección Pioneer / Rekordbox (XML / PIONEER)",
    btn_engine_clean: "Limpiar Engine DJ",
    btn_rekordbox_clean: "Cabina Rekordbox",
    btn_settings: "Ajustes",
    source_label: "Unidad USB o Carpeta:",
    drives_searching: "Buscando unidades conectadas...",
    btn_refresh_drives_title: "Actualizar lista de unidades USB",
    btn_browse_folder: "Examinar...",
    path_label: "Ruta activa:",
    storage_free_of: "libres de",
    storage_reclaimable: "recuperables",
    storage_refresh: "Actualizar espacio",
    tolerance_label: "Tolerancia de Duración:",
    tolerance_hint: "Margen para temas idénticos",
    tolerance_sec: "seg",
    smart_policy_label: "Criterio Automático:",
    smart_policy_pill: "<span>💎 Calidad</span><span class=\"sep\">›</span><span>🛡️ Cues DJ</span><span class=\"sep\">›</span><span>⏱️ Reciente</span>",
    btn_scan: "Escanear y Previsualizar",
    btn_scanning: "Escaneando...",
    protect_cues_label: "Proteger pistas con <strong>Hot Cues, Loops o Playlists</strong> de DJ",
    versions_hint: "Diferentes versiones (Radio vs Extended) se conservan.",
    progress_analyzing: "Analizando archivos de audio...",
    progress_processed: "archivos procesados",
    progress_log_toggle: "Registro de actividad",
    log_title: "Actividad del Sistema",
    log_clear: "Limpiar",
    stat_scanned: "Pistas Analizadas",
    stat_groups: "Grupos Duplicados",
    stat_redundant: "Archivos a Limpiar",
    stat_reclaimable: "Espacio Recuperable",
    results_title: "Resultados del Análisis",
    btn_export_csv: "Exportar CSV",
    btn_move_duplicates: "Mover Duplicados...",
    empty_title: "Selecciona tu unidad USB o carpeta",
    empty_desc: "Elige tu memoria USB en el desplegable superior y pulsa <strong>Escanear</strong>.<br>Dedupp analizará códecs, bitrates y datos de librerías DJ sin modificar tus archivos.",
    empty_clean_title: "¡Colección impecable!",
    empty_clean_desc: "No se encontraron canciones duplicadas en la unidad seleccionada.",
    status_ready: "Listo",
    status_scanning: "Escaneando archivos...",
    status_cleaning: "Moviendo archivos...",
    status_completed: "Operación completada con éxito.",
    subfolder_selected: "Subcarpeta seleccionada",
    // Modal duplicados
    modal_dup_title: "Gestión de Archivos Duplicados",
    opt_trash_title: "🗑️ Papelera (Agrupados en una sola carpeta) — Recomendado",
    opt_trash_desc: "Reúne todas las canciones duplicadas dentro de una única carpeta fechada y la traslada a la Papelera. No ensucia la papelera con cientos de archivos sueltos y permite liberar espacio real al vaciarla.",
    opt_quarantine_title: "🛡️ Mover a Carpeta de Cuarentena en la unidad",
    opt_quarantine_desc: "Aísla los temas en .dedupp_quarantine/ con un registro manifest.json. (No libera espacio de disco hasta que borres esa carpeta).",
    sync_engine_title: "🔄 Sincronizar automáticamente con Engine DJ (Recomendado)",
    sync_engine_desc: "Re-vincula las playlists al tema conservado de mayor calidad y elimina los temas duplicados de m.db para que nunca aparezcan en rojo.",
    sync_rekordbox_title: "💿 Sincronizar playlists de Cabina Pioneer / Rekordbox (Recomendado)",
    sync_rekordbox_desc: "Re-vincula las playlists de export.pdb hacia el tema conservado para que sigan reproduciéndose sin errores \"TRACK NOT FOUND\" en CDJs.",
    btn_open_trash_finder: "📂 Abrir Papelera en Finder",
    btn_cancel: "Cancelar",
    btn_close: "Cerrar",
    btn_confirm_move: "Confirmar y Trasladar",
    // Engine DJ Modal
    engine_modal_title: "Mantenimiento de Engine DJ",
    engine_modal_subtitle: "Eliminación de pistas rojas y re-vinculación de playlists",
    engine_alert_title: "Engine DJ está abierto en tu ordenador",
    engine_alert_desc: "Para proteger la base de datos <code>m.db</code>, <strong>cierra Engine DJ</strong> antes de purgar las pistas. Al terminar, vuelve a abrirlo y las pistas rojas habrán desaparecido.",
    btn_recheck: "Comprobar de nuevo",
    db_sqlite_label: "Base de Datos SQLite:",
    engine_red_tracks: "Pistas rojas (Archivos inexistentes)",
    backup_label: "Copia de Seguridad",
    backup_desc: "Respaldo automático previo de <code>m.db</code>",
    orphan_tracks_engine_title: "Pistas huérfanas detectadas en Engine DJ:",
    th_title_file: "Título / Archivo",
    th_artist: "Artista",
    th_playlists: "Playlists Afectadas",
    engine_safety_note: "🛡️ <strong>100% Seguro:</strong> Se genera automáticamente una copia de seguridad <code>m.db.backup_*</code> antes de cualquier escritura. Las listas de reproducción reorganizan su índice interno para evitar saltos.",
    btn_clean_collection: "Limpiar colección",
    // Rekordbox Modal
    rekordbox_modal_title: "Mantenimiento de Cabina Pioneer / Rekordbox",
    rekordbox_modal_subtitle: "Limpieza de pistas inexistentes en USB (export.pdb) para evitar errores \"TRACK NOT FOUND\" en CDJs",
    rekordbox_alert_title: "Rekordbox está abierto en tu ordenador",
    rekordbox_alert_desc: "Para proteger la base de datos de exportación <code>export.pdb</code> en el USB, <strong>cierra Rekordbox</strong> antes de purgar las pistas de cabina. Al terminar, la base de datos estará limpia y optimizada.",
    rekordbox_db_label: "Base de Datos de Cabina (DeviceSQL):",
    rekordbox_orphan_tracks: "Pistas huérfanas en cabina (Error CDJ)",
    rekordbox_total_tracks_desc: "Pistas totales registradas en <code>export.pdb</code>",
    orphan_tracks_rekordbox_title: "Pistas con archivo ausente en disco (darían error en CDJ/XDJ):",
    th_rekordbox_playlists: "Playlists de Cabina Afectadas",
    rekordbox_safety_note: "🛡️ <strong>100% Seguro:</strong> Se genera automáticamente una copia de seguridad <code>export.pdb.backup_*</code> antes de cualquier modificación. Los reproductores CDJ/XDJ leerán las listas sin interrupciones ni pantallas rojas.",
    // Settings Modal
    settings_title: "Configuración & Efectos de Sonido",
    settings_audio_header: "🔊 Efectos de Audio",
    setting_sound_play: "Reproducir sonido al eliminar o trasladar archivos",
    setting_sound_clean_label: "Efecto al completar la limpieza:",
    sound_trash: "🗑️ Papelera Clásica (Sonido original de macOS Finder)",
    sound_scratch: "💽 DJ Vinyl Scratch (Frenazo / Spinback de Vinilo)",
    sound_airhorn: "🎺 DJ Club Airhorn (Bocina de Fiesta DJ)",
    sound_marimba: "🎵 Acorde Armónico (Major 7th Marimba)",
    sound_pop: "🕹️ Arcade Pop / Burbuja",
    btn_test_sound: "▶️ Probar Sonido",
    setting_volume_label: "Volumen del efecto:",
    settings_dj_header: "🎛️ Preferencias de Análisis DJ",
    setting_protect_cues_label: "Proteger siempre pistas con Cues/Playlists DJ",
    settings_lang_header: "🌐 Idioma / Language / Langue",
    setting_lang_label: "Idioma de la aplicación:",
    btn_save_changes: "Guardar Cambios",
    log_settings_saved: "⚙️ Configuración y preferencias guardadas con éxito.",
    // Table badges
    pill_keep: "CONSERVAR",
    pill_discard: "ELIMINAR",
    reason_prefix: "Motivo: ",
    no_dj_data: "Sin datos DJ",
  },
  en: {
    brand_title: "Dedupp",
    brand_subtitle: "DJ Collection Cleaner",
    badge_engine_title: "Engine OS / Denon Database (m.db)",
    badge_serato_title: "Serato DJ Metadata (_Serato_ & GEOB Cues)",
    badge_rekordbox_title: "Pioneer / Rekordbox Collection (XML / PIONEER)",
    btn_engine_clean: "Clean Engine DJ",
    btn_rekordbox_clean: "Rekordbox Booth",
    btn_settings: "Settings",
    source_label: "USB Drive or Folder:",
    drives_searching: "Searching connected drives...",
    btn_refresh_drives_title: "Refresh USB drives list",
    btn_browse_folder: "Browse...",
    path_label: "Active path:",
    storage_free_of: "free of",
    storage_reclaimable: "reclaimable",
    storage_refresh: "Refresh space",
    tolerance_label: "Duration Tolerance:",
    tolerance_hint: "Margin for identical tracks",
    tolerance_sec: "sec",
    smart_policy_label: "Automatic Criterion:",
    smart_policy_pill: "<span>💎 Quality</span><span class=\"sep\">›</span><span>🛡️ DJ Cues</span><span class=\"sep\">›</span><span>⏱️ Recent</span>",
    btn_scan: "Scan & Preview",
    btn_scanning: "Scanning...",
    protect_cues_label: "Protect tracks with DJ <strong>Hot Cues, Loops or Playlists</strong>",
    versions_hint: "Different versions (Radio vs Extended) are kept.",
    progress_analyzing: "Analyzing audio files...",
    progress_processed: "files processed",
    progress_log_toggle: "Activity log",
    log_title: "System Activity",
    log_clear: "Clear",
    stat_scanned: "Tracks Analyzed",
    stat_groups: "Duplicate Groups",
    stat_redundant: "Files to Clean",
    stat_reclaimable: "Reclaimable Space",
    results_title: "Analysis Results",
    btn_export_csv: "Export CSV",
    btn_move_duplicates: "Move Duplicates...",
    empty_title: "Select your USB drive or folder",
    empty_desc: "Choose your USB drive from the dropdown above and click <strong>Scan</strong>.<br>Dedupp will analyze codecs, bitrates and DJ library metadata without modifying your files.",
    empty_clean_title: "Flawless collection!",
    empty_clean_desc: "No duplicate tracks were found in the selected location.",
    status_ready: "Ready",
    status_scanning: "Scanning files...",
    status_cleaning: "Moving files...",
    status_completed: "Operation completed successfully.",
    subfolder_selected: "Subfolder selected",
    modal_dup_title: "Duplicate Files Management",
    opt_trash_title: "🗑️ Trash (Grouped in a single folder) — Recommended",
    opt_trash_desc: "Gathers all duplicate songs into a single dated folder and moves it to Trash. Keeps trash organized and allows reclaiming disk space when emptied.",
    opt_quarantine_title: "🛡️ Move to Quarantine Folder on drive",
    opt_quarantine_desc: "Isolates tracks in .dedupp_quarantine/ with a manifest.json log. (Does not free disk space until the folder is emptied).",
    sync_engine_title: "🔄 Auto-sync with Engine DJ (Recommended)",
    sync_engine_desc: "Relinks playlists to the highest quality preserved track and removes duplicate entries from m.db so they never appear red.",
    sync_rekordbox_title: "💿 Sync Pioneer / Rekordbox Booth playlists (Recommended)",
    sync_rekordbox_desc: "Relinks export.pdb playlists to the preserved track to prevent \"TRACK NOT FOUND\" errors on CDJs.",
    btn_open_trash_finder: "📂 Open Trash in Finder",
    btn_cancel: "Cancel",
    btn_close: "Close",
    btn_confirm_move: "Confirm & Move",
    engine_modal_title: "Engine DJ Maintenance",
    engine_modal_subtitle: "Red track cleanup and playlist relinking",
    engine_alert_title: "Engine DJ is currently open on your computer",
    engine_alert_desc: "To protect the <code>m.db</code> database, please <strong>close Engine DJ</strong> before purging tracks. Once finished, reopen it and red tracks will be gone.",
    btn_recheck: "Check again",
    db_sqlite_label: "SQLite Database:",
    engine_red_tracks: "Red tracks (Missing audio files)",
    backup_label: "Backup",
    backup_desc: "Automatic backup created for <code>m.db</code>",
    orphan_tracks_engine_title: "Missing tracks found in Engine DJ:",
    th_title_file: "Title / File",
    th_artist: "Artist",
    th_playlists: "Affected Playlists",
    engine_safety_note: "🛡️ <strong>100% Safe:</strong> An automatic backup <code>m.db.backup_*</code> is generated before any modification. Playlists reorder their internal indices seamlessly.",
    btn_clean_collection: "Clean collection",
    rekordbox_modal_title: "Pioneer / Rekordbox Booth Maintenance",
    rekordbox_modal_subtitle: "Cleanup of missing tracks on USB (export.pdb) to avoid \"TRACK NOT FOUND\" errors on CDJs",
    rekordbox_alert_title: "Rekordbox is currently open on your computer",
    rekordbox_alert_desc: "To protect the USB export database <code>export.pdb</code>, please <strong>close Rekordbox</strong> before purging booth tracks. The database will be clean and optimized.",
    rekordbox_db_label: "Booth Database (DeviceSQL):",
    rekordbox_orphan_tracks: "Missing tracks in booth (CDJ Load Error)",
    rekordbox_total_tracks_desc: "Total tracks registered in <code>export.pdb</code>",
    orphan_tracks_rekordbox_title: "Tracks missing on disk (would trigger CDJ error):",
    th_rekordbox_playlists: "Affected Booth Playlists",
    rekordbox_safety_note: "🛡️ <strong>100% Safe:</strong> An automatic backup <code>export.pdb.backup_*</code> is generated before any modification. CDJ/XDJ players will read lists without missing track warnings.",
    settings_title: "Settings & Sound Effects",
    settings_audio_header: "🔊 Audio Effects",
    setting_sound_play: "Play sound effect when deleting or moving files",
    setting_sound_clean_label: "Sound effect upon cleaning completion:",
    sound_trash: "🗑️ Classic Trash (Original macOS Finder sound)",
    sound_scratch: "💽 DJ Vinyl Scratch (Spinback / Brake)",
    sound_airhorn: "🎺 DJ Club Airhorn (Party horn)",
    sound_marimba: "🎵 Harmonic Chord (Major 7th Marimba)",
    sound_pop: "🕹️ Arcade Pop / Bubble",
    btn_test_sound: "▶️ Test Sound",
    setting_volume_label: "Sound effect volume:",
    settings_dj_header: "🎛️ DJ Analysis Preferences",
    setting_protect_cues_label: "Always protect tracks with DJ Cues/Playlists",
    settings_lang_header: "🌐 Language / Idioma / Langue",
    setting_lang_label: "Application language:",
    btn_save_changes: "Save Changes",
    log_settings_saved: "⚙️ Settings and preferences saved successfully.",
    pill_keep: "KEEP",
    pill_discard: "REMOVE",
    reason_prefix: "Reason: ",
    no_dj_data: "No DJ data",
  },
  fr: {
    brand_title: "Dedupp",
    brand_subtitle: "Nettoyeur de Collections DJ",
    badge_engine_title: "Base de données Engine OS / Denon (m.db)",
    badge_serato_title: "Métadonnées Serato DJ (_Serato_ & Cues GEOB)",
    badge_rekordbox_title: "Collection Pioneer / Rekordbox (XML / PIONEER)",
    btn_engine_clean: "Nettoyer Engine DJ",
    btn_rekordbox_clean: "Cabine Rekordbox",
    btn_settings: "Réglages",
    source_label: "Clé USB ou Dossier :",
    drives_searching: "Recherche des disques connectés...",
    btn_refresh_drives_title: "Actualiser la liste des clés USB",
    btn_browse_folder: "Parcourir...",
    path_label: "Chemin actif :",
    storage_free_of: "libres sur",
    storage_reclaimable: "récupérables",
    storage_refresh: "Actualiser l'espace",
    tolerance_label: "Tolérance de Durée :",
    tolerance_hint: "Marge pour morceaux identiques",
    tolerance_sec: "sec",
    smart_policy_label: "Critère Automatique :",
    smart_policy_pill: "<span>💎 Qualité</span><span class=\"sep\">›</span><span>🛡️ Cues DJ</span><span class=\"sep\">›</span><span>⏱️ Récent</span>",
    btn_scan: "Analyser et Prévisualiser",
    btn_scanning: "Analyse en cours...",
    protect_cues_label: "Protéger les pistes avec <strong>Hot Cues, Loops ou Playlists</strong> DJ",
    versions_hint: "Les versions différentes (Radio vs Extended) sont conservées.",
    progress_analyzing: "Analyse des fichiers audio...",
    progress_processed: "fichiers traités",
    progress_log_toggle: "Journal d'activité",
    log_title: "Activité du Système",
    log_clear: "Effacer",
    stat_scanned: "Pistes Analysées",
    stat_groups: "Groupes de Doublons",
    stat_redundant: "Fichiers à Nettoyer",
    stat_reclaimable: "Espace Récupérable",
    results_title: "Résultats de l'Analyse",
    btn_export_csv: "Exporter CSV",
    btn_move_duplicates: "Déplacer les Doublons...",
    empty_title: "Sélectionnez votre clé USB ou dossier",
    empty_desc: "Choisissez votre clé USB dans le menu déroulant et cliquez sur <strong>Analyser</strong>.<br>Dedupp analysera les codecs, débits et données DJ sans modifier vos fichiers.",
    empty_clean_title: "Collection impeccable !",
    empty_clean_desc: "Aucun morceau en double n'a été trouvé dans l'emplacement sélectionné.",
    status_ready: "Prêt",
    status_scanning: "Analyse des fichiers...",
    status_cleaning: "Déplacement des fichiers...",
    status_completed: "Opération terminée avec succès.",
    subfolder_selected: "Sous-dossier sélectionné",
    modal_dup_title: "Gestion des Fichiers en Double",
    opt_trash_title: "🗑️ Corbeille (Regroupés dans un seul dossier) — Recommandé",
    opt_trash_desc: "Rassemble tous les morceaux en double dans un seul dossier daté et le déplace vers la Corbeille. Garde la corbeille propre et libère de l'espace réel lorsqu'elle est vidée.",
    opt_quarantine_title: "🛡️ Déplacer vers le Dossier de Quarantaine du disque",
    opt_quarantine_desc: "Isole les morceaux dans .dedupp_quarantine/ avec un fichier manifest.json. (Ne libère pas d'espace disque tant que le dossier n'est pas supprimé).",
    sync_engine_title: "🔄 Synchroniser auto avec Engine DJ (Recommandé)",
    sync_engine_desc: "Relie les playlists au morceau conservé de meilleure qualité et supprime les doublons de m.db pour qu'ils n'apparaissent jamais en rouge.",
    sync_rekordbox_title: "💿 Synchroniser les playlists Pioneer / Rekordbox (Recommandé)",
    sync_rekordbox_desc: "Relie les playlists dans export.pdb au morceau conservé pour éviter les erreurs \"TRACK NOT FOUND\" sur les lecteurs CDJ.",
    btn_open_trash_finder: "📂 Ouvrir la Corbeille dans Finder",
    btn_cancel: "Annuler",
    btn_close: "Fermer",
    btn_confirm_move: "Confirmer et Déplacer",
    engine_modal_title: "Maintenance Engine DJ",
    engine_modal_subtitle: "Suppression des pistes rouges et synchronisation des playlists",
    engine_alert_title: "Engine DJ est ouvert sur votre ordinateur",
    engine_alert_desc: "Pour protéger la base de données <code>m.db</code>, veuillez <strong>fermer Engine DJ</strong> avant de purger les pistes.",
    btn_recheck: "Vérifier à nouveau",
    db_sqlite_label: "Base de Données SQLite :",
    engine_red_tracks: "Pistes rouges (Fichiers absents)",
    backup_label: "Copie de Sauvegarde",
    backup_desc: "Sauvegarde automatique préalable de <code>m.db</code>",
    orphan_tracks_engine_title: "Pistes orphelines détectées dans Engine DJ :",
    th_title_file: "Titre / Fichier",
    th_artist: "Artiste",
    th_playlists: "Playlists Affectées",
    engine_safety_note: "🛡️ <strong>100% Sûr :</strong> Une sauvegarde automatique <code>m.db.backup_*</code> est générée avant toute modification.",
    btn_clean_collection: "Nettoyer la collection",
    rekordbox_modal_title: "Maintenance Cabine Pioneer / Rekordbox",
    rekordbox_modal_subtitle: "Nettoyage des pistes absentes sur clé USB (export.pdb) pour éviter les erreurs sur CDJs",
    rekordbox_alert_title: "Rekordbox est ouvert sur votre ordinateur",
    rekordbox_alert_desc: "Pour protéger la base de données <code>export.pdb</code>, veuillez <strong>fermer Rekordbox</strong> avant de purger.",
    rekordbox_db_label: "Base de Données Cabine (DeviceSQL) :",
    rekordbox_orphan_tracks: "Pistes orphelines en cabine (Erreur CDJ)",
    rekordbox_total_tracks_desc: "Pistes totales enregistrées dans <code>export.pdb</code>",
    orphan_tracks_rekordbox_title: "Pistes avec fichier absent du disque (erreur sur CDJ/XDJ) :",
    th_rekordbox_playlists: "Playlists de Cabine Affectées",
    rekordbox_safety_note: "🛡️ <strong>100% Sûr :</strong> Une copie de sauvegarde <code>export.pdb.backup_*</code> est créée automatiquement avant toute écriture.",
    settings_title: "Paramètres & Effets Sonores",
    settings_audio_header: "🔊 Effets Audio",
    setting_sound_play: "Jouer un son lors du déplacement des fichiers",
    setting_sound_clean_label: "Effet sonore à la fin du nettoyage :",
    sound_trash: "🗑️ Corbeille Classique (Son macOS Finder)",
    sound_scratch: "💽 DJ Vinyl Scratch (Spinback de Vinyle)",
    sound_airhorn: "🎺 DJ Club Airhorn (Klaxon de Fête)",
    sound_marimba: "🎵 Accord Harmonique (Marimba 7e majeure)",
    sound_pop: "🕹️ Arcade Pop / Bulle",
    btn_test_sound: "▶️ Tester le Son",
    setting_volume_label: "Volume de l'effet sonore :",
    settings_dj_header: "🎛️ Préférences d'Analyse DJ",
    setting_protect_cues_label: "Toujours protéger les pistes avec Cues/Playlists DJ",
    settings_lang_header: "🌐 Langue / Language / Idioma",
    setting_lang_label: "Langue de l'application :",
    btn_save_changes: "Enregistrer les Modifications",
    log_settings_saved: "⚙️ Paramètres et préférences enregistrés avec succès.",
    pill_keep: "CONSERVER",
    pill_discard: "SUPPRIMER",
    reason_prefix: "Raison : ",
    no_dj_data: "Sans données DJ",
  }
};

function t(key, vars = {}) {
  const dict = i18n[currentLanguage] || i18n["es"];
  let str = dict[key] || (i18n["es"] && i18n["es"][key]) || key;
  for (const [k, v] of Object.entries(vars)) {
    str = str.replace(new RegExp(`{${k}}`, "g"), v);
  }
  return str;
}

function applyAppLanguage(lang) {
  if (!i18n[lang]) lang = "es";
  currentLanguage = lang;
  document.documentElement.lang = lang;

  // Header & Brand
  const brandH1 = document.querySelector(".brand-text h1");
  if (brandH1) brandH1.innerText = t("brand_title");
  const brandSub = document.querySelector(".brand-text .subtitle");
  if (brandSub) brandSub.innerText = t("brand_subtitle");

  // DJ Badges titles
  if (badgeEngine) badgeEngine.title = t("badge_engine_title");
  if (badgeSerato) badgeSerato.title = t("badge_serato_title");
  if (badgeRekordbox) badgeRekordbox.title = t("badge_rekordbox_title");

  // Toolbar Buttons
  if (btnEngineClean) {
    const s = btnEngineClean.querySelector("span:not(.mac-badge-count)");
    if (s) s.innerText = t("btn_engine_clean");
  }
  if (btnRekordboxClean) {
    const s = btnRekordboxClean.querySelector("span:not(.mac-badge-count)");
    if (s) s.innerText = t("btn_rekordbox_clean");
  }
  if (btnOpenSettings) {
    const s = btnOpenSettings.querySelector("span");
    if (s) s.innerText = t("btn_settings");
  }

  // Source Section
  const driveLabel = document.querySelector("label[for='drive-select']");
  if (driveLabel) driveLabel.innerText = t("source_label");
  if (btnRefreshDrives) btnRefreshDrives.title = t("btn_refresh_drives_title");
  if (btnBrowseFolder) {
    const s = btnBrowseFolder.querySelector("span");
    if (s) s.innerText = t("btn_browse_folder");
  }
  const pathLabelEl = document.querySelector(".path-label");
  if (pathLabelEl) pathLabelEl.innerText = t("path_label");
  if (btnRefreshStorage) btnRefreshStorage.innerText = t("storage_refresh");

  // Parameters
  const tolLabel = document.querySelector("label[for='tolerance-input']");
  if (tolLabel) tolLabel.innerText = t("tolerance_label");
  const tolHint = document.querySelector(".tolerance-hint");
  if (tolHint) tolHint.innerText = t("tolerance_hint");
  const smartLabel = document.querySelector(".smart-policy-group label");
  if (smartLabel) smartLabel.innerText = t("smart_policy_label");
  const policyPill = document.querySelector(".policy-pill");
  if (policyPill) policyPill.innerHTML = t("smart_policy_pill");
  if (scanText) scanText.innerText = t("btn_scan");
  const cuesLabel = document.querySelector(".options-row label span:last-child");
  if (cuesLabel) cuesLabel.innerHTML = t("protect_cues_label");
  const versionsTip = document.querySelector(".options-row .info-tip");
  if (versionsTip) versionsTip.innerText = t("versions_hint");

  // Progress Panel
  if (btnToggleLog) btnToggleLog.innerText = t("progress_log_toggle");
  const logTitleEl = document.querySelector(".log-console-title");
  if (logTitleEl) {
    logTitleEl.innerHTML = `<svg class="mac-svg-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg> ${t("log_title")}`;
  }
  if (btnClearLog) btnClearLog.innerText = t("log_clear");

  // Stats
  const statLabels = document.querySelectorAll(".stat-card .stat-label");
  if (statLabels && statLabels.length >= 4) {
    statLabels[0].innerText = t("stat_scanned");
    statLabels[1].innerText = t("stat_groups");
    statLabels[2].innerText = t("stat_redundant");
    statLabels[3].innerText = t("stat_reclaimable");
  }

  // Results
  const resH2 = document.querySelector(".results-header h2");
  if (resH2) resH2.innerText = t("results_title");
  if (btnExportCsv) {
    const s = btnExportCsv.querySelector("span");
    if (s) s.innerText = t("btn_export_csv");
  }
  if (btnApplyQuarantine) {
    const s = btnApplyQuarantine.querySelector("span");
    if (s) s.innerText = t("btn_move_duplicates");
  }
  if (emptyState) {
    const h3 = emptyState.querySelector("h3");
    if (h3) h3.innerText = t("empty_title");
    const p = emptyState.querySelector("p");
    if (p) p.innerHTML = t("empty_desc");
  }

  // Duplicates Modal
  const mTitle = document.getElementById("modal-title");
  if (mTitle) mTitle.innerText = t("modal_dup_title");
  const optTrashTitle = document.querySelector("#opt-trash .mode-text strong");
  if (optTrashTitle) optTrashTitle.innerText = t("opt_trash_title");
  const optTrashDesc = document.querySelector("#opt-trash .mode-text p");
  if (optTrashDesc) optTrashDesc.innerText = t("opt_trash_desc");
  const optQuarTitle = document.querySelector("#opt-quarantine .mode-text strong");
  if (optQuarTitle) optQuarTitle.innerText = t("opt_quarantine_title");
  const optQuarDesc = document.querySelector("#opt-quarantine .mode-text p");
  if (optQuarDesc) optQuarDesc.innerText = t("opt_quarantine_desc");

  const syncEngTitle = document.querySelector("#engine-sync-card .engine-sync-desc strong");
  if (syncEngTitle) syncEngTitle.innerText = t("sync_engine_title");
  const syncEngDesc = document.querySelector("#engine-sync-card .engine-sync-desc p");
  if (syncEngDesc) syncEngDesc.innerHTML = t("sync_engine_desc");

  const syncRkbTitle = document.querySelector("#rekordbox-sync-card .rekordbox-sync-desc strong");
  if (syncRkbTitle) syncRkbTitle.innerText = t("sync_rekordbox_title");
  const syncRkbDesc = document.querySelector("#rekordbox-sync-card .rekordbox-sync-desc p");
  if (syncRkbDesc) syncRkbDesc.innerHTML = t("sync_rekordbox_desc");

  if (modalBtnOpenTrash) modalBtnOpenTrash.innerText = t("btn_open_trash_finder");
  if (modalBtnCancel) modalBtnCancel.innerText = t("btn_cancel");
  if (modalBtnConfirm) modalBtnConfirm.innerText = t("btn_confirm_move");

  // Engine DJ Modal
  const engH3 = document.querySelector(".engine-dialog .engine-modal-titles h3");
  if (engH3) engH3.innerText = t("engine_modal_title");
  const engSub = document.querySelector(".engine-dialog .engine-modal-subtitle");
  if (engSub) engSub.innerText = t("engine_modal_subtitle");
  const engAlertStrong = document.querySelector("#engine-running-alert strong");
  if (engAlertStrong) engAlertStrong.innerText = t("engine_alert_title");
  const engAlertP = document.querySelector("#engine-running-alert p");
  if (engAlertP) engAlertP.innerHTML = t("engine_alert_desc");
  if (btnRecheckEngineRunning) btnRecheckEngineRunning.innerText = t("btn_recheck");
  const engDbLabel = document.querySelector(".engine-dialog .engine-stat-label");
  if (engDbLabel) engDbLabel.innerText = t("db_sqlite_label");
  const engRedDesc = document.querySelector(".engine-stat-pill.engine-stat-red .stat-desc");
  if (engRedDesc) engRedDesc.innerText = t("engine_red_tracks");
  const engBkpNum = document.querySelector(".engine-stat-pill.engine-stat-info .stat-number");
  if (engBkpNum) engBkpNum.innerText = t("backup_label");
  const engBkpDesc = document.querySelector(".engine-stat-pill.engine-stat-info .stat-desc");
  if (engBkpDesc) engBkpDesc.innerHTML = t("backup_desc");
  const engTracksH4 = document.querySelector(".engine-tracks-header h4");
  if (engTracksH4) engTracksH4.innerText = t("orphan_tracks_engine_title");
  const engThs = document.querySelectorAll(".engine-table thead th");
  if (engThs && engThs.length >= 3) {
    engThs[0].innerText = t("th_title_file");
    engThs[1].innerText = t("th_artist");
    engThs[2].innerText = t("th_playlists");
  }
  const engSafety = document.querySelector(".engine-safety-note");
  if (engSafety) engSafety.innerHTML = t("engine_safety_note");
  if (btnCancelEngine) btnCancelEngine.innerText = t("btn_close");
  if (btnConfirmPurgeText) btnConfirmPurgeText.innerText = t("btn_clean_collection");

  // Rekordbox Modal
  const rkbH3 = document.querySelector(".rekordbox-dialog .engine-modal-titles h3");
  if (rkbH3) rkbH3.innerText = t("rekordbox_modal_title");
  const rkbSub = document.querySelector(".rekordbox-dialog .engine-modal-subtitle");
  if (rkbSub) rkbSub.innerText = t("rekordbox_modal_subtitle");
  const rkbAlertStrong = document.querySelector("#rekordbox-running-alert strong");
  if (rkbAlertStrong) rkbAlertStrong.innerText = t("rekordbox_alert_title");
  const rkbAlertP = document.querySelector("#rekordbox-running-alert p");
  if (rkbAlertP) rkbAlertP.innerHTML = t("rekordbox_alert_desc");
  if (btnRecheckRekordboxRunning) btnRecheckRekordboxRunning.innerText = t("btn_recheck");
  const rkbDbLabel = document.querySelector(".rekordbox-dialog .engine-stat-label");
  if (rkbDbLabel) rkbDbLabel.innerText = t("rekordbox_db_label");
  const rkbRedDesc = document.querySelector(".rekordbox-dialog .engine-stat-pill.engine-stat-red .stat-desc");
  if (rkbRedDesc) rkbRedDesc.innerText = t("rekordbox_orphan_tracks");
  const rkbTotDesc = document.querySelector("#rekordbox-total-tracks + .stat-desc");
  if (rkbTotDesc) rkbTotDesc.innerHTML = t("rekordbox_total_tracks_desc");
  const rkbTracksH4 = document.querySelector(".rekordbox-dialog .engine-tracks-header h4");
  if (rkbTracksH4) rkbTracksH4.innerText = t("orphan_tracks_rekordbox_title");
  const rkbThs = document.querySelectorAll(".rekordbox-dialog table thead th");
  if (rkbThs && rkbThs.length >= 3) {
    rkbThs[0].innerText = t("th_title_file");
    rkbThs[1].innerText = t("th_artist");
    rkbThs[2].innerText = t("th_rekordbox_playlists");
  }
  const rkbSafety = document.querySelector(".rekordbox-dialog .engine-safety-note");
  if (rkbSafety) rkbSafety.innerHTML = t("rekordbox_safety_note");
  if (btnCancelRekordbox) btnCancelRekordbox.innerText = t("btn_close");
  if (btnConfirmPurgeRekordboxText) btnConfirmPurgeRekordboxText.innerText = t("btn_clean_collection");

  // Settings Modal
  const setH3 = document.querySelector(".settings-dialog h3");
  if (setH3) setH3.innerText = t("settings_title");
  const setSecs = document.querySelectorAll(".settings-section h4");
  if (setSecs && setSecs.length >= 3) {
    setSecs[0].innerText = t("settings_audio_header");
    setSecs[1].innerText = t("settings_dj_header");
    setSecs[2].innerText = t("settings_lang_header");
  }
  const sndPlayLbl = document.querySelector("label[for='setting-sound-enabled'] .setting-label");
  if (sndPlayLbl) sndPlayLbl.innerText = t("setting_sound_play");
  const sndChoiceLbl = document.querySelector("label[for='setting-sound-choice']");
  if (sndChoiceLbl) sndChoiceLbl.innerText = t("setting_sound_clean_label");

  const optTrash = document.querySelector("#setting-sound-choice option[value='trash']");
  if (optTrash) optTrash.innerText = t("sound_trash");
  const optScratch = document.querySelector("#setting-sound-choice option[value='scratch']");
  if (optScratch) optScratch.innerText = t("sound_scratch");
  const optAirhorn = document.querySelector("#setting-sound-choice option[value='airhorn']");
  if (optAirhorn) optAirhorn.innerText = t("sound_airhorn");
  const optMarimba = document.querySelector("#setting-sound-choice option[value='marimba']");
  if (optMarimba) optMarimba.innerText = t("sound_marimba");
  const optPop = document.querySelector("#setting-sound-choice option[value='pop']");
  if (optPop) optPop.innerText = t("sound_pop");

  if (btnTestSound) btnTestSound.innerText = t("btn_test_sound");
  const volLbl = document.querySelector("label[for='setting-sound-volume']");
  if (volLbl) volLbl.innerText = t("setting_volume_label");
  const protCueLbl = document.querySelector("label[for='setting-protect-cues-default'] .setting-label");
  if (protCueLbl) protCueLbl.innerText = t("setting_protect_cues_label");
  const langChoiceLbl = document.querySelector("label[for='setting-language-choice']");
  if (langChoiceLbl) langChoiceLbl.innerText = t("setting_lang_label");

  if (btnCancelSettings) btnCancelSettings.innerText = t("btn_cancel");
  if (btnCloseSettings) btnCloseSettings.innerText = t("btn_save_changes");

  if (settingLanguageChoice) settingLanguageChoice.value = lang;

  if (currentDecisions && currentDecisions.length > 0) {
    renderDecisions(currentDecisions);
  }
}

let soundSettings = {
  enabled: true,
  sound: "trash",
  volume: 0.85,
  protectCuesDefault: true,
  language: "es",
};

function applySettingsToForm(settings) {
  if (settingSoundEnabled) settingSoundEnabled.checked = settings.enabled;
  if (settingSoundChoice) settingSoundChoice.value = settings.sound;
  if (settingSoundVolume) {
    settingSoundVolume.value = Math.round(settings.volume * 100);
    if (volumeValText) volumeValText.innerText = `${Math.round(settings.volume * 100)}%`;
  }
  if (settingProtectCuesDefault) settingProtectCuesDefault.checked = settings.protectCuesDefault;
  if (settingLanguageChoice) settingLanguageChoice.value = settings.language || "es";
}

function loadSettingsFromStorage() {
  try {
    const saved = localStorage.getItem("dedupp_settings") || localStorage.getItem("dj_dedupe_settings");
    if (saved) {
      const parsed = JSON.parse(saved);
      soundSettings = { ...soundSettings, ...parsed };
    }
  } catch (e) {
    console.warn("No se pudieron cargar ajustes:", e);
  }
  applySettingsToForm(soundSettings);
  if (protectCuesCheckbox) protectCuesCheckbox.checked = soundSettings.protectCuesDefault;
  applyAppLanguage(soundSettings.language || "es");
}

function saveSettingsToStorage() {
  try {
    localStorage.setItem("dedupp_settings", JSON.stringify(soundSettings));
  } catch (e) {
    console.warn("No se pudieron guardar ajustes:", e);
  }
}

async function playDedupeSound(overrideSound = null, overrideVolume = null) {
  if (!soundSettings.enabled && !overrideSound) return;

  const soundType = overrideSound || soundSettings.sound;
  const vol = overrideVolume !== null ? overrideVolume : soundSettings.volume;

  // 1. Si es la papelera clásica, invocar sonido nativo de macOS Finder
  if (soundType === "trash") {
    try {
      await invoke("play_system_sound", { soundName: "trash" });
      return;
    } catch (e) {
      // Continuar a síntesis Web Audio si no es macOS
    }
  }

  const ctx = getAudioContext();
  if (!ctx) return;

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(vol, ctx.currentTime);
  masterGain.connect(ctx.destination);

  const t = ctx.currentTime;

  if (soundType === "scratch") {
    // DJ Vinyl Scratch / Spinback
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    filter.type = "bandpass";
    filter.Q.value = 4.5;

    osc.frequency.setValueAtTime(450, t);
    osc.frequency.exponentialRampToValueAtTime(1600, t + 0.08);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.28);
    osc.frequency.linearRampToValueAtTime(30, t + 0.45);

    filter.frequency.setValueAtTime(700, t);
    filter.frequency.exponentialRampToValueAtTime(2800, t + 0.08);
    filter.frequency.exponentialRampToValueAtTime(250, t + 0.45);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.85, t + 0.03);
    gain.gain.setValueAtTime(0.7, t + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    osc.start(t);
    osc.stop(t + 0.46);
  } else if (soundType === "airhorn") {
    // DJ Airhorn (bocina club reggae/dancehall con patrón rítmico ta-ta-taaa)
    const freqs = [466.16, 587.33, 700.0];
    const pulses = [0, 0.12, 0.26];

    pulses.forEach((delay, idx) => {
      const pStart = t + delay;
      const pDur = idx === 2 ? 0.45 : 0.08;

      freqs.forEach(freq => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, pStart);

        gain.gain.setValueAtTime(0.22, pStart);
        gain.gain.exponentialRampToValueAtTime(0.001, pStart + pDur);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(pStart);
        osc.stop(pStart + pDur);
      });
    });
  } else if (soundType === "marimba") {
    // Acorde Marimba Major 7th arpegiado (C5, E5, G5, B5)
    const notes = [523.25, 659.25, 783.99, 987.77];
    notes.forEach((freq, idx) => {
      const nStart = t + idx * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, nStart);

      gain.gain.setValueAtTime(0.35, nStart);
      gain.gain.exponentialRampToValueAtTime(0.001, nStart + 0.4);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(nStart);
      osc.stop(nStart + 0.42);
    });
  } else if (soundType === "pop") {
    // Arcade Pop
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(950, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.12);

    gain.gain.setValueAtTime(0.65, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(t);
    osc.stop(t + 0.13);
  } else {
    // Fallback Papelera papel arrugado
    const bufferSize = Math.floor(ctx.sampleRate * 0.35);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1200, t);
    filter.frequency.exponentialRampToValueAtTime(200, t + 0.3);
    filter.Q.value = 3.0;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    noise.start(t);
    noise.stop(t + 0.35);
  }
}

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = bytes / Math.pow(k, i);
  return `${val.toFixed(i >= 3 ? 2 : 1)} ${sizes[i]}`;
}

async function updateStorageWidget(path) {
  if (!path) {
    if (storageCard) storageCard.style.display = "none";
    return;
  }
  try {
    const space = await invoke("get_disk_usage", { path });
    if (!space) return;

    currentDiskTotalBytes = space.total_bytes || 0;
    if (storageCard) storageCard.style.display = "flex";
    if (storageDriveName) {
      const parts = path.split("/").filter(Boolean);
      storageDriveName.innerText = parts[parts.length - 1] || path;
    }
    if (storageBadgeType) {
      storageBadgeType.innerText = path.startsWith("/Volumes/") ? "USB" : "DISCO";
    }
    if (storageFreeVal) storageFreeVal.innerHTML = `<strong>${escapeHtml(space.free_formatted)}</strong> libres`;
    if (storageTotalVal) storageTotalVal.innerText = space.total_formatted;
    if (storageUsedPct) storageUsedPct.innerText = `${Math.round(space.used_percentage)}% usado`;
    if (storageBarUsed) storageBarUsed.style.width = `${Math.min(100, Math.round(space.used_percentage))}%`;

    updateReclaimableMetrics();
  } catch (err) {
    console.warn("No se pudo obtener información de almacenamiento:", err);
  }
}

function updateReclaimableMetrics() {
  if (!currentDecisions || currentDecisions.length === 0) {
    if (storageBarReclaim) storageBarReclaim.style.width = "0%";
    if (storageFreedPill) storageFreedPill.style.display = "none";
    if (statReclaimableSpace) statReclaimableSpace.innerText = "0 MB";
    return;
  }

  const totalReclaimable = currentDecisions.reduce((acc, d) => {
    return acc + d.discard.reduce((s, disc) => s + (disc.track.file_size_bytes || 0), 0);
  }, 0);

  const formatted = formatBytes(totalReclaimable);
  if (statReclaimableSpace) {
    statReclaimableSpace.innerText = formatted;
  }

  if (storageFreedPill && storageFreedText) {
    storageFreedText.innerText = `${formatted} recuperables`;
    storageFreedPill.style.display = totalReclaimable > 0 ? "inline-flex" : "none";
  }

  if (currentDiskTotalBytes > 0 && storageBarReclaim) {
    const reclaimPct = Math.min(100, (totalReclaimable / currentDiskTotalBytes) * 100);
    storageBarReclaim.style.width = `${reclaimPct.toFixed(1)}%`;
  }
}

const actionsRight = document.getElementById("actions-right");
const btnExportCsv = document.getElementById("btn-export-csv");
const btnApplyQuarantine = document.getElementById("btn-apply-quarantine");

const emptyState = document.getElementById("empty-state");
const resultsList = document.getElementById("results-list");
const statusMsg = document.getElementById("status-msg");

// Modal interactivo
const customModal = document.getElementById("custom-modal");
const modalIcon = document.getElementById("modal-icon");
const modalTitle = document.getElementById("modal-title");
const modalText = document.getElementById("modal-text");
const modalModeOptions = document.getElementById("modal-mode-options");
const optTrash = document.getElementById("opt-trash");
const optQuarantine = document.getElementById("opt-quarantine");
const radioTrash = document.getElementById("radio-trash");
const radioQuarantine = document.getElementById("radio-quarantine");

const modalActionProgress = document.getElementById("modal-action-progress");
const modalActionFile = document.getElementById("modal-action-file");
const modalActionPct = document.getElementById("modal-action-pct");
const modalActionBar = document.getElementById("modal-action-bar");
const modalActionCount = document.getElementById("modal-action-count");

const modalInfoBox = document.getElementById("modal-info-box");
const modalDetail1 = document.getElementById("modal-detail-1");
const modalDetail2 = document.getElementById("modal-detail-2");
let modalBtnCancel = document.getElementById("modal-btn-cancel");
let modalBtnConfirm = document.getElementById("modal-btn-confirm");
const modalBtnOpenTrash = document.getElementById("modal-btn-open-trash");

let currentDuplicateGroups = [];
let currentDecisions = [];
let currentRootPath = "";
let isLogVisible = true;

// Función para abrir la papelera nativa con feedback visual
async function triggerOpenTrash(btnElement = null) {
  if (btnElement) {
    btnElement.disabled = true;
    btnElement.innerText = "⏳ Abriendo Finder...";
  }
  appendLog("Solicitando apertura de la Papelera al sistema...", true);

  try {
    await invoke("open_system_trash");
    appendLog("✅ Ventana de Papelera abierta y enfocada en Finder.", true);
    if (btnElement) {
      btnElement.innerText = "✅ Papelera Abierta";
    }
  } catch (err) {
    console.error("Error abriendo papelera:", err);
    appendLog(`❌ Error abriendo Papelera: ${err}`, true);
    if (btnElement) {
      btnElement.innerText = "❌ Error al abrir";
    }
  } finally {
    if (btnElement) {
      setTimeout(() => {
        btnElement.disabled = false;
        btnElement.innerText = "📂 Abrir Papelera en Finder";
      }, 2500);
    }
  }
}

// Delegación global de clics para cualquier botón de abrir papelera
document.addEventListener("click", (e) => {
  const target = e.target.closest("#btn-open-trash-link, #modal-btn-open-trash");
  if (target) {
    e.preventDefault();
    e.stopPropagation();
    triggerOpenTrash(target);
  }
});

// Configuración de los radios de selección de modo (Papelera vs Cuarentena)
optTrash.addEventListener("click", () => {
  radioTrash.checked = true;
  optTrash.classList.add("selected");
  optQuarantine.classList.remove("selected");
});

optQuarantine.addEventListener("click", () => {
  radioQuarantine.checked = true;
  optQuarantine.classList.add("selected");
  optTrash.classList.remove("selected");
});

// Mostrar modal de notificación informativo
function showNoticeModal({ title, icon, text, detail1, detail2, showOpenTrash = false }) {
  modalIcon.innerText = icon || "✅";
  modalTitle.innerText = title;
  modalText.innerHTML = text;
  modalModeOptions.style.display = "none";
  modalActionProgress.style.display = "none";
  modalInfoBox.style.display = (detail1 || detail2) ? "block" : "none";
  modalDetail1.innerHTML = detail1 || "";
  modalDetail2.innerHTML = detail2 || "";

  if (modalBtnOpenTrash) {
    modalBtnOpenTrash.style.display = showOpenTrash ? "inline-flex" : "none";
  }

  const newConfirm = modalBtnConfirm.cloneNode(true);
  newConfirm.disabled = false;
  newConfirm.innerText = "Entendido";
  newConfirm.className = "btn btn-primary";
  modalBtnCancel.style.display = "none";

  modalBtnConfirm.parentNode.replaceChild(newConfirm, modalBtnConfirm);
  modalBtnConfirm = newConfirm;

  modalBtnConfirm.addEventListener("click", () => {
    customModal.style.display = "none";
    if (modalBtnOpenTrash) modalBtnOpenTrash.style.display = "none";
  });

  customModal.style.display = "flex";
}

// Añadir entrada a la terminal de logs en tiempo real
function appendLog(message, isHighlight = false) {
  if (!message) return;
  const timeStr = new Date().toLocaleTimeString();
  const entry = document.createElement("div");
  entry.className = "log-entry";
  entry.innerHTML = `<span class="log-time">[${timeStr}]</span> <span class="${isHighlight ? 'log-highlight' : ''}">${escapeHtml(message)}</span>`;
  logConsoleBody.appendChild(entry);
  logConsoleBody.scrollTop = logConsoleBody.scrollHeight;
}

// Actualizar barra de progreso con el evento emitido por Rust
function handleScanProgress(payload) {
  if (!payload) return;

  const current = payload.current || 0;
  const total = payload.total || 0;
  const percent = Math.min(100, Math.round(payload.percentage || 0));

  progressFill.style.width = `${percent}%`;
  progressPercent.innerText = `${percent}%`;

  if (payload.current_file) {
    progressFilename.innerText = payload.current_file;
  }

  if (total > 0) {
    progressCount.innerText = `${current.toLocaleString()} / ${total.toLocaleString()} archivos analizados`;
  } else {
    progressCount.innerText = `Buscando archivos de audio...`;
  }

  if (payload.log_message) {
    appendLog(payload.log_message, true);
  }
}

// Actualizar barra de progreso de eliminación / cuarentena
function handleActionProgress(payload) {
  if (!payload) return;

  const current = payload.current || 0;
  const total = payload.total || 0;
  const percent = Math.min(100, Math.round(payload.percentage || 0));

  modalActionBar.style.width = `${percent}%`;
  modalActionPct.innerText = `${percent}%`;

  const modeLabel = payload.mode === "Trash" ? "Papelera" : "Cuarentena";
  modalActionFile.innerText = `Moviendo a ${modeLabel}: ${payload.current_file}`;
  modalActionCount.innerText = `${current.toLocaleString()} / ${total.toLocaleString()} archivos procesados`;

  if (current % 10 === 0 || current === total) {
    appendLog(`[${modeLabel}] (${current}/${total}): ${payload.current_file}`);
  }
}

// Alternar visibilidad de la consola de logs
btnToggleLog.addEventListener("click", () => {
  isLogVisible = !isLogVisible;
  logConsoleWrap.style.display = isLogVisible ? "flex" : "none";
  btnToggleLog.innerText = isLogVisible ? "📋 Ocultar Registro en Vivo" : "📋 Ver Registro en Vivo";
});

// Limpiar consola de logs
btnClearLog.addEventListener("click", () => {
  logConsoleBody.innerHTML = "";
});

// Carga y detecta automáticamente las unidades USB y discos
async function loadDrives(preselectPath = null) {
  statusMsg.innerText = "Buscando memorias USB y unidades conectadas...";
  try {
    const drives = await invoke("list_available_drives");
    driveSelect.innerHTML = "";

    if (!drives || drives.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.innerText = "No se detectaron unidades automáticamente";
      driveSelect.appendChild(opt);
      return;
    }

    let defaultVal = preselectPath;
    let foundFirstUsb = false;

    drives.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d.path;
      opt.innerText = d.label;
      driveSelect.appendChild(opt);

      // Priorizar seleccionar automáticamente la primera unidad USB detectada
      if (!defaultVal && d.is_usb && !foundFirstUsb) {
        defaultVal = d.path;
        foundFirstUsb = true;
      }
    });

    if (!defaultVal && drives.length > 0) {
      defaultVal = drives[0].path;
    }

    if (defaultVal) {
      driveSelect.value = defaultVal;
      currentRootPath = defaultVal;
      currentPathText.innerText = defaultVal;
      updateStorageWidget(defaultVal);
      checkEngineDjStatus(defaultVal);
      checkRekordboxStatus(defaultVal);
    }

    appendLog(`Unidades detectadas: ${drives.map(d => d.label).join(", ")}`);
    statusMsg.innerText = `Listo. Se detectaron ${drives.length} ubicaciones de almacenamiento.`;
  } catch (err) {
    console.error("Error al cargar unidades:", err);
    statusMsg.innerText = "Error detectando unidades: " + err;
  }
}

// Al cambiar la opción en el select
driveSelect.addEventListener("change", () => {
  currentRootPath = driveSelect.value;
  currentPathText.innerText = currentRootPath;
  updateStorageWidget(currentRootPath);
  checkEngineDjStatus(currentRootPath);
  checkRekordboxStatus(currentRootPath);
});

// Botón refrescar unidades USB
btnRefreshDrives.addEventListener("click", () => {
  loadDrives(currentRootPath);
});

// Botón refrescar espacio en la unidad
if (btnRefreshStorage) {
  btnRefreshStorage.addEventListener("click", () => {
    updateStorageWidget(currentRootPath);
  });
}

// Botón examinar subcarpeta limitado a la unidad seleccionada
btnBrowseFolder.addEventListener("click", async () => {
  const baseDrive = driveSelect.value;
  if (!baseDrive) {
    showNoticeModal({
      title: "Selecciona una unidad",
      icon: "ℹ️",
      text: "Por favor selecciona primero una unidad USB o disco en el desplegable.",
    });
    return;
  }

  try {
    statusMsg.innerText = `Abriendo explorador en la unidad ${baseDrive}...`;
    const selected = await invoke("browse_folder", { basePath: baseDrive });
    if (selected) {
      currentRootPath = selected;
      currentPathText.innerText = selected;
      statusMsg.innerText = `Subcarpeta seleccionada: ${selected}`;
      appendLog(`Subcarpeta seleccionada para escaneo: ${selected}`, true);
      updateStorageWidget(selected);
      checkEngineDjStatus(selected);
      checkRekordboxStatus(selected);
    } else {
      statusMsg.innerText = "Selección cancelada.";
    }
  } catch (err) {
    showNoticeModal({
      title: "Aviso de Selección",
      icon: "⚠️",
      text: escapeHtml(String(err)),
    });
    statusMsg.innerText = "Error: " + err;
  }
});

// Actualiza los badges de detección DJ
function updateDjBadges(libs) {
  if (libs.has_engine_dj) badgeEngine.classList.add("active");
  else badgeEngine.classList.remove("active");

  if (libs.has_serato) badgeSerato.classList.add("active");
  else badgeSerato.classList.remove("active");

  if (libs.has_rekordbox) badgeRekordbox.classList.add("active");
  else badgeRekordbox.classList.remove("active");
}

// Renderiza las tarjetas de duplicados
function renderDecisions(decisions) {
  resultsList.innerHTML = "";
  if (decisions.length === 0) {
    emptyState.style.display = "flex";
    emptyState.querySelector("h3").innerText = "¡Colección impecable!";
    emptyState.querySelector("p").innerText = "No se encontraron canciones duplicadas en la unidad seleccionada.";
    resultsList.style.display = "none";
    actionsRight.style.display = "none";
    return;
  }

  emptyState.style.display = "none";
  resultsList.style.display = "flex";
  actionsRight.style.display = "flex";

  decisions.forEach((dec) => {
    const card = document.createElement("div");
    card.className = "group-card";

    const titleBar = document.createElement("div");
    titleBar.className = "group-title-bar";
    titleBar.innerHTML = `
      <div class="group-name">
        <svg class="mac-svg-icon" style="margin-right: 6px; color: var(--apple-blue);" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 18V5l12-2v13"></path>
          <circle cx="6" cy="18" r="3"></circle>
          <circle cx="18" cy="16" r="3"></circle>
        </svg>
        ${escapeHtml(dec.group_key)}
      </div>
      <div class="group-reason-badge">${escapeHtml(dec.summary_reason)}</div>
    `;
    card.appendChild(titleBar);

    const table = document.createElement("table");
    table.className = "tracks-table";

    const k = dec.keep;
    const isLossless = k.is_lossless;
    const djBadgesKeep = formatDjBadges(k.dj_info);

    const trKeep = document.createElement("tr");
    trKeep.className = "tr-keep";
    trKeep.innerHTML = `
      <td style="width: 120px;">
        <span class="status-pill pill-keep">CONSERVAR</span>
      </td>
      <td>
        <strong style="color: #fff; font-size: 12.5px;">${escapeHtml(k.filename)}</strong>
        <div style="font-size: 11px; color: var(--text-tertiary); word-break: break-all; margin-top: 2px;">
          ${escapeHtml(k.path)}
        </div>
      </td>
      <td style="width: 110px;">
        <span class="format-tag ${isLossless ? 'lossless' : ''}">${k.extension.toUpperCase()}</span>
        <span style="font-size: 11.5px; margin-left: 4px; color: var(--text-secondary);">${k.bitrate_kbps > 0 ? k.bitrate_kbps + 'k' : 'Lossless'}</span>
      </td>
      <td style="width: 90px; font-size: 11.5px; color: var(--text-tertiary);">
        ${k.sample_rate_hz} Hz
      </td>
      <td style="width: 100px; font-size: 11.5px; color: var(--text-tertiary);">
        ${formatDate(k.modified_time)}
      </td>
      <td style="width: 170px;">
        ${djBadgesKeep}
      </td>
    `;
    table.appendChild(trKeep);

    dec.discard.forEach(disc => {
      const d = disc.track;
      const dLossless = d.is_lossless;
      const djBadgesDiscard = formatDjBadges(d.dj_info);

      const trDisc = document.createElement("tr");
      trDisc.className = "tr-discard";
      trDisc.innerHTML = `
        <td style="width: 120px;">
          <span class="status-pill pill-discard">ELIMINAR</span>
        </td>
        <td>
          <strong style="color: rgba(255,255,255,0.85); font-size: 12.5px;">${escapeHtml(d.filename)}</strong>
          <div style="font-size: 11px; color: #ff8a80; margin-top: 2px;">
            Motivo: ${escapeHtml(disc.reason)}
          </div>
          <div style="font-size: 11px; color: var(--text-quaternary); word-break: break-all; margin-top: 2px;">
            ${escapeHtml(d.path)}
          </div>
        </td>
        <td style="width: 110px;">
          <span class="format-tag ${dLossless ? 'lossless' : ''}">${d.extension.toUpperCase()}</span>
          <span style="font-size: 11.5px; margin-left: 4px; color: var(--text-secondary);">${d.bitrate_kbps > 0 ? d.bitrate_kbps + 'k' : 'Lossless'}</span>
        </td>
        <td style="width: 90px; font-size: 11.5px; color: var(--text-tertiary);">
          ${d.sample_rate_hz} Hz
        </td>
        <td style="width: 100px; font-size: 11.5px; color: var(--text-tertiary);">
          ${formatDate(d.modified_time)}
        </td>
        <td style="width: 170px;">
          ${djBadgesDiscard}
        </td>
      `;
      table.appendChild(trDisc);
    });

    const tableWrap = document.createElement("div");
    tableWrap.className = "tracks-table-wrap";
    tableWrap.appendChild(table);
    card.appendChild(tableWrap);
    resultsList.appendChild(card);
  });
}

function formatDjBadges(dj) {
  let html = "";
  if (dj.in_engine_dj) {
    html += `<span class="dj-tag">Engine (${dj.engine_dj_cue_count} cues)</span> `;
  }
  if (dj.in_serato) {
    html += `<span class="dj-tag">Serato (${dj.serato_crates.length} crates)</span> `;
  }
  if (dj.in_rekordbox) {
    html += `<span class="dj-tag">Rekordbox (${dj.rekordbox_cue_count} cues)</span> `;
  }
  return html || '<span class="dj-tag-none">Sin datos DJ</span>';
}

function formatDate(isoStr) {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    return d.toISOString().split("T")[0];
  } catch (e) {
    return isoStr;
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Botón Escanear
btnScan.addEventListener("click", async () => {
  const path = currentRootPath || driveSelect.value;
  if (!path) {
    showNoticeModal({
      title: "Selecciona una unidad",
      icon: "ℹ️",
      text: "Por favor selecciona una unidad USB o carpeta en el desplegable.",
    });
    return;
  }

  const tolerance = parseFloat(toleranceInput.value) || 3.5;
  const criterion = criterionSelect ? criterionSelect.value : "quality";
  const protectCues = protectCuesCheckbox.checked;

  btnScan.disabled = true;
  scanIcon.innerText = "⏳";
  scanText.innerText = t("btn_scanning");

  progressPanel.style.display = "flex";
  if (macSpinner) macSpinner.style.display = "inline-block";
  logConsoleWrap.style.display = isLogVisible ? "flex" : "none";
  progressFill.style.width = "0%";
  progressPercent.innerText = "0%";
  progressTitle.innerText = `${t("progress_analyzing")} (${path})`;
  progressFilename.innerText = "Iniciando escaneo de archivos...";
  progressCount.innerText = "Calculando...";

  appendLog(`=== Iniciando análisis de: ${path} ===`, true);
  statusMsg.innerText = `Escaneando archivos en ${path}...`;

  try {
    const scanRes = await invoke("scan_directory", { path, toleranceSecs: tolerance });
    currentDuplicateGroups = scanRes.duplicate_groups;

    updateDjBadges(scanRes.detected_libraries);

    appendLog(`Analizados ${scanRes.total_tracks_found} archivos de audio compatibles.`, true);
    appendLog(`Evaluando decisiones según el criterio seleccionado...`);

    const decisions = await invoke("compute_decisions", {
      groups: currentDuplicateGroups,
      criterion: criterion,
      protectCues: protectCues,
    });
    currentDecisions = decisions;

    let redundantFiles = 0;
    decisions.forEach(d => { redundantFiles += d.discard.length; });

    statTotal.innerText = scanRes.total_tracks_found.toLocaleString();
    statGroups.innerText = decisions.length.toLocaleString();
    statRedundant.innerText = redundantFiles.toLocaleString();
    statsRow.style.display = "flex";

    updateReclaimableMetrics();

    progressFill.style.width = "100%";
    progressPercent.innerText = "100%";
    progressTitle.innerText = "¡Escaneo completado!";
    progressFilename.innerText = `${decisions.length} grupos de duplicados listos para revisar.`;
    if (macSpinner) macSpinner.style.display = "none";

    appendLog(`Proceso finalizado con éxito: ${decisions.length} grupos duplicados identificados.`, true);

    renderDecisions(decisions);

    // En pantallas pequeñas o con panel de actividad visible, asegurar que la lista de canciones sea visible
    setTimeout(() => {
      const resultsContainer = document.getElementById("results-container");
      if (resultsContainer) {
        resultsContainer.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 150);

    statusMsg.innerText = `Escaneo finalizado: ${scanRes.total_tracks_found} canciones analizadas, ${decisions.length} grupos de duplicados detectados.`;
  } catch (err) {
    console.error(err);
    showNoticeModal({
      title: "Error durante el escaneo",
      icon: "❌",
      text: escapeHtml(String(err)),
    });
    statusMsg.innerText = "Error: " + err;
    appendLog(`❌ ERROR: ${err}`, true);
  } finally {
    btnScan.disabled = false;
    scanIcon.innerText = "🔍";
    scanText.innerText = t("btn_scan");
    if (macSpinner) macSpinner.style.display = "none";
  }
});

// Re-computar decisiones cuando cambia la protección de Hot Cues
protectCuesCheckbox.addEventListener("change", async () => {
  if (currentDuplicateGroups.length === 0) return;
  try {
    statusMsg.innerText = "Re-evaluando decisiones con los ajustes de Hot Cues...";
    const criterion = criterionSelect ? criterionSelect.value : "quality";
    const decisions = await invoke("compute_decisions", {
      groups: currentDuplicateGroups,
      criterion: criterion,
      protectCues: protectCuesCheckbox.checked,
    });
    currentDecisions = decisions;
    let redundantFiles = 0;
    decisions.forEach(d => { redundantFiles += d.discard.length; });
    statRedundant.innerText = redundantFiles.toLocaleString();
    updateReclaimableMetrics();
    renderDecisions(decisions);
    statusMsg.innerText = "Decisiones actualizadas.";
  } catch (err) {
    console.error(err);
  }
});

// Exportar CSV
btnExportCsv.addEventListener("click", async () => {
  if (currentDecisions.length === 0) return;
  const csvPath = `${currentRootPath}/informe_duplicados_${Date.now()}.csv`;
  try {
    const msg = await invoke("export_csv_report", {
      rootDir: currentRootPath,
      decisions: currentDecisions,
      outputPath: csvPath,
    });
    showNoticeModal({
      title: "Informe Exportado",
      icon: "📄",
      text: "El informe CSV ha sido generado correctamente.",
      detail1: `📁 <strong>Archivo:</strong> <code>${escapeHtml(csvPath)}</code>`,
    });
    appendLog(`Informe CSV exportado a: ${csvPath}`, true);
  } catch (err) {
    showNoticeModal({
      title: "Error exportando CSV",
      icon: "❌",
      text: escapeHtml(String(err)),
    });
  }
});

// Botón Mover Duplicados (con Modal, selector Papelera/Cuarentena y barra de progreso)
btnApplyQuarantine.addEventListener("click", () => {
  if (currentDecisions.length === 0) {
    showNoticeModal({
      title: "Sin duplicados",
      icon: "ℹ️",
      text: "No hay canciones duplicadas pendientes de procesar.",
    });
    return;
  }

  const count = currentDecisions.reduce((acc, d) => acc + d.discard.length, 0);
  const totalReclaimable = currentDecisions.reduce((acc, d) => {
    return acc + d.discard.reduce((s, disc) => s + (disc.track.file_size_bytes || 0), 0);
  }, 0);
  const formattedReclaimable = formatBytes(totalReclaimable);

  modalIcon.innerText = "🗑️";
  modalTitle.innerText = "Eliminar / Trasladar Duplicados";
  modalText.innerHTML = `Se han detectado <strong>${count.toLocaleString()} canciones duplicadas</strong> prescindibles (<strong>${formattedReclaimable} de espacio recuperable</strong>).<br>Elige qué deseas hacer con ellas:`;

  modalModeOptions.style.display = "flex";
  if (engineSyncCard) {
    if (currentEngineStatus && currentEngineStatus.has_engine_dj) {
      engineSyncCard.style.display = "block";
    } else {
      engineSyncCard.style.display = "none";
    }
  }
  if (rekordboxSyncCard) {
    if (currentRekordboxStatus && currentRekordboxStatus.has_rekordbox) {
      rekordboxSyncCard.style.display = "block";
    } else {
      rekordboxSyncCard.style.display = "none";
    }
  }
  modalActionProgress.style.display = "none";
  modalInfoBox.style.display = "block";
  if (modalBtnOpenTrash) modalBtnOpenTrash.style.display = "none";
  modalDetail1.innerHTML = `💾 <strong>Unidad afectada:</strong> <code>${escapeHtml(currentRootPath)}</code>`;
  modalDetail2.innerHTML = `🛡️ Tus canciones de mayor calidad y tus metadatos DJ (Hot Cues / Playlists) se conservan intactos.`;

  const newConfirm = modalBtnConfirm.cloneNode(true);
  const newCancel = modalBtnCancel.cloneNode(true);
  newConfirm.innerText = `Ejecutar (${count} archivos)`;
  newConfirm.className = "btn btn-danger";
  newCancel.style.display = "inline-flex";

  modalBtnConfirm.parentNode.replaceChild(newConfirm, modalBtnConfirm);
  modalBtnCancel.parentNode.replaceChild(newCancel, modalBtnCancel);
  modalBtnConfirm = newConfirm;
  modalBtnCancel = newCancel;

  modalBtnCancel.addEventListener("click", () => {
    customModal.style.display = "none";
  });

  modalBtnConfirm.addEventListener("click", async () => {
    const selectedMode = radioTrash.checked ? "trash" : "quarantine";
    const modeName = selectedMode === "trash" ? "la Papelera del Sistema" : "la Carpeta de Cuarentena";
    const shouldSyncEngine = checkSyncEngine && checkSyncEngine.checked && currentEngineStatus && currentEngineStatus.has_engine_dj;
    const shouldSyncRekordbox = checkSyncRekordbox && checkSyncRekordbox.checked && currentRekordboxStatus && currentRekordboxStatus.has_rekordbox;

    // Si se va a sincronizar con Engine DJ, verificar primero si la aplicación está abierta
    if (shouldSyncEngine) {
      try {
        const status = await invoke("check_engine_status", { rootDir: currentRootPath });
        if (status.is_running) {
          showNoticeModal({
            title: "Engine DJ está en ejecución",
            icon: "⚠️",
            text: "Por favor <strong>cierra la aplicación Engine DJ</strong> en tu Mac antes de continuar para que podamos sincronizar tus playlists y la base de datos <code>m.db</code> de forma segura y sin conflictos.",
          });
          return;
        }
      } catch (e) {
        console.warn(e);
      }
    }

    // Si se va a sincronizar con Rekordbox, verificar primero si la aplicación está abierta
    if (shouldSyncRekordbox) {
      try {
        const status = await invoke("check_rekordbox_status", { rootDir: currentRootPath });
        if (status.is_running) {
          showNoticeModal({
            title: "Rekordbox está en ejecución",
            icon: "⚠️",
            text: "Por favor <strong>cierra la aplicación Rekordbox</strong> en tu Mac antes de continuar para que podamos sincronizar las listas de cabina en <code>export.pdb</code> de forma segura.",
          });
          return;
        }
      } catch (e) {
        console.warn(e);
      }
    }

    // Pasar el modal a modo progreso
    modalModeOptions.style.display = "none";
    if (engineSyncCard) engineSyncCard.style.display = "none";
    if (rekordboxSyncCard) rekordboxSyncCard.style.display = "none";
    modalInfoBox.style.display = "none";
    modalActionProgress.style.display = "block";
    modalActionBar.style.width = "0%";
    modalActionPct.innerText = "0%";
    modalActionFile.innerText = `Iniciando traslado a ${modeName}...`;
    modalActionCount.innerText = `0 / ${count.toLocaleString()} archivos`;

    modalBtnCancel.style.display = "none";
    modalBtnConfirm.disabled = true;
    modalBtnConfirm.innerText = "Procesando...";

    statusMsg.innerText = `Moviendo archivos a ${modeName}...`;
    appendLog(`Iniciando operación de limpieza de ${count} archivos hacia ${modeName}...`, true);

    try {
      const result = await invoke("apply_quarantine", {
        rootDir: currentRootPath,
        decisions: currentDecisions,
        mode: selectedMode,
        dryRun: false,
      });

      const movedCount = result.total_moved;
      const destSummary = result.destination_summary;
      const bytesFreed = result.formatted_bytes_freed || formatBytes(result.total_bytes_freed);

      appendLog(`✅ ¡Operación finalizada! ${movedCount} archivos (${bytesFreed}) trasladados a: ${destSummary}`, true);

      // Sincronización inteligente con Engine DJ
      let engineSyncResult = null;
      if (shouldSyncEngine) {
        modalActionFile.innerText = "Sincronizando playlists y limpiando m.db de Engine DJ...";
        try {
          engineSyncResult = await invoke("sync_engine_duplicates", {
            rootDir: currentRootPath,
            decisions: currentDecisions,
          });
          if (engineSyncResult) {
            appendLog(`🎧 Engine DJ: ${engineSyncResult.relinked_playlists_count} pistas re-vinculadas en playlists y ${engineSyncResult.purged_count} duplicados purgados de m.db. Respaldo: ${engineSyncResult.backup_path}`, true);
          }
        } catch (e) {
          console.warn("Error en sync_engine_duplicates:", e);
          appendLog(`⚠️ Advertencia al sincronizar Engine DJ: ${e}`, true);
        }
      }

      // Sincronización inteligente con Rekordbox / Cabina Pioneer
      let rekordboxSyncResult = null;
      if (shouldSyncRekordbox) {
        modalActionFile.innerText = "Sincronizando playlists en export.pdb de Cabina Pioneer...";
        try {
          rekordboxSyncResult = await invoke("sync_rekordbox_duplicates", {
            rootDir: currentRootPath,
            decisions: currentDecisions,
          });
          if (rekordboxSyncResult) {
            appendLog(`💿 Cabina Pioneer / Rekordbox: ${rekordboxSyncResult.relinked_playlists_count} pistas re-vinculadas en playlists de export.pdb. Respaldo: ${rekordboxSyncResult.backup_path}`, true);
          }
        } catch (e) {
          console.warn("Error en sync_rekordbox_duplicates:", e);
          appendLog(`⚠️ Advertencia al sincronizar Rekordbox: ${e}`, true);
        }
      }

      statusMsg.innerText = `Completado: ${movedCount} archivos (${bytesFreed}) procesados.`;

      // Reproducir el efecto de sonido configurado
      playDedupeSound();

      let djDetailHtml = "";
      if (engineSyncResult && (engineSyncResult.relinked_playlists_count > 0 || engineSyncResult.purged_count > 0)) {
        djDetailHtml += `<br>🎧 <strong>Engine DJ sincronizado:</strong> ${engineSyncResult.relinked_playlists_count} temas re-vinculados en playlists y ${engineSyncResult.purged_count} pistas descartadas eliminadas de <code>m.db</code>.`;
      }
      if (rekordboxSyncResult && rekordboxSyncResult.relinked_playlists_count > 0) {
        djDetailHtml += `<br>💿 <strong>Cabina Rekordbox sincronizada:</strong> ${rekordboxSyncResult.relinked_playlists_count} temas re-vinculados en playlists de <code>export.pdb</code> (listas de cabina intactas).`;
      }

      // Modal de éxito
      showNoticeModal({
        title: "¡Limpieza Completada con Éxito!",
        icon: "🎉",
        text: `Se han trasladado <strong>${movedCount.toLocaleString()} archivos</strong> (<strong>${bytesFreed} recuperados</strong>) a <strong>${escapeHtml(destSummary)}</strong>.`,
        detail1: (selectedMode === "trash"
          ? `📦 <strong>Ubicación en Papelera:</strong> Todos los archivos se han agrupado en una sola carpeta para mantener tu papelera organizada.<br>🗑️ <strong>Para recuperar los ${bytesFreed}:</strong> Vacía la Papelera de tu Mac con la unidad conectada.<br><button id="btn-open-trash-link" class="btn btn-secondary" style="margin-top: 8px; font-size: 12px; padding: 5px 12px; cursor: pointer;">📂 Abrir Papelera en Finder</button>`
          : `📁 <strong>Carpeta protegida:</strong> <code>${escapeHtml(destSummary)}</code>`) + djDetailHtml,
        detail2: `Las versiones de mejor calidad y todos tus datos DJ siguen en su lugar.`,
        showOpenTrash: selectedMode === "trash",
      });

      // Limpiar tabla tras ejecución
      resultsList.innerHTML = "";
      emptyState.style.display = "flex";
      emptyState.querySelector("h3").innerText = "Limpieza completada con éxito";
      emptyState.querySelector("p").innerText = `Se limpiaron ${movedCount} canciones duplicadas (${bytesFreed} liberados).`;
      actionsRight.style.display = "none";

      statRedundant.innerText = "0";
      if (statReclaimableSpace) statReclaimableSpace.innerText = "0 MB";
      if (storageFreedPill) storageFreedPill.style.display = "none";
      if (storageBarReclaim) storageBarReclaim.style.width = "0%";

      // Actualizar inmediatamente la capacidad de la unidad
      updateStorageWidget(currentRootPath);
    } catch (err) {
      console.error("Error en operación:", err);
      appendLog(`❌ Error: ${err}`, true);
      showNoticeModal({
        title: "Error durante la operación",
        icon: "❌",
        text: `Ocurrió un error al procesar los archivos: ${escapeHtml(String(err))}`,
      });
    }
  });

  customModal.style.display = "flex";
});

// ==========================================================================
// Listeners y Ciclo de Vida del Modal de Configuración y Sonido
// ==========================================================================

// Abrir modal de configuración guardando instantánea para revertir si se cancela
function openSettingsModal() {
  loadSettingsFromStorage();
  savedSettingsSnapshot = { ...soundSettings };
  applySettingsToForm(soundSettings);
  settingsModal.style.display = "flex";
}

// Cerrar descartando cualquier cambio temporal
function closeSettingsWithoutSaving() {
  if (!settingsModal || settingsModal.style.display === "none") return;
  if (savedSettingsSnapshot) {
    soundSettings = { ...savedSettingsSnapshot };
    applySettingsToForm(soundSettings);
    applyAppLanguage(soundSettings.language || "es");
    if (protectCuesCheckbox) protectCuesCheckbox.checked = soundSettings.protectCuesDefault;
  }
  settingsModal.style.display = "none";
  savedSettingsSnapshot = null;
}

// Guardar los cambios confirmados y cerrar
function saveAndCloseSettings() {
  const chosenLang = settingLanguageChoice ? settingLanguageChoice.value : (soundSettings.language || "es");
  soundSettings = {
    enabled: settingSoundEnabled ? settingSoundEnabled.checked : true,
    sound: settingSoundChoice ? settingSoundChoice.value : "trash",
    volume: settingSoundVolume ? parseFloat(settingSoundVolume.value) / 100 : 0.85,
    protectCuesDefault: settingProtectCuesDefault ? settingProtectCuesDefault.checked : true,
    language: chosenLang,
  };
  if (protectCuesCheckbox) {
    protectCuesCheckbox.checked = soundSettings.protectCuesDefault;
  }
  applyAppLanguage(chosenLang);
  saveSettingsToStorage();
  settingsModal.style.display = "none";
  savedSettingsSnapshot = null;
  appendLog(t("log_settings_saved") || "⚙️ Configuración y preferencias guardadas con éxito.", true);
}

if (settingLanguageChoice) {
  settingLanguageChoice.addEventListener("change", (e) => {
    applyAppLanguage(e.target.value);
  });
}

if (btnOpenSettings) {
  btnOpenSettings.addEventListener("click", openSettingsModal);
}

if (btnCloseSettings) {
  btnCloseSettings.addEventListener("click", saveAndCloseSettings);
}

if (btnCancelSettings) {
  btnCancelSettings.addEventListener("click", closeSettingsWithoutSaving);
}

if (btnXSettings) {
  btnXSettings.addEventListener("click", closeSettingsWithoutSaving);
}

// Clic fuera del diálogo de configuración para salir sin guardar
if (settingsModal) {
  settingsModal.addEventListener("click", (e) => {
    if (e.target === settingsModal) {
      closeSettingsWithoutSaving();
    }
  });
}

// Clic fuera del diálogo de confirmación/aviso
if (customModal) {
  customModal.addEventListener("click", (e) => {
    if (e.target === customModal) {
      if (modalActionProgress && modalActionProgress.style.display === "none") {
        customModal.style.display = "none";
      }
    }
  });
}

// Clic fuera del diálogo de Engine DJ
if (engineModal) {
  engineModal.addEventListener("click", (e) => {
    if (e.target === engineModal) {
      if (enginePurgeProgress && enginePurgeProgress.style.display === "none") {
        closeEngineModal();
      }
    }
  });
}

// Tecla Escape (Esc) para salir de los modales sin guardar
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" || e.key === "Esc") {
    if (settingsModal && settingsModal.style.display !== "none") {
      e.preventDefault();
      closeSettingsWithoutSaving();
    } else if (engineModal && engineModal.style.display !== "none") {
      if (enginePurgeProgress && enginePurgeProgress.style.display === "none") {
        e.preventDefault();
        closeEngineModal();
      }
    } else if (rekordboxModal && rekordboxModal.style.display !== "none") {
      if (rekordboxPurgeProgress && rekordboxPurgeProgress.style.display === "none") {
        e.preventDefault();
        closeRekordboxModal();
      }
    } else if (customModal && customModal.style.display !== "none") {
      if (modalActionProgress && modalActionProgress.style.display === "none") {
        e.preventDefault();
        customModal.style.display = "none";
      }
    }
  }
});

// Probar sonido con los controles actuales sin persistir hasta que se guarde
if (btnTestSound) {
  btnTestSound.addEventListener("click", () => {
    const vol = settingSoundVolume ? parseFloat(settingSoundVolume.value) / 100 : 0.85;
    const sound = settingSoundChoice ? settingSoundChoice.value : "trash";
    playDedupeSound(sound, vol);
  });
}

if (settingSoundVolume) {
  settingSoundVolume.addEventListener("input", (e) => {
    if (volumeValText) volumeValText.innerText = `${e.target.value}%`;
  });
  settingSoundVolume.addEventListener("change", (e) => {
    const vol = parseFloat(e.target.value) / 100;
    const sound = settingSoundChoice ? settingSoundChoice.value : "trash";
    playDedupeSound(sound, vol);
  });
}

if (settingSoundChoice) {
  settingSoundChoice.addEventListener("change", (e) => {
    const vol = settingSoundVolume ? parseFloat(settingSoundVolume.value) / 100 : 0.85;
    playDedupeSound(e.target.value, vol);
  });
}

// ==========================================================================
// Integración con Engine DJ (Detección, Pistas Rojas y Sincronización)
// ==========================================================================

async function checkEngineDjStatus(rootPath) {
  if (!rootPath) return;
  try {
    const status = await invoke("check_engine_status", { rootDir: rootPath });
    currentEngineStatus = status;

    if (status.has_engine_dj) {
      badgeEngine.classList.add("active");
      badgeEngine.style.cursor = "pointer";
      if (btnEngineClean) btnEngineClean.style.display = "inline-flex";
      loadEngineMissingSummary(rootPath);
    } else {
      badgeEngine.classList.remove("active");
      badgeEngine.style.cursor = "default";
      if (btnEngineClean) btnEngineClean.style.display = "none";
      if (engineToolbarCount) engineToolbarCount.style.display = "none";
    }
  } catch (err) {
    console.warn("Error al comprobar estado de Engine DJ:", err);
  }
}

async function loadEngineMissingSummary(rootPath) {
  if (!rootPath) return;
  try {
    const missing = await invoke("get_engine_missing_tracks", { rootDir: rootPath });
    currentEngineMissingTracks = missing || [];

    if (engineToolbarCount) {
      if (currentEngineMissingTracks.length > 0) {
        engineToolbarCount.innerText = currentEngineMissingTracks.length > 999 
          ? `${(currentEngineMissingTracks.length / 1000).toFixed(1)}k`
          : currentEngineMissingTracks.length;
        engineToolbarCount.style.display = "inline-flex";
        btnEngineClean.title = `Engine DJ: ${currentEngineMissingTracks.length.toLocaleString()} pistas huérfanas (rojas) detectadas. Clic para limpiar.`;
      } else {
        engineToolbarCount.style.display = "none";
        btnEngineClean.title = "Engine DJ: Colección sincronizada (0 pistas rojas)";
      }
    }
  } catch (err) {
    console.warn("Error leyendo pistas rojas de Engine DJ:", err);
  }
}

async function openEngineModal() {
  if (!currentRootPath) return;
  engineModal.style.display = "flex";
  engineDbPathText.innerText = currentEngineStatus.db_path || "m.db";
  enginePurgeProgress.style.display = "none";

  // Re-evaluar si Engine DJ está corriendo en vivo
  try {
    const status = await invoke("check_engine_status", { rootDir: currentRootPath });
    currentEngineStatus = status;
    if (status.is_running) {
      engineRunningAlert.style.display = "flex";
      btnConfirmPurgeEngine.disabled = true;
    } else {
      engineRunningAlert.style.display = "none";
      btnConfirmPurgeEngine.disabled = false;
    }
  } catch (e) {
    console.warn(e);
  }

  // Cargar tabla de pistas rojas
  engineTracksTbody.innerHTML = `<tr><td colspan="3" class="engine-empty-td">Buscando pistas huérfanas en Engine DJ...</td></tr>`;
  engineMissingCount.innerText = "...";
  engineTracksCountLabel.innerText = "...";

  try {
    const missing = await invoke("get_engine_missing_tracks", { rootDir: currentRootPath });
    currentEngineMissingTracks = missing || [];
    const count = currentEngineMissingTracks.length;

    engineMissingCount.innerText = count.toLocaleString();
    engineTracksCountLabel.innerText = `${count.toLocaleString()} pistas`;

    if (btnConfirmPurgeText) {
      btnConfirmPurgeText.innerText = t("btn_clean_collection");
    }

    if (count === 0) {
      engineTracksTbody.innerHTML = `<tr><td colspan="3" class="engine-empty-td" style="color: var(--apple-green);">✨ ¡Enhorabuena! No hay pistas rojas ni huérfanas en tu biblioteca de Engine DJ.</td></tr>`;
      btnConfirmPurgeEngine.disabled = true;
      return;
    }

    if (!currentEngineStatus.is_running) {
      btnConfirmPurgeEngine.disabled = false;
    }

    // Renderizar hasta 250 filas en la vista previa para máxima fluidez
    const previewList = currentEngineMissingTracks.slice(0, 250);
    let html = "";
    previewList.forEach(t => {
      const plBadges = t.in_playlists && t.in_playlists.length > 0
        ? t.in_playlists.map(pl => `<span class="engine-pl-badge">${escapeHtml(pl)}</span>`).join(" ")
        : `<span style="color: #888; font-size: 10.5px;">(Solo en Colección)</span>`;

      html += `
        <tr>
          <td>
            <strong class="engine-track-title">${escapeHtml(t.title || t.filename || "Sin título")}</strong>
            <span class="engine-track-file">${escapeHtml(t.filename || t.db_path)}</span>
          </td>
          <td>${escapeHtml(t.artist || "Desconocido")}</td>
          <td>${plBadges}</td>
        </tr>
      `;
    });

    if (count > 250) {
      html += `<tr><td colspan="3" class="engine-empty-td">... y ${count - 250} pistas más detectadas en la base de datos.</td></tr>`;
    }

    engineTracksTbody.innerHTML = html;
  } catch (err) {
    console.error("Error al cargar pistas en el modal:", err);
    engineTracksTbody.innerHTML = `<tr><td colspan="3" class="engine-empty-td" style="color: var(--apple-red);">Error al leer pistas: ${escapeHtml(String(err))}</td></tr>`;
  }
}

function closeEngineModal() {
  if (enginePurgeProgress && enginePurgeProgress.style.display !== "none") return;
  engineModal.style.display = "none";
}

if (btnEngineClean) {
  btnEngineClean.addEventListener("click", openEngineModal);
}

if (badgeEngine) {
  badgeEngine.addEventListener("click", () => {
    if (currentEngineStatus && currentEngineStatus.has_engine_dj) {
      openEngineModal();
    }
  });
}

if (btnXEngine) btnXEngine.addEventListener("click", closeEngineModal);
if (btnCancelEngine) btnCancelEngine.addEventListener("click", closeEngineModal);

if (btnRecheckEngineRunning) {
  btnRecheckEngineRunning.addEventListener("click", async () => {
    btnRecheckEngineRunning.innerText = "Comprobando...";
    try {
      const status = await invoke("check_engine_status", { rootDir: currentRootPath });
      currentEngineStatus = status;
      if (status.is_running) {
        engineRunningAlert.style.display = "flex";
        btnConfirmPurgeEngine.disabled = true;
      } else {
        engineRunningAlert.style.display = "none";
        btnConfirmPurgeEngine.disabled = currentEngineMissingTracks.length === 0;
      }
    } catch (e) {
      console.warn(e);
    } finally {
      btnRecheckEngineRunning.innerText = "Comprobar de nuevo";
    }
  });
}

if (btnConfirmPurgeEngine) {
  btnConfirmPurgeEngine.addEventListener("click", async () => {
    if (currentEngineMissingTracks.length === 0) return;

    // Verificar si Engine DJ está corriendo
    const status = await invoke("check_engine_status", { rootDir: currentRootPath });
    if (status.is_running) {
      engineRunningAlert.style.display = "flex";
      btnConfirmPurgeEngine.disabled = true;
      return;
    }

    const count = currentEngineMissingTracks.length;
    btnConfirmPurgeEngine.disabled = true;
    btnCancelEngine.disabled = true;
    enginePurgeProgress.style.display = "block";
    enginePurgeBar.style.width = "40%";
    enginePurgePct.innerText = "Purgando...";
    enginePurgeCount.innerText = `Purgando ${count.toLocaleString()} registros de m.db...`;

    try {
      appendLog(`🎧 Iniciando purga de ${count} pistas rojas en Engine DJ (${currentRootPath})...`, true);
      const res = await invoke("purge_engine_missing_tracks", {
        rootDir: currentRootPath,
        trackIds: null,
      });

      enginePurgeBar.style.width = "100%";
      enginePurgePct.innerText = "100%";

      // Reproducir sonido de confirmación
      playDedupeSound();

      appendLog(`✅ ¡Purga de Engine DJ completada! ${res.purged_count} pistas eliminadas. Respaldo creado en: ${res.backup_path}`, true);

      closeEngineModal();
      enginePurgeProgress.style.display = "none";
      btnConfirmPurgeEngine.disabled = false;
      btnCancelEngine.disabled = false;

      showNoticeModal({
        title: "¡Pistas Rojas Eliminadas con Éxito!",
        icon: "🎉",
        text: `Se han eliminado <strong>${res.purged_count.toLocaleString()} pistas huérfanas</strong> de tu base de datos de Engine DJ.`,
        detail1: `🛡️ <strong>Copia de seguridad previa guardada en:</strong><br><code>${escapeHtml(res.backup_path || "m.db.backup")}</code>`,
        detail2: `Al abrir Engine DJ en tu Mac o en tus equipos Denon (Prime 4, SC6000, etc.), tu colección y playlists estarán limpias y sin pistas rojas.`,
      });

      // Refrescar contador
      loadEngineMissingSummary(currentRootPath);
    } catch (err) {
      console.error("Error al purgar Engine DJ:", err);
      enginePurgeProgress.style.display = "none";
      btnConfirmPurgeEngine.disabled = false;
      btnCancelEngine.disabled = false;
      appendLog(`❌ Error al purgar Engine DJ: ${err}`, true);
      showNoticeModal({
        title: "Error al modificar Engine DJ",
        icon: "❌",
        text: `No se pudieron purgar las pistas de Engine DJ: ${escapeHtml(String(err))}`,
      });
    }
  });
}

// ==========================================================================
// Integración con Rekordbox / Cabina Pioneer (export.pdb)
// ==========================================================================

async function checkRekordboxStatus(rootPath) {
  if (!rootPath) return;
  try {
    const status = await invoke("check_rekordbox_status", { rootDir: rootPath });
    currentRekordboxStatus = status;

    if (status.has_rekordbox) {
      badgeRekordbox.classList.add("active");
      badgeRekordbox.style.cursor = "pointer";
      if (btnRekordboxClean) btnRekordboxClean.style.display = "inline-flex";
      loadRekordboxMissingSummary(rootPath);
    } else {
      badgeRekordbox.classList.remove("active");
      badgeRekordbox.style.cursor = "default";
      if (btnRekordboxClean) btnRekordboxClean.style.display = "none";
      if (rekordboxToolbarCount) rekordboxToolbarCount.style.display = "none";
    }
  } catch (err) {
    console.warn("Error al comprobar estado de Rekordbox:", err);
  }
}

async function loadRekordboxMissingSummary(rootPath) {
  if (!rootPath) return;
  try {
    const missing = await invoke("get_rekordbox_missing_tracks", { rootDir: rootPath });
    currentRekordboxMissingTracks = missing || [];

    if (rekordboxToolbarCount) {
      if (currentRekordboxMissingTracks.length > 0) {
        rekordboxToolbarCount.innerText = currentRekordboxMissingTracks.length > 999 
          ? `${(currentRekordboxMissingTracks.length / 1000).toFixed(1)}k`
          : currentRekordboxMissingTracks.length;
        rekordboxToolbarCount.style.display = "inline-flex";
        btnRekordboxClean.title = `Cabina Rekordbox: ${currentRekordboxMissingTracks.length.toLocaleString()} pistas huérfanas en export.pdb. Clic para limpiar.`;
      } else {
        rekordboxToolbarCount.style.display = "none";
        btnRekordboxClean.title = "Cabina Rekordbox: Base de datos de exportación sincronizada (0 pistas huérfanas)";
      }
    }
  } catch (err) {
    console.warn("Error leyendo pistas rojas de Rekordbox:", err);
  }
}

async function openRekordboxModal() {
  if (!currentRootPath) return;
  rekordboxModal.style.display = "flex";
  rekordboxDbPathText.innerText = currentRekordboxStatus.pdb_path || "export.pdb";
  rekordboxPurgeProgress.style.display = "none";

  try {
    const status = await invoke("check_rekordbox_status", { rootDir: currentRootPath });
    currentRekordboxStatus = status;
    if (status.is_running) {
      rekordboxRunningAlert.style.display = "flex";
      btnConfirmPurgeRekordbox.disabled = true;
    } else {
      rekordboxRunningAlert.style.display = "none";
      btnConfirmPurgeRekordbox.disabled = false;
    }
    if (rekordboxTotalTracks) {
      rekordboxTotalTracks.innerText = (status.total_tracks || 0).toLocaleString();
    }
  } catch (e) {
    console.warn(e);
  }

  rekordboxTracksTbody.innerHTML = `<tr><td colspan="3" class="engine-empty-td">Buscando pistas huérfanas en Rekordbox / export.pdb...</td></tr>`;
  rekordboxMissingCount.innerText = "...";
  rekordboxTracksCountLabel.innerText = "...";

  try {
    const missing = await invoke("get_rekordbox_missing_tracks", { rootDir: currentRootPath });
    currentRekordboxMissingTracks = missing || [];
    const count = currentRekordboxMissingTracks.length;

    rekordboxMissingCount.innerText = count.toLocaleString();
    rekordboxTracksCountLabel.innerText = `${count.toLocaleString()} pistas`;

    if (btnConfirmPurgeRekordboxText) {
      btnConfirmPurgeRekordboxText.innerText = t("btn_clean_collection");
    }

    if (count === 0) {
      rekordboxTracksTbody.innerHTML = `<tr><td colspan="3" class="engine-empty-td" style="color: var(--apple-green);">✨ ¡Todo listo para pinchar! No hay pistas huérfanas ni desaparecidas en tu base de datos Pioneer CDJ.</td></tr>`;
      btnConfirmPurgeRekordbox.disabled = true;
      return;
    }

    if (!currentRekordboxStatus.is_running) {
      btnConfirmPurgeRekordbox.disabled = false;
    }

    const previewList = currentRekordboxMissingTracks.slice(0, 250);
    let html = "";
    previewList.forEach(t => {
      const plBadges = t.in_playlists && t.in_playlists.length > 0
        ? t.in_playlists.map(pl => `<span class="engine-pl-badge">${escapeHtml(pl)}</span>`).join(" ")
        : `<span style="color: #888; font-size: 10.5px;">(Solo en Colección)</span>`;

      html += `
        <tr>
          <td>
            <strong class="engine-track-title">${escapeHtml(t.title || t.filename || "Sin título")}</strong>
            <span class="engine-track-file">${escapeHtml(t.filename || t.pdb_path)}</span>
          </td>
          <td>${escapeHtml(t.artist || "Desconocido")}</td>
          <td>${plBadges}</td>
        </tr>
      `;
    });

    if (count > 250) {
      html += `<tr><td colspan="3" class="engine-empty-td">... y ${count - 250} pistas más en la base de datos.</td></tr>`;
    }

    rekordboxTracksTbody.innerHTML = html;
  } catch (err) {
    console.error("Error al cargar pistas en modal de Rekordbox:", err);
    rekordboxTracksTbody.innerHTML = `<tr><td colspan="3" class="engine-empty-td" style="color: var(--apple-red);">Error al leer pistas: ${escapeHtml(String(err))}</td></tr>`;
  }
}

function closeRekordboxModal() {
  if (rekordboxPurgeProgress && rekordboxPurgeProgress.style.display !== "none") return;
  rekordboxModal.style.display = "none";
}

if (btnRekordboxClean) {
  btnRekordboxClean.addEventListener("click", openRekordboxModal);
}

if (badgeRekordbox) {
  badgeRekordbox.addEventListener("click", () => {
    if (currentRekordboxStatus && currentRekordboxStatus.has_rekordbox) {
      openRekordboxModal();
    }
  });
}

if (btnXRekordbox) btnXRekordbox.addEventListener("click", closeRekordboxModal);
if (btnCancelRekordbox) btnCancelRekordbox.addEventListener("click", closeRekordboxModal);

if (btnRecheckRekordboxRunning) {
  btnRecheckRekordboxRunning.addEventListener("click", async () => {
    btnRecheckRekordboxRunning.innerText = "Comprobando...";
    try {
      const status = await invoke("check_rekordbox_status", { rootDir: currentRootPath });
      currentRekordboxStatus = status;
      if (status.is_running) {
        rekordboxRunningAlert.style.display = "flex";
        btnConfirmPurgeRekordbox.disabled = true;
      } else {
        rekordboxRunningAlert.style.display = "none";
        btnConfirmPurgeRekordbox.disabled = currentRekordboxMissingTracks.length === 0;
      }
    } catch (e) {
      console.warn(e);
    } finally {
      btnRecheckRekordboxRunning.innerText = "Comprobar de nuevo";
    }
  });
}

if (btnConfirmPurgeRekordbox) {
  btnConfirmPurgeRekordbox.addEventListener("click", async () => {
    if (currentRekordboxMissingTracks.length === 0) return;

    const status = await invoke("check_rekordbox_status", { rootDir: currentRootPath });
    if (status.is_running) {
      rekordboxRunningAlert.style.display = "flex";
      btnConfirmPurgeRekordbox.disabled = true;
      return;
    }

    const count = currentRekordboxMissingTracks.length;
    btnConfirmPurgeRekordbox.disabled = true;
    btnCancelRekordbox.disabled = true;
    rekordboxPurgeProgress.style.display = "block";
    rekordboxPurgeBar.style.width = "40%";
    rekordboxPurgePct.innerText = "Purgando...";
    rekordboxPurgeCount.innerText = `Purgando ${count.toLocaleString()} entradas en export.pdb...`;

    try {
      appendLog(`💿 Iniciando purga de ${count} pistas huérfanas en export.pdb (${currentRootPath})...`, true);
      const res = await invoke("purge_rekordbox_missing_tracks", {
        rootDir: currentRootPath,
        trackIds: null,
      });

      rekordboxPurgeBar.style.width = "100%";
      rekordboxPurgePct.innerText = "100%";

      // Reproducir sonido de confirmación
      playDedupeSound();

      appendLog(`✅ ¡Purga de Rekordbox completada! ${res.purged_count} pistas eliminadas. Respaldo creado en: ${res.backup_path}`, true);

      closeRekordboxModal();
      rekordboxPurgeProgress.style.display = "none";
      btnConfirmPurgeRekordbox.disabled = false;
      btnCancelRekordbox.disabled = false;

      showNoticeModal({
        title: "¡Pistas Huérfanas de Cabina Limpiadas!",
        icon: "🎉",
        text: `Se han eliminado <strong>${res.purged_count.toLocaleString()} entradas de listas huérfanas</strong> de tu base de datos de exportación CDJ/Pioneer.`,
        detail1: `🛡️ <strong>Copia de seguridad previa guardada en:</strong><br><code>${escapeHtml(res.backup_path || "export.pdb.backup")}</code>`,
        detail2: `Al conectar este USB en cualquier reproductor Pioneer (CDJ-2000NXS, CDJ-3000, XDJ-XZ, etc.), las listas cargarán sin errores "TRACK NOT FOUND" ni pantallas rojas.`,
      });

      // Refrescar contador
      loadRekordboxMissingSummary(currentRootPath);
    } catch (err) {
      console.error("Error al purgar Rekordbox:", err);
      rekordboxPurgeProgress.style.display = "none";
      btnConfirmPurgeRekordbox.disabled = false;
      btnCancelRekordbox.disabled = false;
      appendLog(`❌ Error al purgar Rekordbox: ${err}`, true);
      showNoticeModal({
        title: "Error al modificar Rekordbox",
        icon: "❌",
        text: `No se pudieron purgar las pistas de Rekordbox: ${escapeHtml(String(err))}`,
      });
    }
  });
}

// Inicialización automática y escucha de eventos de Tauri
async function initApp() {
  loadSettingsFromStorage();
  let attempts = 20;
  while (attempts > 0) {
    if ((window.__TAURI__ && window.__TAURI__.core) || window.__TAURI_INTERNALS__) {
      break;
    }
    await new Promise(r => setTimeout(r, 50));
    attempts--;
  }

  // Configurar escucha de eventos de progreso en tiempo real
  if (window.__TAURI__ && window.__TAURI__.event && typeof window.__TAURI__.event.listen === "function") {
    try {
      await window.__TAURI__.event.listen("scan-progress", (event) => {
        handleScanProgress(event.payload);
      });
      await window.__TAURI__.event.listen("action-progress", (event) => {
        handleActionProgress(event.payload);
      });
    } catch (e) {
      console.warn("No se pudo registrar listener:", e);
    }
  }

  await loadDrives();
  initWindowDragging();
}

// Soporte de arrastre de ventana nativo y detección de plataforma (macOS / Windows)
function initWindowDragging() {
  const isWindows = navigator.userAgent.includes("Windows") || (navigator.platform && navigator.platform.includes("Win"));
  if (isWindows) {
    document.body.classList.add("platform-windows");
  } else {
    document.body.classList.add("platform-mac");
  }

  const topHeader = document.querySelector(".top-header");
  if (!topHeader) return;

  topHeader.addEventListener("mousedown", async (e) => {
    // Solo botón izquierdo del ratón
    if (e.button !== 0) return;

    // Ignorar si se hace clic en botones, selectores u otros elementos interactivos
    if (e.target.closest("button, select, input, a, .mac-segment, .mac-toolbar-btn, .modal-close-btn, [data-tauri-drag-region='false']")) {
      return;
    }

    // En doble clic, alternar maximizado nativo
    if (e.detail === 2) {
      if (window.__TAURI_INTERNALS__ && typeof window.__TAURI_INTERNALS__.invoke === "function") {
        try {
          await window.__TAURI_INTERNALS__.invoke("plugin:window|internal_toggle_maximize");
        } catch (_) {}
      }
      return;
    }

    // Iniciar arrastre programático garantizado en macOS
    try {
      if (window.__TAURI__ && window.__TAURI__.window && typeof window.__TAURI__.window.getCurrentWindow === "function") {
        const appWin = window.__TAURI__.window.getCurrentWindow();
        if (appWin && typeof appWin.startDragging === "function") {
          await appWin.startDragging();
          return;
        }
      }
      if (window.__TAURI_INTERNALS__ && typeof window.__TAURI_INTERNALS__.invoke === "function") {
        await window.__TAURI_INTERNALS__.invoke("plugin:window|start_dragging");
      }
    } catch (err) {
      console.debug("startDragging:", err);
    }
  });
}

window.addEventListener("DOMContentLoaded", initApp);
