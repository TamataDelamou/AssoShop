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

const { rows: tables } = await client.query(`
  select t.table_name, c.relrowsecurity as rls_enabled
  from information_schema.tables t
  join pg_class c on c.relname = t.table_name
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  where t.table_schema = 'public' and t.table_name like 'pay_%'
  order by t.table_name
`);

console.log(`Tables pay (${tables.length}) :`);
for (const t of tables) {
  console.log(`  - ${t.table_name} (RLS: ${t.rls_enabled ? "on" : "OFF"})`);
}

await client.end();
