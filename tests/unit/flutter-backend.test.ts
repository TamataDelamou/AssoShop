import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { mapPayRpcError } from "@/lib/api/pay-rpc";

function projectFile(path: string): string {
  return fileURLToPath(new URL(`../../${path}`, import.meta.url));
}

function read(path: string): string {
  return readFileSync(projectFile(path), "utf8").replace(/\r\n/g, "\n");
}

const MIGRATION = read("supabase/migrations/0025_flutter_backend.sql");
const JOBS = read("supabase/migrations/0026_scheduled_jobs.sql");

function sqlFunction(name: string, source = MIGRATION): string {
  const start = source.indexOf(`create or replace function public.${name}(`);
  if (start === -1) throw new Error(`Fonction ${name} introuvable`);
  return source.slice(start, source.indexOf("\n$$;", start));
}

describe("Migration 0025 : code PIN en base", () => {
  it("calcule l'empreinte en bcrypt, jamais côté client", () => {
    const set = sqlFunction("pin_set");
    expect(set).toContain("set pin_hash = crypt(p_pin, gen_salt('bf', 10)),");
    expect(set).toContain("p_pin !~ '^[0-9]{4}$'");
    expect(set).toContain("set search_path = public, extensions");
  });

  it("ne lève pas d'erreur pour un PIN faux : le compteur doit être conservé", () => {
    const verify = sqlFunction("pin_verify");
    // Seule l'absence d'authentification lève une exception.
    expect(verify.match(/raise exception/g)).toHaveLength(1);
    expect(verify).toContain("c_max_attempts constant integer := 5;");
    expect(verify).toContain("c_lock constant interval := interval '15 minutes';");
    expect(verify).toContain("'reason', 'incorrect', 'attempts_left', c_max_attempts - v_attempts");
    expect(verify).toContain("v_profile.pin_hash = crypt(p_pin, v_profile.pin_hash)");
    // Le verrou est contrôlé avant toute comparaison.
    expect(verify.indexOf("'reason', 'locked'")).toBeLessThan(verify.indexOf("crypt(p_pin"));
    expect(verify).toContain("for update;");
  });

  it("efface les anciens PIN non convertibles et les traite comme absents", () => {
    expect(MIGRATION).toMatch(
      /update public\.user_profiles\s+set pin_hash = null, pin_attempts = 0, pin_locked_until = null\s+where pin_hash is not null and pin_hash !~ '\^\\\$2\[aby\]\\\$';/,
    );
    expect(sqlFunction("pin_verify")).toMatch(/pin_hash !~ '\^\\\$2\[aby\]\\\$' then\s+return jsonb_build_object\('ok', false, 'reason', 'no_pin'\);/);
  });

  it("ferme user_profiles en écriture et cache l'empreinte", () => {
    expect(MIGRATION).toContain('drop policy if exists "user_profiles_insert_own" on public.user_profiles;');
    expect(MIGRATION).toContain('drop policy if exists "user_profiles_update_own" on public.user_profiles;');
    expect(MIGRATION).toContain("revoke all on public.user_profiles from anon, authenticated;");
    const grant = MIGRATION.slice(MIGRATION.indexOf("grant select (id, user_id, city"), MIGRATION.indexOf("on public.user_profiles to authenticated;"));
    expect(grant).toContain("kyc_status");
    expect(grant).not.toContain("pin_hash");
    expect(sqlFunction("profile_update")).toContain("return to_jsonb(v_profile) - 'pin_hash';");
  });

  it("garde le contrat des routes de référence", () => {
    for (const [route, fn] of [
      ["check-pin", "pin_status"],
      ["set-pin", "pin_set"],
      ["verify-pin", "pin_verify"],
    ]) {
      const source = read(`app/api/auth/${route}/route.ts`);
      expect(source).toContain(`supabase.rpc("${fn}"`);
      expect(source).not.toContain('.from("user_profiles")');
    }
    expect(read("lib/pin.ts")).not.toContain("scrypt");
  });
});

