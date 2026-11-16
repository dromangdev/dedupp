# 🪟 Dedupp para Windows — Guía de Instalación y Uso

Esta guía describe el funcionamiento, instalación y particularidades de **Dedupp** en sistemas operativos **Microsoft Windows** (Windows 10 y Windows 11 de 64 bits).

---

## 📥 1. Instalación y Descarga

### Descarga del instalador listo para usar
No requieres instalar compiladores ni herramientas técnicas. Los instaladores se generan automáticamente en cada release:

- **Instalador NSIS recomendado (`.exe`)**: `Dedupp_0.3.0_x64-setup.exe`
  - Se instala en el perfil del usuario actual (`%LOCALAPPDATA%\Programs\Dedupp`).
  - **No requiere permisos de administrador**.
  - Crea accesos directos en el Menú Inicio y en el Escritorio.
- **Paquete MSI para empresas / administradores (`.msi`)**: `Dedupp_0.3.0_x64.msi`
  - Permite despliegue automatizado en entornos corporativos o mediante directivas de grupo.

### Requisitos del Sistema
- **Sistema Operativo**: Windows 10 (versión 1809 o superior) o Windows 11 (arquitectura `x64`).
- **Motor Web**: [Microsoft Edge WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (viene preinstalado de fábrica en Windows 11 y en versiones actualizadas de Windows 10).

> [!NOTE]
> Si al ejecutar el instalador Windows SmartScreen muestra una advertencia de *"Editor desconocido"*, haz clic en **Más información** y luego en **Ejecutar de todas formas**. Esto es habitual en aplicaciones de código abierto sin firma de pago comercial.

---

## 🎛️ 2. Detección de Discos y Librerías DJ en Windows

Dedupp cuenta con soporte nativo para la arquitectura de almacenamiento de Windows:

### Letras de unidad y discos USB
- Escanea automáticamente todas las letras de unidad disponibles (`A:\` a `Z:\`).
- Identifica unidades flash USB y discos externos formateados en **FAT32**, **exFAT** o **NTFS**.
- Reconoce automáticamente si una unidad contiene carpetas de DJ (`Engine Library`, `PIONEER` o `_Serato_`) y las prioriza en la parte superior del desplegable bajo la etiqueta `🎧 Unidad DJ`.
- Calcula en tiempo real el espacio libre y total mediante la API Win32 `GetDiskFreeSpaceExW`.
- Acceso directo a tu biblioteca de música personal en `%USERPROFILE%\Music`.

### Software DJ soportado en Windows
1. **Pioneer CDJ / Rekordbox (`export.pdb` & `exportLibrary.db`)**:
   - Analiza el pendrive USB preparado en Rekordbox para pinchar en cabinas Pioneer (CDJ-3000, CDJ-2000NXS2, XDJ-XZ, XDJ-RX3, OPUS-QUAD).
   - Detecta si `rekordbox.exe` está abierto para proteger la base de datos contra escrituras concurrentes.
2. **Denon Engine DJ (`m.db`)**:
   - Inspecciona y purga pistas rojas en bases de datos SQLite de Engine OS / Denon DJ.
   - Detecta procesos activos (`Engine DJ.exe`, `EngineDJ.exe` o `Engine.exe`).
3. **Serato DJ Pro**:
   - Detecta cajas en subcarpetas `_Serato_\Subcrates\*.crate` y marcadores de Hot Cues ID3.

---

## 🗑️ 3. Papelera de Reciclaje y Cuarentena en Windows

- **Papelera de reciclaje nativa**: Cuando eliges la opción de papelera, Dedupp traslada los duplicados a una carpeta agrupada y fechada dentro de la **Papelera de Reciclaje de Windows** utilizando la API de shell `SHFileOperation`. Esto permite vaciarla y recuperar gigabytes reales de disco con un solo clic.
- **Abrir papelera**: El botón de la interfaz invoca directamente `explorer.exe shell:RecycleBinFolder`.
- **Cuarentena reversible**: Si prefieres no borrar nada, los archivos se aíslan en la carpeta oculta `.dedupp_quarantine\` en la misma unidad con su respectivo `manifest.json`.

---

## 💻 4. Uso de la Línea de Comandos (CLI) en Windows

Puedes utilizar el ejecutable de consola `dedupp.exe` desde **PowerShell**, **Símbolo del sistema (CMD)** o la **Terminal de Windows**:

```powershell
# Modo simulación (solo lectura) en una memoria USB montada en D:\
dedupp D:\

# Si la ruta contiene espacios, enciérrala entre comillas:
dedupp "D:\Mi Coleccion DJ"

# Cambiar criterio para priorizar la fecha de modificación más reciente:
dedupp D:\ --criterion latest

# Exportar auditoría a archivo CSV en tu Escritorio:
dedupp D:\ --export-csv "$HOME\Desktop\duplicados.csv"

# Ejecutar la limpieza real:
dedupp D:\ --apply
```

---

## 🛠️ 5. Compilación desde el Código Fuente (Desarrolladores)

Si deseas compilar Dedupp tú mismo en Windows:

1. Instala **Rust** desde [rustup.rs](https://rustup.rs/) (selecciona la opción por defecto `x86_64-pc-windows-msvc`).
2. Instala **Visual Studio C++ Build Tools** (asegúrate de marcar el paquete de desarrollo para escritorio con C++).
3. Instala **Node.js** (v20 o superior).
4. Clona el repositorio e inicia el entorno de desarrollo:
   ```powershell
   git clone https://github.com/dromangdev/dedupp.git
   cd dedupp\gui
   npm install
   npx @tauri-apps/cli dev
   ```
5. Para generar el instalador final `.exe` y `.msi`:
   ```powershell
   npx @tauri-apps/cli build
   ```
   Los instaladores se generarán en `target\release\bundle\nsis\` y `target\release\bundle\msi\`.
