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

const { rows } = await client.query(
  "select table_name from information_schema.tables where table_schema = 'public' order by table_name",
);
console.log(`Tables publiques (${rows.length}) :`);
for (const r of rows) console.log("  - " + r.table_name);

const { rows: counts } = await client.query(
  "select count(*)::int as n from supabase_migrations.schema_migrations",
);
console.log(`\nMigrations enregistrées : ${counts[0].n}`);

await client.end();
