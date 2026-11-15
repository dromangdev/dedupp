# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y este proyecto se adhiere a [Semantic Versioning](https://semver.org/lang/es/).

---

## [Unreleased]
### Corregido
- **Ventana macOS**: Solucionado el problema que impedía mover la ventana arrastrándola desde la barra superior en macOS (habilitado permiso `core:window:allow-start-dragging` en el sistema de capacidades de Tauri v2, configurado `data-tauri-drag-region="deep"` y añadido manejador programático nativo).

### Próximos cambios planificados
- Módulo de análisis y limpieza de playlists huérfanas para Pioneer Rekordbox (bases `export.pdb` y `master.db`).

---

## [0.1.0] - 2026-11-15
### Añadido
- **Motor Core de Detección**:
  - Comparación inteligente de audio usando metadatos (`lofty`).
  - Margen de tolerancia de duración (por defecto $\pm 3.5$ segundos) para evitar eliminar mezclas distintas (*Radio Edit* vs *Extended Mix*).
  - Criterio unificado de calidad técnica: Lossless (FLAC, WAV, AIFF, ALAC) > MP3 320 kbps > AAC 256 kbps > MP3 192 kbps > menor bitrate, ponderando frecuencia de muestreo y profundidad de bits.
  - Criterio de desempate automático por versión más reciente (`mtime`).
- **Integración con Software DJ**:
  - **Engine DJ (Denon DJ / Engine OS)**:
    - Detección y mantenimiento directo de pistas huérfanas / rojas en `m.db`.
    - Re-vinculación automática de playlists hacia el tema ganador conservado.
    - Preservación de la lista enlazada secuencial (`nextEntityId`) mediante triggers nativos.
    - Copias de seguridad automáticas fechadas (`m.db.backup_*`) antes de cualquier modificación.
    - Detección en tiempo real de proceso activo para evitar conflictos de escritura.
  - **Serato DJ**: Detección de subcrates (`_Serato_/Subcrates/*.crate`) y marcadores de Cues ID3 (`GEOB:Serato Markers_`).
  - **Rekordbox**: Detección de directorios de exportación USB (`PIONEER/rekordbox`) y parseo de colecciones XML.
- **Interfaz Gráfica de Escritorio (Desktop GUI - Tauri v2)**:
  - Diseño estilo nativo macOS Dark Theme con tipografía San Francisco y controles responsive.
  - Widget interactivo de almacenamiento de unidad (espacio libre, ocupado y cálculo en tiempo real de espacio recuperable).
  - Panel de mantenimiento exclusivo para Engine DJ con vista previa de pistas y playlists afectadas.
  - Modal de confirmación con opciones de destino: Papelera del sistema (agrupados en carpeta fechada) o Cuarentena reversible (`.dedupp_quarantine/` con `manifest.json`).
  - Efectos de sonido configurables con Web Audio API y macOS nativo (Papelera clásica, Vinyl Scratch, Airhorn, Marimba armónica y Arcade Pop).
- **Herramienta CLI**:
  - Binario de terminal `dedupp` con flags para simulación (`--dry-run`), ejecución (`--apply`), selección de criterio y exportación de auditoría en CSV (`--export-csv`).
- **Empaquetado y Distribución**:
  - Instalador autónomo de macOS `.dmg` generado para Apple Silicon (`aarch64`) e incluido en `dist/Dedupp_0.1.0_aarch64.dmg`.
