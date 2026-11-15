# 🎧 Dedupp

**Dedupp** es una aplicación de alto rendimiento desarrollada en **Rust** para detectar, clasificar y limpiar canciones duplicadas en unidades USB, discos duros y librerías de música profesional, protegiendo la integridad de colecciones y metadatos de DJ (**Engine DJ, Serato y Rekordbox**).

Cuenta con una **Interfaz Gráfica de Escritorio (Desktop GUI con Tauri v2)** con diseño nativo de macOS dark theme y una **Línea de Comandos (CLI)** rápida y eficiente. Es totalmente multiplataforma (**macOS y Windows**).

---

## 📥 Descarga e Instalación Directa (Sin compilar)

No necesitas instalar Rust ni herramientas de desarrollo. Puedes descargar el instalador oficial y comenzar a usarlo de inmediato:

| Plataforma | Arquitectura | Instalador Listo para Usar |
| :--- | :--- | :--- |
| 🍏 **macOS** (Apple Silicon M1 / M2 / M3 / M4) | `aarch64` | [📦 **Descargar Dedupp v0.2.0 (.dmg)**](https://github.com/dromangdev/dedupp/raw/main/dist/Dedupp_0.2.0_aarch64.dmg) |

### Cómo instalar en macOS:
1. Haz clic en el enlace para descargar [**Dedupp_0.2.0_aarch64.dmg**](https://github.com/dromangdev/dedupp/raw/main/dist/Dedupp_0.2.0_aarch64.dmg) (o encuéntralo en la carpeta `dist/` del repositorio).
2. Abre el archivo `.dmg` con doble clic.
3. Arrastra **Dedupp** a tu carpeta de **Aplicaciones**.
4. ¡Listo! Ya puedes abrir Dedupp desde Spotlight (`Cmd + Espacio`), Launchpad o tu Dock.

---

## ✨ Características Principales

1. **Criterio Inteligente Unificado de Calidad de Audio**:
   - 💎 **Máxima Fidelidad**: Clasificación técnica automática: Lossless (FLAC, WAV, AIFF, ALAC) > MP3 320 kbps > AAC 256 kbps > MP3 192 kbps > Bitrates inferiores.
   - Ponderación avanzada por frecuencia de muestreo (96 kHz / 48 kHz vs 44.1 kHz) y profundidad de bits (24-bit vs 16-bit).
   - En caso de empate en calidad técnica, desempata automáticamente por la versión más reciente (`mtime`).

2. **Integración Completa con Software de DJ y Cabinas**:
   - 💿 **Pioneer Rekordbox (Cabina CDJ / XDJ - `export.pdb` & `exportExt.pdb`)**:
     - **Prevención de *"TRACK NOT FOUND"* en Cabina**: Inspecciona directamente la base de datos DeviceSQL del pendrive/disco USB de Rekordbox y localiza pistas faltantes o enlaces rotos antes de llegar al club o evento.
     - **Re-vinculación Atómica de Playlists**: Sustituye automáticamente en las listas del USB las pistas duplicadas eliminadas por la versión ganadora de mayor calidad a nivel de bytes, sin perder cues ni orden.
     - **Purga Segura de Huérfanas**: Limpia los registros de pistas desaparecidas con copias de seguridad fechadas (`export.pdb.backup_*`).
     - **Detección de Proceso Activo**: Comprueba si `rekordbox.app` está abierto para prevenir escrituras concurrentes.
     - **Panel Exclusivo en GUI**: Botón rápido *"Cabina Rekordbox"* en la barra de herramientas, contador en vivo y modal con vista previa de listas afectadas.
   - 🎧 **Engine DJ (Denon DJ / Engine OS)**:
     - **Mantenimiento y Purga de Pistas Rojas**: Detecta y elimina pistas huérfanas en la base de datos `m.db` cuyos archivos físicos han desaparecido.
     - **Re-vinculación Inteligente de Playlists**: Reemplaza automáticamente las pistas duplicadas eliminadas por la versión conservada de alta calidad, evitando huecos rotos y manteniendo el orden secuencial (`nextEntityId`).
     - **Copias de Seguridad Automáticas**: Genera respaldos fechados (`m.db.backup_*`) antes de cualquier escritura.
     - **Detección de Proceso Activo**: Protege la integridad de la base de datos avisando si Engine DJ está en ejecución.
   - 🎚️ **Serato DJ**: Lee subcrates (`_Serato_/Subcrates/*.crate`) y detecta etiquetas de cues ID3 directas (`GEOB:Serato Markers_`).
   - 📂 **Colecciones Rekordbox XML**: Parsea archivos `rekordbox.xml` exportados para proteger temas con Hot Cues y Memory Cues.

3. **Prevención de Falsos Positivos (Tolerancia de Duración)**:
   - Los temas con duraciones distintas jamás se confunden: un *Radio Edit* (3 min) y un *Extended Mix* (7 min) del mismo artista y título se conservan automáticamente gracias a un margen configurable ($\pm 3.5$ segundos por defecto).

4. **Eliminación Segura y Reversible**:
   - **Papelera del Sistema**: Agrupa todos los archivos eliminados en una única carpeta fechada dentro de la Papelera, manteniendo el sistema limpio y permitiendo recuperar espacio real en disco al vaciarla.
   - **Carpeta de Cuarentena**: Aísla los archivos en `.dedupp_quarantine/` junto con un archivo `manifest.json` para rollback completo.
   - **Exportación a CSV**: Genera informes detallados para auditoría antes o después de la limpieza.

5. **Experiencia de Usuario macOS & Efectos de Audio**:
   - Diseño moderno con paleta oscura nativa de macOS, tipografía San Francisco y soporte totalmente responsive para ventanas de cualquier tamaño.
   - Widget interactivo de almacenamiento de disco (espacio libre vs ocupado y cálculo en tiempo real de GB recuperables).
   - Efectos de sonido configurables con Web Audio API y audio nativo (Papelera clásica de macOS, Vinyl Scratch DJ, Airhorn, Marimba armónica y Arcade Pop).

---

## 📂 Estructura del Proyecto

```text
Dedupp/
├── Cargo.toml                  # Workspace raíz de Cargo
├── Cargo.lock                  # Bloqueo reproducible de dependencias
├── crates/
│   ├── core/                   # Motor de análisis de audio (lofty), agrupador y decision engine
│   ├── dj-libraries/           # Conectores nativos para Engine DJ (SQLite), Serato y Rekordbox
│   └── cli/                    # Herramienta de terminal (clap)
├── gui/                        # Interfaz gráfica de escritorio (Tauri v2)
│   ├── src-tauri/              # Backend Rust con comandos IPC y listeners
│   └── ui/                     # Frontend moderno (HTML5, CSS3, Vanilla JS)
├── run-cli.sh                  # Script rápido para ejecutar la CLI
└── run-gui.sh                  # Script rápido para lanzar la GUI
```

---

## 🚀 Puesta en Marcha y Compilación

### Requisitos Previos

- [Rust](https://rustup.rs/) (versión 1.90 o superior recomendada)
- macOS o Windows
- Bibliotecas del sistema para Tauri (en macOS no se requiere instalación adicional)

### 1. Iniciar la Interfaz Gráfica (Desktop GUI)

Para ejecutar la aplicación de escritorio en modo desarrollo:

```bash
cd Dedupp
./run-gui.sh
```

O compilando directamente con Cargo:

```bash
cargo run -p app
```

Para generar un paquete de producción (.dmg / instalador):

```bash
cargo tauri build
```

---

### 2. Uso de la Interfaz de Línea de Comandos (CLI)

#### Modo Simulación (por defecto, solo lectura y previsualización):
```bash
cargo run -p dedupp-cli -- /Volumes/MI_USB_DJ
```
O usando el script directo:
```bash
./run-cli.sh /Volumes/MI_USB_DJ
```

#### Seleccionar criterio de versión más reciente:
```bash
cargo run -p dedupp-cli -- /Volumes/MI_USB_DJ --criterion latest
```

#### Exportar un informe detallado a CSV:
```bash
cargo run -p dedupp-cli -- /Volumes/MI_USB_DJ --export-csv informe_duplicados.csv
```

#### Ejecutar la limpieza real (mover a cuarentena segura):
```bash
cargo run -p dedupp-cli -- /Volumes/MI_USB_DJ --apply
```

---

## 🧪 Pruebas Unitarias e Integración

El proyecto cuenta con una suite completa de pruebas unitarias que verifican la selección de calidad, separación de versiones, protección de Hot Cues y sincronización de base de datos Engine DJ:

```bash
cargo test
```

---

## 🔀 Flujo de Versionado y Desarrollo

El proyecto sigue [SemVer](https://semver.org/lang/es/) y el flujo de ramas de Git Flow:

- **`main`**: Rama de producción exclusiva para versiones estables y etiquetadas (`vX.Y.Z`). No se hacen commits directos sobre `main`.
- **`develop`**: Rama principal de desarrollo donde se integran las nuevas características y correcciones antes de publicar una versión.
- **`feature/*` / `fix/*`**: Ramas de trabajo para cambios específicos.
- **Historial de cambios**: Cada nueva versión debe registrarse detalladamente en [`CHANGELOG.md`](CHANGELOG.md) antes del merge a `main`.

---

## 📄 Licencia

Distribuido bajo la Licencia **MIT**. Consulta el archivo `LICENSE` para más detalles.
