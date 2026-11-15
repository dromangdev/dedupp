# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y este proyecto se adhiere a [Semantic Versioning](https://semver.org/lang/es/).

---

## [0.2.0] - 2026-11-15
### Añadido
- **Integración para Cabina Pioneer / Rekordbox (`export.pdb` & `exportExt.pdb`)**:
  - Soporte nativo y seguro para el formato DeviceSQL de pendrives y discos USB exportados para reproductores Pioneer CDJ / XDJ (CDJ-2000NXS2, CDJ-3000, XDJ-XZ, XDJ-RX3, OPUS-QUAD, etc.).
  - Detección precisa de pistas inexistentes en disco que causan el error *"TRACK NOT FOUND"* / *"LOAD ERROR"* en los reproductores de la cabina.
  - Re-vinculación atómica en playlists de Rekordbox: cuando Dedupp elimina o pone en cuarentena un duplicado de menor calidad, las listas de reproducción del USB son actualizadas a nivel de bytes para apuntar al ID de la pista conservada.
  - Purga segura de pistas huérfanas en el USB: actualización de máscaras de bits DeviceSQL y conteos de cabecera de página para que los CDJs ignoren limpiamente las pistas eliminadas sin corromper el árbol de playlists.
  - Copias de seguridad automáticas fechadas (`export.pdb.backup_YYYYMMDD_HHMMSS`) previas a cualquier escritura en el USB.
  - Comprobación en segundo plano de procesos activos (`rekordbox.app`) para prevenir bloqueos o escrituras concurrentes.
  - Interfaz de usuario dedicada: botón de acceso rápido *"Cabina Rekordbox"* en la barra de herramientas con contador dinámico de advertencias, modal de inspección previa con tabla de temas y playlists afectadas, barra de progreso y botón de purga segura.
  - Integración en el modal de deduplicación: opción de sincronizar y revincular automáticamente el USB de Rekordbox al aplicar la limpieza.
  - Integración con el CLI (`dedupp --apply`) para sincronizar `export.pdb` en modo consola.
- **Protección de Cues de Rekordbox en el Core**:
  - El escáner identifica pistas catalogadas en `export.pdb` para protegerlas bajo la política `--protect-cues`.

### Corregido
- **Ventana macOS**: Solucionado el problema que impedía mover la ventana arrastrándola desde la barra superior en macOS (habilitado permiso `core:window:allow-start-dragging` y `core:window:allow-start-resize-dragging` en el sistema de capacidades de Tauri v2, configurado `data-tauri-drag-region="deep"`, ajustado CSS para delegar eventos y añadido manejador programático nativo).

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
