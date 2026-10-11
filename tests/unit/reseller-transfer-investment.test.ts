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

const MIGRATION = read("supabase/migrations/0022_reseller_transfer_investment.sql");

// Corps d'une fonction SQL de la migration.
function sqlFunction(name: string): string {
  const start = MIGRATION.indexOf(`create or replace function public.${name}(`);
  if (start === -1) throw new Error(`Fonction ${name} introuvable dans 0022`);
  return MIGRATION.slice(start, MIGRATION.indexOf("$$;", start));
}

describe("Migration 0022 : candidature revendeur (RG-M01)", () => {
  it("retire au candidat toute écriture directe", () => {
    expect(MIGRATION).toContain(
      'drop policy if exists "market_apps_insert" on public.market_reseller_applications;',
    );
    expect(MIGRATION).toContain(
      'drop policy if exists "market_apps_update" on public.market_reseller_applications;',
    );
    for (const table of ["market_reseller_applications", "market_resellers"]) {
      expect(MIGRATION).toContain(
        `revoke insert, update, delete, truncate on public.${table} from anon, authenticated;`,
      );
    }
    for (const table of ["platform_admins", "admin_audit_logs"]) {
      expect(MIGRATION).toContain(`revoke all on public.${table} from anon, authenticated;`);
    }
    // Aucune politique d'écriture n'est recréée.
    expect(MIGRATION).not.toMatch(/create policy/);
  });

  it("dépose toujours la candidature en attente, pour l'utilisateur courant", () => {
    const submit = sqlFunction("market_submit_reseller_application");
    expect(submit).not.toMatch(/p_status|p_user_id/);
    expect(submit).toContain("v_user uuid := auth.uid();");
    expect(submit).toContain("'pending', null, now(), null)");
    expect(submit).toContain("status = 'pending',");
    // Une candidature approuvée ne se redépose pas.
    expect(submit).toMatch(/if v_application\.status = 'approved' or exists[\s\S]+?PY019/);
  });

  it("réserve la décision à un administrateur de la plateforme", () => {
    const review = sqlFunction("market_review_reseller_application");
    expect(sqlFunction("is_platform_admin")).toContain(
      "from public.platform_admins a where a.user_id = auth.uid()",
    );
    expect(review).toMatch(/if not public\.is_platform_admin\(\) then\s+raise exception [^;]+PY006/);
    expect(review).toContain("p_status not in ('approved', 'rejected')");
    // Jamais sur sa propre candidature.
    expect(review).toMatch(/if v_application\.user_id = v_user then\s+raise exception [^;]+PY006/);
    // Le contrôle d'accès précède toute écriture.
    expect(review.indexOf("is_platform_admin()")).toBeLessThan(
      review.indexOf("update public.market_reseller_applications"),
    );
    expect(review.indexOf("v_application.user_id = v_user")).toBeLessThan(
      review.indexOf("update public.market_reseller_applications"),
    );
  });

  it("ne crée le compte revendeur qu'à l'approbation et journalise la décision", () => {
    const review = sqlFunction("market_review_reseller_application");
    const approval = review.indexOf("if p_status = 'approved' then");
    expect(approval).toBeGreaterThan(-1);
    expect(review.indexOf("insert into public.market_resellers")).toBeGreaterThan(approval);
    expect(review).toContain("insert into public.admin_audit_logs (actor, action, module, severity)");
    expect(review).toContain("'review_reseller:' || p_status || ':' || v_application.id::text");
    // Seule cette fonction crée un compte revendeur.
    expect(MIGRATION.match(/insert into public\.market_resellers/g)).toHaveLength(1);
  });

  it("n'expose plus de route d'auto-approbation", () => {
    expect(
      existsSync(projectFile("app/api/market/reseller/application/approve/route.ts")),
    ).toBe(false);
    const submitRoute = read("app/api/market/reseller/application/route.ts");
    expect(submitRoute).toContain('supabase.rpc("market_submit_reseller_application"');
    expect(submitRoute).not.toMatch(/\.from\("market_reseller_applications"\)/);
    const reviewRoute = read("app/api/admin/resellers/[id]/review/route.ts");
    expect(reviewRoute).toContain("getAdminContext()");
    expect(reviewRoute).toContain('.rpc("market_review_reseller_application"');
    expect(reviewRoute).not.toMatch(/\.(insert|update)\(/);
  });

  it("n'accorde les fonctions qu'aux utilisateurs connectés", () => {
    expect(MIGRATION).toContain(
      "revoke all on function public.market_review_reseller_application(uuid, text, text) from public, anon;",
    );
    expect(MIGRATION).toContain(
      "revoke all on function public.is_platform_admin() from public, anon, authenticated;",
    );
  });
});

describe("Migration 0022 : transfert par identifiant utilisateur", () => {
  it("exige une organisation commune", () => {
    const transfer = sqlFunction("pay_transfer");
    expect(transfer).toMatch(
      /if not public\.pay_shares_organization\(v_user, p_to_user_id\) then\s+raise exception [^;]+PY014/,
    );
    // L'existence du compte ne suffit plus.
    expect(transfer).not.toContain("from auth.users");
    // Le contrôle précède tout mouvement.
    expect(transfer.indexOf("pay_shares_organization")).toBeLessThan(
      transfer.indexOf("update public.pay_wallets"),
    );
  });

  it("part des adhésions de l'émetteur", () => {
    const shares = sqlFunction("pay_shares_organization");
    expect(shares).toContain("where m.user_id = p_user");
    expect(shares).toContain("mb.organization_id = m.organization_id and mb.user_id = p_other");
    expect(shares).toContain("m2.organization_id = m.organization_id and m2.user_id = p_other");
    expect(MIGRATION).toContain(
      "revoke all on function public.pay_shares_organization(uuid, uuid) from public, anon, authenticated;",
    );
  });

  it("garde les protections de 0021", () => {
    const transfer = sqlFunction("pay_transfer");
    expect(transfer).toMatch(/m\.organization_id = v_member\.organization_id and m\.user_id = v_user/);
    expect(transfer).toMatch(/if v_recipient = v_user then\s+raise exception [^;]+PY013/);
    expect(transfer).toMatch(/where id in \(v_from_id, v_to_id\)\s+order by id\s+for update/);
    expect(transfer).toContain("'transfer', 'confirmed', p_amount");
    expect(transfer).toContain("'receipt', 'confirmed', p_amount");
  });
});

describe("Migration 0022 : investissement payé", () => {
  it("crée un compte de séquestre par projet, sans utilisateur", () => {
    expect(MIGRATION).toContain("(type = 'escrow' and user_id is null and project_id is not null)");
    expect(MIGRATION).toContain("(type = 'platform' and user_id is null and project_id is null)");
    expect(MIGRATION).toMatch(
      /create unique index if not exists idx_pay_wallets_escrow\s+on public\.pay_wallets \(project_id\)\s+where type = 'escrow';/,
    );
    expect(MIGRATION).toMatch(
      /references public\.market_investment_projects \(id\) on delete restrict;/,
    );
    expect(MIGRATION).toContain(
      "revoke all on function public.pay_ensure_escrow_wallet(uuid, text) from public, anon, authenticated;",
    );
  });

  it("débite l'investisseur et crédite le séquestre dans la même fonction", () => {
    const invest = sqlFunction("market_invest");
    expect(invest).toContain("v_balance := v_wallet.balance - p_amount;");
    expect(invest).toContain("v_balance := v_escrow.balance + p_amount;");
    expect(invest).toContain("'payment', 'confirmed', p_amount");
    expect(invest).toContain(
      "insert into public.market_investment_contributions (project_id, user_id, amount, transaction_id)",
    );
    // RG-M05 inchangée.
    expect(invest).toContain("rules_locked = true");
  });

  it("contrôle le solde avant toute écriture", () => {
    const invest = sqlFunction("market_invest");
    const balanceCheck = invest.indexOf("if v_wallet.balance < p_amount then");
    expect(balanceCheck).toBeGreaterThan(-1);
    expect(invest).toMatch(/if v_wallet\.balance < p_amount then\s+raise exception [^;]+PY003/);
    expect(balanceCheck).toBeLessThan(invest.indexOf("update public.pay_wallets"));
    expect(balanceCheck).toBeLessThan(
      invest.indexOf("insert into public.market_investment_contributions"),
    );
  });

  it("verrouille le projet, puis l'investisseur, puis le séquestre", () => {
    const invest = sqlFunction("market_invest");
    const project = invest.indexOf("from public.market_investment_projects where id = p_project_id\n  for update;");
    const wallet = invest.indexOf("where id = v_wallet_id for update;");
    const escrow = invest.indexOf("where id = v_escrow_id for update;");
    expect(project).toBeGreaterThan(-1);
    expect(wallet).toBeGreaterThan(project);
    expect(escrow).toBeGreaterThan(wallet);
  });
});

describe("Migration 0022 : codes d'erreur", () => {
  it("utilise en base uniquement des codes connus de l'API", () => {
    const codes = new Set(
      Array.from(MIGRATION.matchAll(/errcode = '(PY\d{3})'/g), (m) => m[1]),
    );
    expect(codes.size).toBeGreaterThan(5);
    for (const code of codes) {
      expect(mapPayRpcError({ code }).status).not.toBe(500);
    }
  });
});