describe("Migration 0025 : profil, KYC, compte, organisation", () => {
  it("ne laisse plus l'utilisateur écrire sa demande ni son statut KYC", () => {
    expect(MIGRATION).toContain("revoke all on public.hub_kyc from anon, authenticated;");
    expect(MIGRATION).toContain('create policy "hub_kyc_select_own" on public.hub_kyc\n  for select using (user_id = auth.uid());');
    const submit = sqlFunction("kyc_submit");
    expect(submit).toContain("values (v_user, trim(p_document_type), 'pending')");
    expect(submit).toContain("insert into public.admin_kyc");
    expect(submit).not.toContain("p_status");
    expect(read("app/api/hub/kyc/submit/route.ts")).toContain('supabase.rpc("kyc_submit"');
    expect(read("app/api/hub/profile/route.ts")).toContain('supabase.rpc("profile_update"');
  });

  it("reporte la décision KYC sur le profil, hors de sa propre demande", () => {
    const review = sqlFunction("admin_review_kyc");
    expect(review).toContain("v_user uuid := public.admin_require();");
    expect(review).toMatch(/if v_kyc\.user_id = v_user then\s+raise exception [^;]+PY006/);
    expect(review).toMatch(/if v_kyc\.status <> 'pending' then\s+raise exception [^;]+PY019/);
    expect(review).toContain("case when p_status = 'approved' then 'verified' else 'rejected' end");
  });

  it("ferme le compte de l'appelant uniquement", () => {
    const close = sqlFunction("account_close_self");
    expect(close).toContain("v_result := public.account_close(v_user);");
    expect(close).toContain("delete from auth.users where id = v_user;");
    expect(close).not.toMatch(/p_user_id/);
  });

  it("crée l'organisation et l'adhésion du créateur dans la même fonction", () => {
    const create = sqlFunction("org_create");
    expect(create).toContain("insert into public.organizations");
    expect(create).toContain("values (v_org.id, v_user, 'admin');");
  });
});

describe("Migration 0025 : back-office sans clé service_role", () => {
  const ADMIN_FUNCTIONS = [
    "admin_review_kyc", "admin_set_dispute_status", "admin_review_moderation", "admin_set_commission",
    "admin_update_config", "admin_update_plan", "admin_toggle_status", "admin_create_category",
    "admin_set_user_suspended", "admin_users", "admin_anonymized_accounts", "admin_overview",
    "admin_funds_summary", "admin_investment_supervision", "admin_supervision",
  ];

  it("fait vérifier platform_admins par chaque fonction, avant toute écriture", () => {
    for (const name of ADMIN_FUNCTIONS) {
      const body = sqlFunction(name);
      const guard = body.indexOf("public.admin_require()");
      expect(guard, name).toBeGreaterThan(-1);
      for (const write of ["\n  update public.", "\n  insert into public.", "\n  delete from ", "\n  execute format("]) {
        const position = body.indexOf(write);
        if (position !== -1) expect(guard, `${name} : ${write.trim()}`).toBeLessThan(position);
      }
    }
    const require = sqlFunction("admin_require");
    expect(require).toMatch(/if not public\.is_platform_admin\(\) then\s+raise exception [^;]+PY006/);
  });

  it("journalise chaque écriture du back-office", () => {
    for (const name of ADMIN_FUNCTIONS.slice(0, 9)) {
      expect(sqlFunction(name), name).toContain("perform public.admin_log(");
    }
    expect(sqlFunction("admin_set_commission")).toContain("'config', 'warning'");
    expect(sqlFunction("admin_set_commission")).toContain("p_rate < 0 or p_rate > 100");
  });

  it("réserve la lecture des tables du back-office aux administrateurs", () => {
    for (const table of ["admin_kyc", "admin_disputes", "admin_audit_logs", "platform_admins", "account_anonymizations"]) {
      expect(MIGRATION).toContain(`'${table}'`);
    }
    expect(MIGRATION).toContain("'create policy %I on public.%I for select using (public.is_platform_admin())'");
    expect(MIGRATION).toContain("grant execute on function public.is_platform_admin() to authenticated;");
    // Aucune politique d'écriture : seules les fonctions écrivent.
    expect(MIGRATION).not.toMatch(/for (insert|update|delete|all) (using|with check)/);
    expect(MIGRATION).not.toMatch(/grant (insert|update|delete|all)/);
  });

  it("ne laisse jamais sortir les clés d'API ni les files techniques", () => {
    expect(MIGRATION).toContain("grant select (id, name, partner, webhook_url, status) on public.admin_integrations to authenticated;");
    expect(MIGRATION).toContain("revoke all on public.control_plane_outbox from anon, authenticated;");
    expect(MIGRATION).toContain("revoke all on public.control_plane_access_log from anon, authenticated;");
    expect(sqlFunction("admin_users")).not.toMatch(/encrypted_password|pin_hash|raw_app_meta_data/);
  });

  it("protège la suspension : ni soi-même, ni un compte anonymisé", () => {
    const suspend = sqlFunction("admin_set_user_suspended");
    expect(suspend).toMatch(/if p_user_id = v_admin then\s+raise exception [^;]+PY006/);
    expect(suspend).toContain("from public.account_anonymizations a where a.user_id = p_user_id");
    expect(suspend).toContain("delete from auth.sessions where user_id = p_user_id;");
  });

  it("garde les fonctions internes hors de portée des clients", () => {
    expect(MIGRATION).toContain("revoke all on function public.admin_require() from public, anon, authenticated;");
    expect(MIGRATION).toContain("revoke all on function public.admin_log(text, text, text) from public, anon, authenticated;");
  });

  it("utilise uniquement des codes d'erreur connus de l'API", () => {
    const codes = new Set(Array.from(MIGRATION.matchAll(/errcode = '([A-Z]{2}\d{3})'/g), (m) => m[1]));
    expect(codes.size).toBeGreaterThan(4);
    for (const code of codes) expect(mapPayRpcError({ code }).status).not.toBe(500);
  });
});

