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
  where t.table_schema = 'public'
    and (t.table_name like 'admin_%' or t.table_name = 'platform_admins')
  order by t.table_name
`);

console.log(`Tables admin (${tables.length}) :`);
for (const t of tables) {
  console.log(`  - ${t.table_name} (RLS: ${t.rls_enabled ? "on" : "OFF"})`);
}

const { rows: seeds } = await client.query(`
  select 'roles' as t, count(*)::int as n from public.admin_roles
  union all select 'commissions', count(*)::int from public.admin_commissions
  union all select 'plans', count(*)::int from public.admin_plans
  union all select 'countries', count(*)::int from public.admin_countries
  union all select 'operators', count(*)::int from public.admin_operators
  union all select 'integrations', count(*)::int from public.admin_integrations
  union all select 'insurance', count(*)::int from public.admin_insurance
  union all select 'config', count(*)::int from public.admin_config
`);
console.log("\nDonnées seedées :");
for (const s of seeds) console.log(`  - ${s.t}: ${s.n}`);

await client.end();
