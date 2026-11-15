use clap::{Parser, ValueEnum};
use dedupp_core::{
    group_duplicates, DecisionEngine, DedupeCriterion, SafeActionExecutor, Scanner,
};
use std::path::PathBuf;

#[derive(ValueEnum, Clone, Copy, Debug)]
enum CriterionArg {
    /// Prioriza la mayor calidad técnica (Lossless, Bitrate 320k, Sample Rate)
    Quality,
    /// Prioriza la versión con fecha de modificación más reciente
    Latest,
}

#[derive(Parser, Debug)]
#[command(name = "dedupp")]
#[command(author = "Dedupp Team")]
#[command(version)]
#[command(about = "Encuentra y gestiona canciones duplicadas en USBs y discos protegiendo librerías DJ (Engine DJ, Serato, Rekordbox)", long_about = None)]
struct Cli {
    /// Ruta de la unidad USB o carpeta a escanear
    #[arg(value_name = "RUTA")]
    path: PathBuf,

    /// Criterio de selección para conservar archivos
    #[arg(short, long, value_enum, default_value_t = CriterionArg::Quality)]
    criterion: CriterionArg,

    /// Tolerancia de duración en segundos para comparar canciones (evita descartar Extended Mixes)
    #[arg(short, long, default_value_t = 3.5)]
    tolerance: f64,

    /// Ejecutar en modo seguro de simulación (no mueve ni borra ningún archivo)
    #[arg(long, default_value_t = true)]
    dry_run: bool,

    /// Aplicar los cambios realmente (mueve los duplicados a la carpeta de cuarentena)
    #[arg(long, default_value_t = false)]
    apply: bool,

    /// Proteger y priorizar archivos que ya tengan Hot Cues o estén en playlists de DJ
    #[arg(long, default_value_t = true)]
    protect_cues: bool,

    /// Exportar informe detallado en formato CSV
    #[arg(long, value_name = "ARCHIVO_CSV")]
    export_csv: Option<PathBuf>,
}

