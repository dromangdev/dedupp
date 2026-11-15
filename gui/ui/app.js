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
const btnResetDrive = document.getElementById("btn-reset-drive");
const currentPathText = document.getElementById("current-path-text");

const criterionSelect = document.getElementById("criterion-select");
const toleranceInput = document.getElementById("tolerance-input");
const protectCuesCheckbox = document.getElementById("protect-cues");
const btnScan = document.getElementById("btn-scan");
const scanText = document.getElementById("scan-text");
const scanIcon = document.getElementById("scan-icon");

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

let currentEngineStatus = { has_engine_dj: false, is_running: false, db_path: null };
let currentEngineMissingTracks = [];

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

let soundSettings = {
  enabled: true,
  sound: "trash",
  volume: 0.85,
  protectCuesDefault: true,
};

function applySettingsToForm(settings) {
  if (settingSoundEnabled) settingSoundEnabled.checked = settings.enabled;
  if (settingSoundChoice) settingSoundChoice.value = settings.sound;
  if (settingSoundVolume) {
    settingSoundVolume.value = Math.round(settings.volume * 100);
    if (volumeValText) volumeValText.innerText = `${Math.round(settings.volume * 100)}%`;
  }
  if (settingProtectCuesDefault) settingProtectCuesDefault.checked = settings.protectCuesDefault;
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
      if (btnResetDrive) btnResetDrive.style.display = "none";
      updateStorageWidget(defaultVal);
      checkEngineDjStatus(defaultVal);
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
  btnResetDrive.style.display = "none";
  updateStorageWidget(currentRootPath);
  checkEngineDjStatus(currentRootPath);
});

// Botón volver a escanear toda la unidad (en caso de haber elegido una subcarpeta)
btnResetDrive.addEventListener("click", () => {
  currentRootPath = driveSelect.value;
  currentPathText.innerText = currentRootPath;
  btnResetDrive.style.display = "none";
  statusMsg.innerText = `Ruta restablecida a toda la unidad: ${currentRootPath}`;
  appendLog(`Ruta activa restablecida a la raíz: ${currentRootPath}`);
  updateStorageWidget(currentRootPath);
  checkEngineDjStatus(currentRootPath);
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
      if (selected !== baseDrive) {
        btnResetDrive.style.display = "inline-flex";
      } else {
        btnResetDrive.style.display = "none";
      }

      statusMsg.innerText = `Subcarpeta seleccionada: ${selected}`;
      appendLog(`Subcarpeta seleccionada para escaneo: ${selected}`, true);
      updateStorageWidget(selected);
      checkEngineDjStatus(selected);
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
  scanText.innerText = "Escaneando...";

  progressPanel.style.display = "flex";
  logConsoleWrap.style.display = isLogVisible ? "flex" : "none";
  progressFill.style.width = "0%";
  progressPercent.innerText = "0%";
  progressTitle.innerText = `Analizando colección en ${path}...`;
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
    scanText.innerText = "Escanear y Previsualizar";
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

    // Pasar el modal a modo progreso
    modalModeOptions.style.display = "none";
    if (engineSyncCard) engineSyncCard.style.display = "none";
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

      statusMsg.innerText = `Completado: ${movedCount} archivos (${bytesFreed}) procesados.`;

      // Reproducir el efecto de sonido configurado
      playDedupeSound();

      let engineDetailHtml = "";
      if (engineSyncResult && (engineSyncResult.relinked_playlists_count > 0 || engineSyncResult.purged_count > 0)) {
        engineDetailHtml = `<br>🎧 <strong>Engine DJ sincronizado:</strong> ${engineSyncResult.relinked_playlists_count} temas re-vinculados en playlists y ${engineSyncResult.purged_count} pistas descartadas eliminadas de <code>m.db</code> (no aparecerán en rojo).`;
      }

      // Modal de éxito
      showNoticeModal({
        title: "¡Limpieza Completada con Éxito!",
        icon: "🎉",
        text: `Se han trasladado <strong>${movedCount.toLocaleString()} archivos</strong> (<strong>${bytesFreed} recuperados</strong>) a <strong>${escapeHtml(destSummary)}</strong>.`,
        detail1: (selectedMode === "trash"
          ? `📦 <strong>Ubicación en Papelera:</strong> Todos los archivos se han agrupado en una sola carpeta para mantener tu papelera organizada.<br>🗑️ <strong>Para recuperar los ${bytesFreed}:</strong> Vacía la Papelera de tu Mac con la unidad conectada.<br><button id="btn-open-trash-link" class="btn btn-secondary" style="margin-top: 8px; font-size: 12px; padding: 5px 12px; cursor: pointer;">📂 Abrir Papelera en Finder</button>`
          : `📁 <strong>Carpeta protegida:</strong> <code>${escapeHtml(destSummary)}</code>`) + engineDetailHtml,
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
    if (protectCuesCheckbox) protectCuesCheckbox.checked = soundSettings.protectCuesDefault;
  }
  settingsModal.style.display = "none";
  savedSettingsSnapshot = null;
}

// Guardar los cambios confirmados y cerrar
function saveAndCloseSettings() {
  soundSettings = {
    enabled: settingSoundEnabled ? settingSoundEnabled.checked : true,
    sound: settingSoundChoice ? settingSoundChoice.value : "trash",
    volume: settingSoundVolume ? parseFloat(settingSoundVolume.value) / 100 : 0.85,
    protectCuesDefault: settingProtectCuesDefault ? settingProtectCuesDefault.checked : true,
  };
  if (protectCuesCheckbox) {
    protectCuesCheckbox.checked = soundSettings.protectCuesDefault;
  }
  saveSettingsToStorage();
  settingsModal.style.display = "none";
  savedSettingsSnapshot = null;
  appendLog("⚙️ Configuración y preferencias guardadas con éxito.", true);
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
      btnConfirmPurgeText.innerText = count > 0 
        ? `Eliminar ${count.toLocaleString()} Pistas Rojas` 
        : `Eliminar Pistas Rojas`;
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

// Soporte de arrastre de ventana nativo en macOS
function initWindowDragging() {
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
