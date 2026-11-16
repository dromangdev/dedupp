# 🐧 Dedupp para Linux — Guía de Instalación y Uso

Esta guía describe el funcionamiento, instalación, dependencias y particularidades de **Dedupp** en distribuciones **GNU/Linux** (Ubuntu, Debian, Fedora, Arch Linux, Linux Mint, Pop!_OS, openSUSE y derivadas).

---

## 📥 1. Instalación y Formatos Disponibles

Los paquetes para Linux se compilan de forma reproducible mediante el flujo de integración continua en cada release:

### Opción A: Paquete Universal AppImage (Recomendado)
Funciona en prácticamente cualquier distribución Linux moderna sin necesidad de instalación formal:

1. Descarga el archivo **`Dedupp_0.3.0_amd64.AppImage`**.
2. Otorga permisos de ejecución:
   ```bash
   chmod +x Dedupp_0.3.0_amd64.AppImage
   ```
3. Ejecútalo haciendo doble clic o desde la terminal:
   ```bash
   ./Dedupp_0.3.0_amd64.AppImage
   ```

> [!TIP]
> En distribuciones muy recientes como Ubuntu 24.04 o Fedora 40 que no incluyen `libfuse2` por defecto, si el AppImage no abre, instala FUSE con:
> ```bash
> # Ubuntu / Debian
> sudo apt install libfuse2
> # Fedora
> sudo dnf install fuse-libs
> # Arch Linux
> sudo pacman -S fuse2
> ```

### Opción B: Paquete Debian / Ubuntu (`.deb`)
Para sistemas basados en Debian, Ubuntu, Linux Mint o Pop!_OS:

1. Descarga **`dedupp_0.3.0_amd64.deb`**.
2. Instálalo con tu gestor de paquetes favorito o por terminal:
   ```bash
   sudo dpkg -i dedupp_0.3.0_amd64.deb || sudo apt-get install -f
   ```
3. Dedupp aparecerá en tu lanzador de aplicaciones de GNOME, KDE o XFCE.

---

## 🎛️ 2. Detección de Almacenamiento y Librerías DJ en Linux

Linux gestiona los dispositivos USB y discos duros mediante puntos de montaje en el árbol de directorios. Dedupp escanea automáticamente las rutas habituales:

### Puntos de montaje soportados
- **Ubuntu / Debian / Mint**: `/media/$USER/<nombre_disco>` y `/media/<nombre_disco>`
- **Arch / Fedora / openSUSE / Manjaro**: `/run/media/$USER/<nombre_disco>`
- **Montajes manuales del sistema**: `/mnt/<nombre_disco>`
- **Disco principal del sistema**: `/` (Raíz del sistema)
- **Colección de música de usuario**: `~/Music`

### Detección automática de colecciones DJ
- Si un pendrive formateado en **FAT32** o **exFAT** contiene carpetas de **Engine DJ** (`Engine Library`), **Rekordbox** (`PIONEER/rekordbox`) o **Serato** (`_Serato_`), Dedupp lo identifica automáticamente con la etiqueta `🎧 Unidad DJ` y lo coloca al inicio del selector.
- El cálculo de gigabytes libres y totales se realiza mediante la llamada POSIX `statvfs` en tiempo real.

### Software DJ en Linux
1. **Pendrives de Cabina Pioneer CDJ (`export.pdb`)**:
   - Inspecciona y re-vincula las listas de reproducción de cabina generadas por Rekordbox directamente sobre el USB conectado a tu equipo Linux.
   - Detecta si existe alguna instancia activa de Rekordbox (por ejemplo corriendo a través de Wine/Proton o Bottles).
2. **Denon Engine DJ (`m.db`)**:
   - Mantenimiento completo de bases de datos SQLite de Engine OS en Linux.
3. **Serato DJ & Mixxx**:
   - Detección de cajas `.crate` y metadatos de cues.

---

## 🗑️ 3. Papelera de Reciclaje FreeDesktop y Cuarentena

- **Papelera FreeDesktop**: Cumple con el estándar de escritorio Linux (`$XDG_DATA_HOME/Trash` o `~/.local/share/Trash`). Los archivos eliminados se trasladan de forma agrupada y fechada.
- **Abrir papelera**: Al pulsar el botón de abrir papelera en la interfaz, Dedupp utiliza `xdg-open trash:///` (con respaldo a `~/.local/share/Trash/files`), abriendo tu gestor de archivos nativo (Nautilus, Dolphin, Thunar, Nemo, etc.).
- **Carpeta de cuarentena**: Opción de aislamiento seguro en `.dedupp_quarantine/` sin eliminar físicamente los archivos.

---

## 💻 4. Uso de la Línea de Comandos (CLI) en Linux

El binario de consola `dedupp` es ligero y no depende de interfaz gráfica, ideal para servidores, scripts de automatización o terminales:

```bash
# Simular análisis en un pendrive montado:
dedupp /media/$USER/MI_USB_DJ

# Escanear tu carpeta de música personal:
dedupp ~/Music

# Priorizar canciones con fecha de modificación más reciente:
dedupp /media/$USER/MI_USB_DJ --criterion latest

# Generar informe CSV de pistas repetidas:
dedupp /media/$USER/MI_USB_DJ --export-csv ~/duplicados_musica.csv

# Ejecutar la limpieza real (mover a cuarentena o papelera):
dedupp /media/$USER/MI_USB_DJ --apply
```

---

## 🛠️ 5. Compilación desde el Código Fuente (Desarrolladores)

Si deseas compilar Dedupp localmente en Linux:

### 1. Instalar dependencias del sistema
```bash
# En Debian / Ubuntu / Linux Mint:
sudo apt-get update
sudo apt-get install -y build-essential curl pkg-config libssl-dev \
    libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf

# En Fedora / RHEL:
sudo dnf install -y gcc gcc-c++ make pkgconf-pkg-config openssl-devel \
    webkit2gtk4.1-devel libappindicator-gtk3-devel librsvg2-devel patchelf

# En Arch Linux / Manjaro:
sudo pacman -S base-devel pkgconf openssl webkit2gtk-4.1 libappindicator-gtk3 librsvg
```

### 2. Instalar Rust y Node.js
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### 3. Compilar y ejecutar
```bash
git clone https://github.com/dromangdev/dedupp.git
cd dedupp/gui

# Modo desarrollo interactivo:
npx @tauri-apps/cli dev

# Generar paquetes para distribución (.deb y .AppImage):
npx @tauri-apps/cli build
```
Los archivos generados se ubicarán en `target/release/bundle/deb/` y `target/release/bundle/appimage/`.
