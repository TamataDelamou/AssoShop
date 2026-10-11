// Application suivie des migrations SQL de supabase/migrations.
//
//   node --env-file=.env.local scripts/apply-migrations.mjs [--dry-run] [--smoke]
//
// - Suivi : chaque migration appliquée est enregistrée dans public.app_migrations
//   (nom, date, empreinte SHA-256 du fichier) et n'est jamais rejouée.
// - Initialisation : si la table de suivi est vide, les migrations dont les
//   objets caractéristiques existent déjà en base (scripts/db-state.mjs) y sont
//   inscrites sans être rejouées. Une migration à moitié présente bloque tout.
// - Tout ou rien : toutes les migrations en attente passent dans UNE SEULE
//   transaction ; la moindre erreur annule l'ensemble.
// - --dry-run : exécute tout, puis ROLLBACK (rien n'est conservé).
// - --smoke   : lance les tests de fumée (scripts/smoke-migrations.mjs) dans la
//   même transaction, sous un point de sauvegarde annulé ensuite ; un test en
//   échec annule aussi les migrations.
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { detectState, pgClient } from "./db-state.mjs";
import { printSmokeResults, runSmokeTests } from "./smoke-migrations.mjs";

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const SMOKE = args.has("--smoke");
for (const arg of args) {
  if (arg !== "--dry-run" && arg !== "--smoke") {
    console.error(`Option inconnue : ${arg}`);
    process.exit(2);
  }
}

const DIR = process.env.MIGRATIONS_DIR ?? path.resolve("supabase/migrations");
// Verrou consultatif : deux applications simultanées ne peuvent pas se croiser.
const LOCK_KEY = 4_815_162_342;

function checksum(sql) {
  // Empreinte indépendante des fins de ligne (CRLF sous Windows).
  return createHash("sha256").update(sql.replace(/\r\n/g, "\n")).digest("hex");
}

async function loadMigrations() {
  const files = (await readdir(DIR)).filter((f) => f.endsWith(".sql")).sort();
  const migrations = [];
  for (const file of files) {
    const sql = await readFile(path.join(DIR, file), "utf8");
    migrations.push({ file, sql, checksum: checksum(sql) });
  }
  return migrations;
}

async function ensureTrackingTable(client) {
  await client.query(`
    create table if not exists public.app_migrations (
      name text primary key,
      applied_at timestamptz not null default now(),
      checksum text not null
    )
  `);
  // Table technique : aucune politique, aucun accès pour les rôles client.
  await client.query("alter table public.app_migrations enable row level security");
  await client.query("revoke all on public.app_migrations from anon, authenticated");
}

// Inscrit, sans les rejouer, les migrations déjà présentes en base.
async function baseline(client, migrations) {
  const state = await detectState(client);
  const byFile = new Map(state.map((s) => [s.file, s]));

  const partial = state.filter((s) => s.partial);
  if (partial.length > 0) {
    const detail = partial
      .map((s) => `${s.file} (${s.checks.filter((c) => !c.ok).map((c) => c.label).join(", ")} manquant)`)
      .join(" ; ");
    throw new Error(`Migration(s) partiellement présente(s), intervention manuelle requise : ${detail}`);
  }

  const recorded = [];
  let gap = null;
  for (const migration of migrations) {
    const entry = byFile.get(migration.file);
    if (!entry?.present) {
      gap ??= migration.file;
      continue;
    }
    if (gap) {
      throw new Error(
        `${migration.file} est présente en base alors que ${gap}, antérieure, ne l'est pas : état incohérent.`,
      );
    }
    await client.query(
      "insert into public.app_migrations (name, checksum) values ($1, $2)",
      [migration.file, migration.checksum],
    );
    recorded.push(migration.file);
  }
  return recorded;
}

async function main() {
  const migrations = await loadMigrations();
  const client = pgClient();
  await client.connect();
  console.log(`Connexion PostgreSQL OK — mode ${DRY_RUN ? "ESSAI À BLANC (rollback final)" : "APPLICATION RÉELLE"}\n`);

  let committed = false;
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock($1)", [LOCK_KEY]);
    await ensureTrackingTable(client);

    const { rows: before } = await client.query("select name, checksum from public.app_migrations");
    if (before.length === 0) {
      const recorded = await baseline(client, migrations);
      console.log(
        recorded.length > 0
          ? `Suivi initialisé : ${recorded.length} migration(s) déjà présentes en base inscrites sans être rejouées (${recorded[0]} → ${recorded.at(-1)}).`
          : "Suivi initialisé : base vide, aucune migration déjà présente.",
      );
    }

    const { rows: applied } = await client.query("select name, checksum from public.app_migrations");
    const appliedByName = new Map(applied.map((r) => [r.name, r.checksum]));

    // Un fichier déjà appliqué ne doit plus changer : on corrige par une nouvelle migration.
    const altered = migrations.filter(
      (m) => appliedByName.has(m.file) && appliedByName.get(m.file) !== m.checksum,
    );
    if (altered.length > 0) {
      throw new Error(
        `Fichier(s) modifié(s) depuis leur application : ${altered.map((m) => m.file).join(", ")}. Écrivez une nouvelle migration.`,
      );
    }

    const pending = migrations.filter((m) => !appliedByName.has(m.file));
    console.log(
      pending.length > 0
        ? `Migrations en attente (${pending.length}) : ${pending.map((m) => m.file).join(", ")}\n`
        : "Aucune migration en attente.\n",
    );

    for (const migration of pending) {
      process.stdout.write(`  ${migration.file} ... `);
      try {
        await client.query(migration.sql);
      } catch (err) {
        console.log("ÉCHEC");
        const where = err.position ? ` (caractère ${err.position})` : "";
        throw new Error(`${migration.file}${where} : ${err.message}`);
      }
      await client.query(
        "insert into public.app_migrations (name, checksum) values ($1, $2)",
        [migration.file, migration.checksum],
      );
      console.log("OK");
    }

    if (SMOKE) {
      console.log("\nTests de fumée (données de test annulées ensuite) :\n");
      await client.query("savepoint smoke_tests");
      const ok = printSmokeResults(await runSmokeTests(client));
      await client.query("rollback to savepoint smoke_tests");
      if (!ok) throw new Error("tests de fumée en échec");
    }

    if (DRY_RUN) {
      await client.query("rollback");
      console.log("\nESSAI À BLANC TERMINÉ : ROLLBACK effectué, la base n'a pas été modifiée.");
    } else {
      await client.query("commit");
      committed = true;
      console.log(`\nAPPLICATION TERMINÉE : ${pending.length} migration(s) validée(s) (COMMIT).`);
    }
  } catch (err) {
    await client.query("rollback").catch(() => {});
    console.error(`\nÉCHEC : ${err.message}`);
    console.error("ROLLBACK effectué : aucune migration n'a été appliquée.");
    process.exitCode = 1;
  } finally {
    await client.end();
  }

  if (committed) {
    console.log("Suivi : select name, applied_at from public.app_migrations order by name;");
  }
}

main().catch((err) => {
  console.error(`ÉCHEC : ${err.message}`);
  process.exit(1);
});
