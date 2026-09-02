import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";

const client = new Client({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT ?? 5432),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
console.log("Connexion PostgreSQL OK");

const dir = process.env.MIGRATIONS_DIR ?? path.resolve("supabase/migrations");
const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
console.log(`Migrations détectées (${files.length}) : ${files.join(", ")}\n`);

for (const file of files) {
  const sql = await readFile(path.join(dir, file), "utf8");
  process.stdout.write(`Application de ${file} ... `);
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log("OK");
  } catch (err) {
    await client.query("ROLLBACK");
    console.log(`ECHEC : ${err.message}`);
    process.exitCode = 1;
    break;
  }
}

const { rows } = await client.query(
  "select table_name from information_schema.tables where table_schema = 'public' order by table_name",
);
console.log(`\nTables publiques (${rows.length}) :`);
for (const r of rows) console.log("  - " + r.table_name);

await client.end();
