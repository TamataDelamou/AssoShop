// Sauvegarde complète du schéma public dans backups/ (dossier ignoré par git).
// pg_dump si disponible et compatible avec le serveur, sinon export JSON via pg.
// Usage : node --env-file=.env.local scripts/backup-db.mjs
import { spawnSync } from "node:child_process";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pgClient } from "./db-state.mjs";

const DIR = path.resolve("backups");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");

function human(bytes) {
  return bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(2)} Mo`
    : `${(bytes / 1024).toFixed(1)} Ko`;
}

async function publicTables(client) {
  const { rows } = await client.query(
    "select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name",
  );
  return rows.map((r) => r.table_name);
}

// 1. pg_dump (structure + données + politiques + droits du schéma public).
async function dumpWithPgDump(tables) {
  const file = path.join(DIR, `${stamp}-public.sql`);
  const result = spawnSync(
    process.env.PG_DUMP ?? "pg_dump",
    ["--schema=public", "--format=plain", "--no-owner", `--file=${file}`],
    { env: process.env, encoding: "utf8" },
  );
  if (result.error || result.status !== 0) {
    const reason = (result.error?.message ?? result.stderr ?? "").trim().split("\n")[0];
    return { ok: false, reason };
  }

  // Relecture : le fichier doit être complet et contenir toutes les tables.
  const sql = await readFile(file, "utf8");
  if (!sql.includes("PostgreSQL database dump complete")) {
    return { ok: false, reason: "dump incomplet (marqueur de fin absent)" };
  }
  const missing = tables.filter(
    (t) => !sql.includes(`CREATE TABLE public.${t} (`) && !sql.includes(`CREATE TABLE public."${t}" (`),
  );
  if (missing.length > 0) {
    return { ok: false, reason: `tables absentes du dump : ${missing.join(", ")}` };
  }
  return { ok: true, file, format: "pg_dump (SQL)", tables: tables.length };
}

// 2. Repli : export JSON (données de toutes les tables + définitions utiles).
async function dumpAsJson(client, tables) {
  const file = path.join(DIR, `${stamp}-public.json`);
  const data = {};
  const counts = {};
  for (const table of tables) {
    const { rows } = await client.query(`select * from public."${table}"`);
    data[table] = rows;
    counts[table] = rows.length;
  }
  const columns = (
    await client.query(
      "select table_name, column_name, data_type, is_nullable, column_default from information_schema.columns where table_schema = 'public' order by table_name, ordinal_position",
    )
  ).rows;
  const policies = (
    await client.query("select * from pg_policies where schemaname = 'public' order by tablename, policyname")
  ).rows;
  const functions = (
    await client.query(
      "select p.proname as name, pg_get_functiondef(p.oid) as definition from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.prokind = 'f' order by p.proname",
    )
  ).rows;

  await writeFile(
    file,
    JSON.stringify({ created_at: new Date().toISOString(), counts, columns, policies, functions, data }),
  );

  // Relecture : le JSON doit se relire et redonner les mêmes volumes.
  const parsed = JSON.parse(await readFile(file, "utf8"));
  for (const table of tables) {
    if (!Array.isArray(parsed.data[table]) || parsed.data[table].length !== counts[table]) {
      return { ok: false, reason: `relecture incohérente pour ${table}` };
    }
  }
  const rows = Object.values(counts).reduce((a, b) => a + b, 0);
  return { ok: true, file, format: "export JSON", tables: tables.length, rows };
}

async function main() {
  await mkdir(DIR, { recursive: true });
  const client = pgClient();
  await client.connect();
  try {
    await client.query("begin transaction isolation level repeatable read read only");
    const tables = await publicTables(client);

    let backup = await dumpWithPgDump(tables);
    if (!backup.ok) {
      console.log(`pg_dump indisponible ou refusé (${backup.reason}) — bascule sur l'export JSON.`);
      backup = await dumpAsJson(client, tables);
    }
    await client.query("rollback");

    if (!backup.ok) throw new Error(backup.reason);
    const { size } = await stat(backup.file);
    if (size === 0) throw new Error("fichier de sauvegarde vide");

    console.log(`SAUVEGARDE OK — ${backup.format}`);
    console.log(`  fichier : ${path.relative(process.cwd(), backup.file)}`);
    console.log(`  taille  : ${human(size)}`);
    console.log(`  tables  : ${backup.tables}${backup.rows !== undefined ? ` (${backup.rows} lignes)` : ""}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(`SAUVEGARDE EN ÉCHEC : ${err.message}`);
  process.exit(1);
});