describe("Migration 0026 : tâches planifiées en base", () => {
  it("planifie les deux tâches toutes les 15 minutes avec pg_cron", () => {
    expect(JOBS).toContain("create extension if not exists pg_cron;");
    expect(JOBS).toContain("create extension if not exists pg_net with schema extensions;");
    expect(JOBS).toMatch(/'assoshop-investments-settle',\s+'\*\/15 \* \* \* \*',\s+\$\$select public\.market_settle_due_investments_job\(\)\$\$/);
    expect(JOBS).toMatch(/'assoshop-control-plane-push',\s+'\*\/15 \* \* \* \*',\s+\$\$select public\.cp_trigger_push\(\)\$\$/);
    // Rejouable : les tâches du même nom sont d'abord retirées.
    expect(JOBS.indexOf("select cron.unschedule(j.jobid)")).toBeLessThan(JOBS.indexOf("select cron.schedule("));
  });

  it("dénoue en SQL direct et signale les échecs au back-office", () => {
    const job = sqlFunction("market_settle_due_investments_job", JOBS);
    expect(job).toContain("public.market_settle_due_investments()");
    expect(job).toContain("'investment_settlement_failed:'");
    expect(job).toContain("'market', 'critical'");
  });

  it("lit l'adresse et le secret dans Vault, et ne fait rien sans eux", () => {
    const push = sqlFunction("cp_trigger_push", JOBS);
    expect(push).toContain("from vault.decrypted_secrets s where s.name = 'assoshop_functions_url'");
    expect(push).toContain("from vault.decrypted_secrets s where s.name = 'assoshop_cron_secret'");
    expect(push).toMatch(/then\s+return 'skipped';/);
    expect(push).toContain("'/control-plane-push'");
    expect(push).toContain("'Authorization', 'Bearer ' || trim(v_secret)");
    // Aucun secret en clair dans la migration.
    expect(JOBS).not.toMatch(/Bearer [A-Za-z0-9]{16,}/);
    expect(JOBS).toContain("revoke all on function public.cp_trigger_push() from public, anon, authenticated;");
  });

  it("remplace la planification par l'hébergeur web", () => {
    expect(existsSync(projectFile("vercel.json"))).toBe(false);
  });
});