fn main() {
    let cli = Cli::parse();
    let is_dry_run = if cli.apply { false } else { cli.dry_run };

    println!("============================================================");
    println!("🎧 Dedupp v0.1.0 - Limpiador Inteligente de Canciones");
    println!("============================================================");
    println!("📂 Escaneando ruta: {}", cli.path.display());
    println!("⚙️  Criterio de selección: {:?}", cli.criterion);
    println!("⏱️  Tolerancia de duración: ±{:.1}s", cli.tolerance);
    println!("🛡️  Modo seguro (Dry Run): {}", if is_dry_run { "ACTIVADO (Simulación)" } else { "DESACTIVADO (Moverá archivos a cuarentena)" });
    println!("------------------------------------------------------------\n");

    if !cli.path.exists() {
        eprintln!("❌ Error: La ruta '{}' no existe.", cli.path.display());
        std::process::exit(1);
    }

    let scanner = Scanner::new(&cli.path);
    print!("🔍 Analizando archivos de audio y librerías DJ... ");

    let (tracks, dj_libs) = scanner.scan(None, |prog| {
        if let Some(msg) = prog.log_message {
            println!("\nℹ️  {}", msg);
        } else if prog.total > 0 && prog.current % 100 == 0 {
            print!("\r🔍 Analizando archivos de audio: {} / {}...", prog.current, prog.total);
        }
    });
    println!("\r🔍 Escaneo completo: {} pistas de audio encontradas.\n", tracks.len());

    // Resumen de librerías DJ detectadas
    println!("🎛️  Librerías DJ detectadas en la unidad:");
    println!("   - Engine DJ:  {}", if dj_libs.has_engine_dj { "✅ Detectada (Database2/m.db)" } else { "⚪ No encontrada" });
    println!("   - Serato DJ:  {}", if dj_libs.has_serato { "✅ Detectada (_Serato_)" } else { "⚪ No encontrada" });
    println!("   - Rekordbox:  {}", if dj_libs.has_rekordbox { "✅ Detectada (PIONEER / XML)" } else { "⚪ No encontrada" });
    println!();

    if tracks.is_empty() {
        println!("⚠️  No se encontraron archivos de audio compatibles (.mp3, .wav, .aiff, .flac, .m4a, etc.).");
        return;
    }

    // Agrupación de duplicados
    println!("🔄 Agrupando posibles duplicados...");
    let groups = group_duplicates(tracks, cli.tolerance);

    if groups.is_empty() {
        println!("🎉 ¡No se encontraron canciones duplicadas en la unidad!");
        return;
    }

    println!("🔎 Se encontraron {} grupos de canciones duplicadas:\n", groups.len());

    let criterion = match cli.criterion {
        CriterionArg::Quality => DedupeCriterion::HighestQuality,
        CriterionArg::Latest => DedupeCriterion::LatestVersion,
    };

    let decision_engine = DecisionEngine::new(criterion, cli.protect_cues);
    let mut decisions = Vec::new();
    let mut total_discard_count = 0;

    for group in &groups {
        if let Some(decision) = decision_engine.decide(group) {
            total_discard_count += decision.discard.len();

            println!("🎵 Grupo: \"{}\"", decision.group_key);
            println!(
                "   ✅ CONSERVAR: {} [{} | {} kbps | {} Hz] (Modif: {})",
                decision.keep.filename,
                decision.keep.extension.to_uppercase(),
                decision.keep.bitrate_kbps,
                decision.keep.sample_rate_hz,
                decision.keep.modified_time.format("%Y-%m-%d")
            );
            for disc in &decision.discard {
                println!(
                    "   ❌ DESCARTAR: {} [{} | {} kbps] -> Razón: {}",
                    disc.track.filename,
                    disc.track.extension.to_uppercase(),
                    disc.track.bitrate_kbps,
                    disc.reason
                );
            }
            println!();
            decisions.push(decision);
        }
    }

    // Ejecución segura
    let executor = SafeActionExecutor::new(&cli.path, is_dry_run);

    if let Some(csv_out) = &cli.export_csv {
        if let Err(e) = executor.export_csv(&decisions, csv_out) {
            eprintln!("⚠️ Error al exportar CSV: {}", e);
        } else {
            println!("📄 Informe CSV generado exitosamente en: {}", csv_out.display());
        }
    }

    match executor.execute(&decisions) {
        Ok(manifest) => {
            if is_dry_run {
                println!("------------------------------------------------------------");
                println!("💡 Simulación completada con éxito.");
                println!("   - Se detectaron {} archivos duplicados prescindibles.", total_discard_count);
                println!("   - Ningún archivo fue alterado.");
                println!("   - Para moverlos de forma segura a la carpeta de cuarentena, ejecuta con '--apply'.");
            } else {
                println!("------------------------------------------------------------");
                println!("✅ Limpieza ejecutada con éxito.");
                println!("   - {} archivos movidos a la carpeta segura:", manifest.items.len());
                println!("     {}/.dedupp_quarantine/{}", cli.path.display(), manifest.timestamp);
                println!("   - Puedes restaurar cualquier archivo en cualquier momento revisando 'manifest.json'.");

                let mut pairs = Vec::new();
                for dec in &decisions {
                    let win = dec.keep.path.clone();
                    for d in &dec.discard {
                        pairs.push((win.clone(), d.track.path.clone()));
                    }
                }

                // Sincronizar playlists de Rekordbox / Cabina Pioneer si está presente
                if let Some(mut rkb) = dj_libraries::rekordbox::RekordboxPdbDatabase::find_in_drive(&cli.path) {
                    match rkb.relink_and_purge_duplicates(&pairs) {
                        Ok(res) if res.relinked_playlists_count > 0 => {
                            println!("   - 💿 Cabina Rekordbox (export.pdb): {} playlists re-vinculadas al tema ganador.", res.relinked_playlists_count);
                        }
                        _ => {}
                    }
                }

                // Sincronizar playlists de Engine DJ si está presente
                if let Some(engine_db) = dj_libraries::engine_dj::EngineDjDatabase::find_in_root(&cli.path) {
                    match engine_db.relink_and_purge_duplicates(&pairs) {
                        Ok(res) if res.relinked_playlists_count > 0 || res.purged_count > 0 => {
                            println!("   - 🎧 Engine DJ (m.db): {} playlists re-vinculadas y {} pistas purgadas.", res.relinked_playlists_count, res.purged_count);
                        }
                        _ => {}
                    }
                }
            }
        }
        Err(e) => {
            eprintln!("❌ Error durante la ejecución: {}", e);
        }
    }
}
