# 🎧 Dedupp

**Dedupp** es una aplicación de alto rendimiento desarrollada en **Rust** para detectar, clasificar y limpiar canciones duplicadas en unidades USB, discos duros y librerías de música profesional, protegiendo la integridad de colecciones y metadatos de DJ (**Engine DJ, Serato y Rekordbox**).

Cuenta con una **Interfaz Gráfica de Escritorio (Desktop GUI con Tauri v2)** con diseño nativo de tema oscuro adaptativo y una **Línea de Comandos (CLI)** ultrarrápida. Es totalmente multiplataforma (**macOS, Windows y Linux**).

---

## 📥 Descarga e Instalación Directa (Sin compilar)

No necesitas instalar Rust ni herramientas de desarrollo. Puedes descargar los instaladores oficiales y comenzar a usarlo de inmediato:

| Plataforma | Arquitectura | Paquete / Instalador | Estado |
| :--- | :--- | :--- | :--- |
| 🍏 **macOS** (Apple Silicon M1 / M2 / M3 / M4) | `aarch64` | [📦 **Dedupp_0.3.0_aarch64.dmg**](https://github.com/dromangdev/dedupp/releases/download/v0.3.0/Dedupp_0.3.0_aarch64.dmg) | ✅ Estable |
| 🪟 **Windows** (Windows 10 / 11 de 64 bits) | `x64` | [📦 **Dedupp_0.3.0_x64-setup.exe**](https://github.com/dromangdev/dedupp/releases/download/v0.3.0/Dedupp_0.3.0_x64-setup.exe) / [📦 **MSI (.msi)**](https://github.com/dromangdev/dedupp/releases/download/v0.3.0/Dedupp_0.3.0_x64_en-US.msi) | ✅ Estable |
| 🐧 **Linux** (Universal para cualquier distribución) | `x64` | [📦 **Dedupp_0.3.0_amd64.AppImage**](https://github.com/dromangdev/dedupp/releases/download/v0.3.0/Dedupp_0.3.0_amd64.AppImage) | ✅ Estable |
| 🐧 **Linux** (Debian, Ubuntu, Mint) | `x64` | [📦 **Dedupp_0.3.0_amd64.deb**](https://github.com/dromangdev/dedupp/releases/download/v0.3.0/Dedupp_0.3.0_amd64.deb) | ✅ Estable |
| ⚡ **Linux CLI** (Binario standalone de terminal) | `x64` | [📦 **dedupp_0.3.0_linux_amd64.tar.gz**](https://github.com/dromangdev/dedupp/releases/download/v0.3.0/dedupp_0.3.0_linux_amd64.tar.gz) | ✅ Estable |
| ⚡ **macOS CLI** (Binario standalone de terminal) | `aarch64` | [📦 **dedupp_0.3.0_macos_aarch64.tar.gz**](https://github.com/dromangdev/dedupp/releases/download/v0.3.0/dedupp_0.3.0_macos_aarch64.tar.gz) | ✅ Estable |

---

### 🍏 Cómo instalar en macOS:
1. Descarga [**Dedupp_0.3.0_aarch64.dmg**](https://github.com/dromangdev/dedupp/releases/download/v0.3.0/Dedupp_0.3.0_aarch64.dmg).
2. Abre el archivo `.dmg` con doble clic.
3. Arrastra el icono de **Dedupp** a tu carpeta de **Aplicaciones**.
4. ¡Listo! Ábrelo desde Spotlight (`Cmd + Espacio`), Launchpad o el Dock.

### 🪟 Cómo instalar en Windows:
1. Descarga el instalador ejecutable [**`Dedupp_0.3.0_x64-setup.exe`**](https://github.com/dromangdev/dedupp/releases/download/v0.3.0/Dedupp_0.3.0_x64-setup.exe) (NSIS recomendado) o el paquete [**`Dedupp_0.3.0_x64_en-US.msi`**](https://github.com/dromangdev/dedupp/releases/download/v0.3.0/Dedupp_0.3.0_x64_en-US.msi).
2. Haz doble clic en el instalador y sigue el asistente paso a paso.
3. No requiere permisos de administrador (`installMode: currentUser`).
4. Abre **Dedupp** desde el Menú Inicio o el acceso directo de tu Escritorio.
> 💡 *Para más detalles específicos de Windows, consulta la [Guía de Windows](docs/WINDOWS.md).*

### 🐧 Cómo instalar en Linux:
- **Binario standalone de terminal CLI (Rápido, universal y sin dependencias gráficas)**:
  1. Descarga [**`dedupp_0.3.0_linux_amd64.tar.gz`**](https://github.com/dromangdev/dedupp/releases/download/v0.3.0/dedupp_0.3.0_linux_amd64.tar.gz).
  2. Descomprímelo y ejecútalo directamente:
     ```bash
     tar -xzvf dedupp_0.3.0_linux_amd64.tar.gz
     ./dedupp /media/$USER/MI_USB_DJ
     ```
  3. *(Opcional)* Instálalo en `/usr/local/bin` para tener el comando `dedupp` global:
     ```bash
     sudo install -m 755 dedupp /usr/local/bin/
     ```

- **Formato universal AppImage (Interfaz Gráfica)**:
  1. Descarga [**`Dedupp_0.3.0_amd64.AppImage`**](https://github.com/dromangdev/dedupp/releases/download/v0.3.0/Dedupp_0.3.0_amd64.AppImage).
  2. Dale permisos de ejecución y ejecútalo:
     ```bash
     chmod +x Dedupp_0.3.0_amd64.AppImage
     ./Dedupp_0.3.0_amd64.AppImage
     ```
- **Paquete Debian / Ubuntu / Mint (`.deb`)**:
  1. Descarga [**`Dedupp_0.3.0_amd64.deb`**](https://github.com/dromangdev/dedupp/releases/download/v0.3.0/Dedupp_0.3.0_amd64.deb).
  2. Instálalo desde la terminal:
     ```bash
     sudo dpkg -i Dedupp_0.3.0_amd64.deb || sudo apt-get install -f
     ```
> 💡 *Para requisitos del sistema y permisos en distribuciones como Fedora, Arch o openSUSE, consulta la [Guía de Linux](docs/LINUX.md).*

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

### Requisitos del Sistema por Plataforma

- **Todas las plataformas**: [Rust](https://rustup.rs/) (versión 1.90 o superior) y [Node.js](https://nodejs.org/) (v20+ recomendada).
- 🍏 **macOS**: Xcode Command Line Tools (`xcode-select --install`).
- 🪟 **Windows**: Visual Studio C++ Build Tools y WebView2 Runtime (instalado por defecto en Windows 10/11).
- 🐧 **Linux**: Dependencias de WebKitGTK y librerías de escritorio:
  ```bash
  # Debian / Ubuntu / Linux Mint
  sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf libdbus-1-dev pkg-config
  # Fedora
  sudo dnf install -y webkit2gtk4.1-devel libappindicator-gtk3-devel librsvg2-devel dbus-devel pkgconf-pkg-config
  # Arch Linux
  sudo pacman -S webkit2gtk-4.1 libappindicator-gtk3 librsvg dbus pkgconf
  ```

---

### 1. Iniciar la Interfaz Gráfica (Desktop GUI)

Para ejecutar la aplicación de escritorio en modo desarrollo:

```bash
cd Dedupp
# En macOS / Linux:
./run-gui.sh
# O mediante el CLI de Tauri en cualquier sistema:
cd gui && npx @tauri-apps/cli dev
```

Para generar un paquete binario de producción según tu sistema operativo:

```bash
cd gui && npx @tauri-apps/cli build
```
- En macOS generará: `target/release/bundle/dmg/*.dmg` y `.app`
- En Windows generará: `target/release/bundle/nsis/*.exe` y `msi/*.msi`
- En Linux generará: `target/release/bundle/deb/*.deb` y `appimage/*.AppImage`

---

### 2. Uso de la Interfaz de Línea de Comandos (CLI)

La herramienta de terminal (`dedupp`) funciona exactamente igual en macOS, Windows y Linux adaptándose a la sintaxis de rutas de cada sistema:

#### Modo Simulación (por defecto, seguro y solo lectura):
```bash
# macOS:
dedupp /Volumes/MI_USB_DJ

# Windows:
dedupp D:\
# o en subcarpeta:
dedupp "D:\Mi Musica"

# Linux:
dedupp /media/$USER/MI_USB_DJ
```

#### Seleccionar criterio de versión más reciente:
```bash
dedupp /Volumes/MI_USB_DJ --criterion latest
```

#### Exportar un informe detallado a CSV:
```bash
dedupp /Volumes/MI_USB_DJ --export-csv informe_duplicados.csv
```

#### Ejecutar la limpieza real (mover a cuarentena reversible o papelera):
```bash
dedupp /Volumes/MI_USB_DJ --apply
```

---

## 📚 Guías Detalladas por Plataforma

- 🍏 [Guía de Uso en macOS](README.md)
- 🪟 [Guía Completa para Windows](docs/WINDOWS.md)
- 🐧 [Guía Completa para Linux](docs/LINUX.md)

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
