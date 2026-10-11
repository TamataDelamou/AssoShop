// État de la base (lecture seule) : quelles migrations sont déjà présentes ?
// Usage : node --env-file=.env.local scripts/db-state.mjs
import { pathToFileURL } from "node:url";
import pg from "pg";

// Objets caractéristiques de chaque migration : elle est considérée présente
// si TOUS ses marqueurs existent dans le schéma public.
export const MIGRATION_MARKERS = {
  "0001_user_profiles.sql": [{ table: "user_profiles" }],
  "0002_organizations_members.sql": [{ table: "organizations" }, { table: "memberships" }, { table: "members" }],
  "0003_finance.sql": [{ table: "financial_groups" }, { table: "loans" }, { function: "is_org_admin" }],
  "0004_community.sql": [{ table: "projects" }, { table: "meetings" }, { table: "announcements" }],
  "0005_accounting.sql": [{ table: "accounting_entries" }],
  "0006_community_modules.sql": [{ table: "contributions" }, { table: "social_cases" }, { table: "signature_requests" }],
  "0007_market.sql": [{ table: "market_orders" }, { table: "market_products" }, { function: "market_is_reseller" }],
  "0008_market_pickup_unique.sql": [{ constraint: "market_pickup_records_order_id_key" }],
  "0009_pay.sql": [{ table: "pay_wallets" }, { table: "pay_transactions" }],
  "0010_admin.sql": [{ table: "admin_commissions" }, { table: "admin_audit_logs" }],
  "0011_hub.sql": [{ table: "hub_favorites" }, { column: ["user_profiles", "kyc_status"] }],
  "0012_pin_lockout.sql": [{ column: ["user_profiles", "pin_attempts"] }],
  "0013_group_members_user.sql": [{ column: ["group_members", "user_id"] }],
  "0014_social_cases_beneficiary_user.sql": [{ column: ["social_cases", "beneficiary_user_id"] }],
  "0015_unify_wallets.sql": [{ index: "idx_pay_wallets_primary" }, { noTable: "market_wallets" }],
  "0016_control_plane.sql": [{ table: "control_plane_outbox" }, { function: "cp_metrics_snapshot" }],
  "0017_wallet_integrity.sql": [{ function: "pay_withdraw" }, { function: "pay_ensure_wallet" }, { noPolicy: ["pay_wallets", "pay_wallets_update"] }],
  "0018_activity_audit.sql": [{ table: "audit_events" }, { function: "audit_log_event" }],
  "0019_market_topup_integrity.sql": [{ column: ["organizations", "created_by"] }, { function: "pay_confirm_topup" }, { function: "market_create_order" }],
  "0020_validate_wallet_balance.sql": [{ validatedConstraint: "pay_wallets_balance_non_negative" }],
  "0021_market_wallet_hardening.sql": [{ function: "pay_credit_platform" }, { function: "market_join_group_order" }, { column: ["market_investment_projects", "created_by"] }],
  "0022_reseller_transfer_investment.sql": [{ function: "market_review_reseller_application" }, { function: "pay_shares_organization" }, { column: ["pay_wallets", "project_id"] }, { noPolicy: ["market_reseller_applications", "market_apps_update"] }],
};

export function pgClient() {
  for (const name of ["PGHOST", "PGUSER", "PGPASSWORD", "PGDATABASE"]) {
    if (!process.env[name]) {
      throw new Error(`Variable ${name} manquante (attendue dans .env.local).`);
    }
  }
  return new pg.Client({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT ?? 5432),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl: { rejectUnauthorized: false },
  });
}

async function exists(client, sql, params) {
  const { rows } = await client.query(`select exists (${sql}) as ok`, params);
  return rows[0].ok;
}

async function checkMarker(client, marker) {
  if (marker.table) {
    return {
      label: `table ${marker.table}`,
      ok: await exists(client, "select 1 from information_schema.tables where table_schema = 'public' and table_name = $1", [marker.table]),
    };
  }
  if (marker.noTable) {
    return {
      label: `table ${marker.noTable} supprimée`,
      ok: !(await exists(client, "select 1 from information_schema.tables where table_schema = 'public' and table_name = $1", [marker.noTable])),
    };
  }
  if (marker.column) {
    return {
      label: `colonne ${marker.column.join(".")}`,
      ok: await exists(client, "select 1 from information_schema.columns where table_schema = 'public' and table_name = $1 and column_name = $2", marker.column),
    };
  }
  if (marker.function) {
    return {
      label: `fonction ${marker.function}()`,
      ok: await exists(client, "select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = $1", [marker.function]),
    };
  }
  if (marker.index) {
    return {
      label: `index ${marker.index}`,
      ok: await exists(client, "select 1 from pg_indexes where schemaname = 'public' and indexname = $1", [marker.index]),
    };
  }
  if (marker.constraint) {
    return {
      label: `contrainte ${marker.constraint}`,
      ok: await exists(client, "select 1 from pg_constraint c join pg_namespace n on n.oid = c.connamespace where n.nspname = 'public' and c.conname = $1", [marker.constraint]),
    };
  }
  if (marker.validatedConstraint) {
    return {
      label: `contrainte ${marker.validatedConstraint} validée`,
      ok: await exists(client, "select 1 from pg_constraint c join pg_namespace n on n.oid = c.connamespace where n.nspname = 'public' and c.conname = $1 and c.convalidated", [marker.validatedConstraint]),
    };
  }
  if (marker.noPolicy) {
    return {
      label: `politique ${marker.noPolicy[1]} retirée`,
      ok: !(await exists(client, "select 1 from pg_policies where schemaname = 'public' and tablename = $1 and policyname = $2", marker.noPolicy)),
    };
  }
  throw new Error(`Marqueur inconnu : ${JSON.stringify(marker)}`);
}

// Renvoie, pour chaque migration, { file, present, partial, checks }.
export async function detectState(client) {
  const state = [];
  for (const [file, markers] of Object.entries(MIGRATION_MARKERS)) {
    const checks = [];
    for (const marker of markers) checks.push(await checkMarker(client, marker));
    const okCount = checks.filter((c) => c.ok).length;
    state.push({
      file,
      present: okCount === checks.length,
      partial: okCount > 0 && okCount < checks.length,
      checks,
    });
  }
  return state;
}

async function main() {
  const client = pgClient();
  await client.connect();
  try {
    await client.query("begin transaction read only");
    const version = (await client.query("show server_version")).rows[0].server_version;
    console.log(`Serveur PostgreSQL ${version} — base ${process.env.PGDATABASE}\n`);

    for (const entry of await detectState(client)) {
      const status = entry.present ? "PRÉSENTE" : entry.partial ? "PARTIELLE" : "ABSENTE ";
      const detail = entry.checks.map((c) => `${c.ok ? "✓" : "✗"} ${c.label}`).join(", ");
      console.log(`${status}  ${entry.file}\n          ${detail}`);
    }

    const tracked = await exists(client, "select 1 from information_schema.tables where table_schema = 'public' and table_name = 'app_migrations'", []);
    console.log(`\nTable de suivi app_migrations : ${tracked ? "présente" : "absente"}`);

    const { rows } = await client.query(
      "select count(*)::int as n from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'",
    );
    console.log(`Tables du schéma public : ${rows[0].n}`);
    await client.query("rollback");
  } finally {
    await client.end();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((err) => {
    console.error(`ÉCHEC : ${err.message}`);
    process.exit(1);
  });
}
