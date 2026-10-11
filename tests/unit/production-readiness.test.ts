import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  accountClosureAction,
  accountDeletionBlockers,
  ACCOUNT_DELETION_BLOCKERS,
  AccountCommitments,
  parseAccountClosure,
} from "@/lib/account-closure";
import {
  isRealMoneyBlocked,
  isRealMoneyEnabled,
  PAY_TEST_MODE_MESSAGE,
  realMoneyBlockedResponse,
} from "@/lib/api/pay-real-money";
import { mapPayRpcError } from "@/lib/api/pay-rpc";
// Script Node sans types : seul runPreflight est utilisé ici.
import { runPreflight } from "../../scripts/preflight-production.mjs";

function read(path: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../../${path}`, import.meta.url)),
    "utf8",
  ).replace(/\r\n/g, "\n");
}

const MIGRATION = read("supabase/migrations/0024_account_closure.sql");

function sqlFunction(name: string): string {
  const start = MIGRATION.indexOf(`create or replace function public.${name}(`);
  if (start === -1) throw new Error(`Fonction ${name} introuvable dans 0024`);
  return MIGRATION.slice(start, MIGRATION.indexOf("\n$$;", start));
}

describe("Garde-fou argent réel (PAY_REAL_MONEY)", () => {
  it("est désactivé par défaut et ne s'active qu'avec la valeur 1", () => {
    expect(isRealMoneyEnabled({})).toBe(false);
    expect(isRealMoneyEnabled({ PAY_REAL_MONEY: "" })).toBe(false);
    expect(isRealMoneyEnabled({ PAY_REAL_MONEY: "0" })).toBe(false);
    expect(isRealMoneyEnabled({ PAY_REAL_MONEY: "true" })).toBe(false);
    expect(isRealMoneyEnabled({ PAY_REAL_MONEY: "1" })).toBe(true);
    expect(isRealMoneyEnabled({ PAY_REAL_MONEY: " 1 " })).toBe(true);
  });

  it("bloque les opérations réelles en production tant qu'il est désactivé", () => {
    expect(isRealMoneyBlocked({ NODE_ENV: "production" })).toBe(true);
    expect(isRealMoneyBlocked({ NODE_ENV: "production", PAY_REAL_MONEY: "0" })).toBe(true);
    expect(isRealMoneyBlocked({ NODE_ENV: "production", PAY_REAL_MONEY: "1" })).toBe(false);
    // Hors production, les parcours de test restent possibles.
    expect(isRealMoneyBlocked({ NODE_ENV: "development" })).toBe(false);
    expect(isRealMoneyBlocked({ NODE_ENV: "test" })).toBe(false);
  });

  it("répond 503 avec un message clair", async () => {
    const response = realMoneyBlockedResponse();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: PAY_TEST_MODE_MESSAGE,
      code: "pay_test_mode",
    });
    expect(PAY_TEST_MODE_MESSAGE).toContain("Paiements en mode test");
  });

  it("protège le webhook de recharge et le retrait, avant tout mouvement", () => {
    const confirm = read("app/api/pay/topup/confirm/route.ts");
    expect(confirm).toContain("if (isRealMoneyBlocked()) return realMoneyBlockedResponse();");
    // Le secret est vérifié d'abord, le crédit n'intervient qu'après le garde-fou.
    expect(confirm.indexOf("isValidWebhookSecret(")).toBeLessThan(confirm.indexOf("isRealMoneyBlocked()"));
    expect(confirm.indexOf("isRealMoneyBlocked()")).toBeLessThan(confirm.indexOf('"pay_confirm_topup"'));

    const withdraw = read("app/api/pay/withdraw/route.ts");
    expect(withdraw).toContain("if (isRealMoneyBlocked()) return realMoneyBlockedResponse();");
    expect(withdraw.indexOf("isRealMoneyBlocked()")).toBeLessThan(withdraw.indexOf('supabase.rpc("pay_withdraw"'));
  });

  it("affiche le bandeau tant que l'interrupteur est désactivé", () => {
    const layout = read("app/dashboard/layout.tsx");
    expect(layout).toContain("const payTestMode = !isRealMoneyEnabled();");
    expect(layout).toContain("{payTestMode && <PayTestModeBanner />}");
    expect(read("utils/constants.ts")).toContain('TEST_MODE_BANNER: "Paiements en mode test"');
  });
});

describe("Fermeture de compte : suppression ou anonymisation", () => {
  const clean: AccountCommitments = {
    wallet_balances: [0],
    escrow_contributions: 0,
    undelivered_orders: 0,
    project_shares: 0,
  };

  it("supprime un compte sans engagement", () => {
    expect(accountDeletionBlockers(clean)).toEqual([]);
    expect(accountClosureAction(clean)).toBe("delete");
    expect(accountClosureAction({ ...clean, wallet_balances: [] })).toBe("delete");
  });

  it("anonymise dès qu'un engagement existe", () => {
    expect(accountDeletionBlockers({ ...clean, wallet_balances: [0, 150] })).toEqual(["wallet_balance"]);
    expect(accountDeletionBlockers({ ...clean, escrow_contributions: 1 })).toEqual(["escrow_contribution"]);
    expect(accountDeletionBlockers({ ...clean, undelivered_orders: 2 })).toEqual(["undelivered_order"]);
    expect(accountDeletionBlockers({ ...clean, project_shares: 1 })).toEqual(["project_share"]);
    expect(
      accountDeletionBlockers({
        wallet_balances: [10],
        escrow_contributions: 1,
        undelivered_orders: 1,
        project_shares: 1,
      }),
    ).toEqual([...ACCOUNT_DELETION_BLOCKERS]);
    expect(accountClosureAction({ ...clean, wallet_balances: [1] })).toBe("anonymized");
  });

  it("lit les mêmes motifs en base", () => {
    const blockers = sqlFunction("account_deletion_blockers");
    for (const blocker of ACCOUNT_DELETION_BLOCKERS) {
      expect(blockers).toContain(`then '${blocker}' end`);
    }
    expect(blockers).toContain("w.user_id = p_user_id and w.balance <> 0");
    expect(blockers).toContain("c.refunded_at is null and p.settled_at is null");
    expect(blockers).toContain("o.status not in ('delivered', 'cancelled')");
    expect(blockers).toContain("p.status = 'funded'");
  });

  it("refuse en base la suppression d'un compte engagé, d'où qu'elle vienne", () => {
    const guard = sqlFunction("account_guard_user_delete");
    expect(guard).toContain("public.account_deletion_blockers(old.id)");
    expect(guard).toMatch(/raise exception [^;]+using errcode = 'AC001';/);
    expect(MIGRATION).toMatch(
      /create trigger account_guard_user_delete\s+before delete on auth\.users\s+for each row execute function public\.account_guard_user_delete\(\);/,
    );
    expect(mapPayRpcError({ code: "AC001" }).status).toBe(409);
  });

  it("efface l'identité et garde l'identifiant et la comptabilité", () => {
    const close = sqlFunction("account_close");
    expect(close).toContain("set email = 'anonyme-' || id::text || '@anonymise.invalid',");
    expect(close).toContain("phone = null,");
    expect(close).toContain("encrypted_password = null,");
    expect(close).toContain("banned_until = now() + interval '100 years',");
    expect(close).toContain("delete from auth.sessions where user_id = p_user_id;");
    expect(close).toContain("set name = 'Compte anonymisé', email = null, phone = null");
    // Le compte et ses écritures ne sont jamais supprimés par cette fonction.
    expect(close).not.toContain("delete from auth.users");
    expect(close).not.toMatch(/(delete from|update) public\.pay_(wallets|transactions)/);
    expect(close).not.toContain("market_investment_contributions");
    expect(close).toContain("'account_anonymized:' || p_user_id::text");
  });

  it("ne supprime rien elle-même et reste idempotente", () => {
    const close = sqlFunction("account_close");
    expect(close).toContain("return jsonb_build_object('action', 'delete', 'reasons', '[]'::jsonb);");
    expect(close.indexOf("from public.account_anonymizations a where a.user_id = p_user_id")).toBeLessThan(
      close.indexOf("update auth.users"),
    );
    expect(close).toContain("'already', true");
  });

  it("réserve la fermeture au serveur", () => {
    for (const signature of [
      "account_deletion_blockers(uuid)",
      "account_guard_user_delete()",
      "account_close(uuid)",
    ]) {
      expect(MIGRATION).toContain(
        `revoke all on function public.${signature} from public, anon, authenticated;`,
      );
    }
    expect(MIGRATION).toContain("grant execute on function public.account_close(uuid) to service_role;");
    expect(MIGRATION).toContain("revoke all on public.account_anonymizations from anon, authenticated;");

    const route = read("app/api/account/delete/route.ts");
    expect(route).toContain("getAuthedContext()");
    // Un utilisateur ne ferme que son propre compte.
    expect(route).toContain('admin.rpc("account_close", { p_user_id: user.id })');
    expect(route).not.toContain("request.json");
  });

  it("interprète la réponse de la base", () => {
    expect(parseAccountClosure({ action: "delete", reasons: [] })).toEqual({ action: "delete", reasons: [] });
    expect(
      parseAccountClosure({ action: "anonymized", reasons: ["wallet_balance", "inconnu"], already: false }),
    ).toEqual({ action: "anonymized", reasons: ["wallet_balance"] });
    expect(parseAccountClosure([{ action: "delete" }])).toEqual({ action: "delete", reasons: [] });
    expect(parseAccountClosure({ action: "autre" })).toBeNull();
    expect(parseAccountClosure(null)).toBeNull();
  });
});

describe("Contrôle des variables de production", () => {
  const valid = {
    NEXT_PUBLIC_SUPABASE_URL: "https://abcdefghijklmnop.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "a".repeat(40),
    SUPABASE_SERVICE_ROLE_KEY: "b".repeat(40),
    NEXT_PUBLIC_BASE44_API_URL: "/api",
    NEXT_PUBLIC_USE_REAL_API: "1",
    CRON_SECRET: "c".repeat(64),
  };
  type Result = { name: string; level: string; detail: string };
  const errors = (env: Record<string, string>, options = {}) =>
    (runPreflight(env, options) as Result[]).filter((r) => r.level === "erreur").map((r) => r.name);

  it("accepte une configuration complète, interrupteur désactivé", () => {
    expect(errors(valid)).toEqual([]);
    const results = runPreflight(valid) as Result[];
    expect(results.find((r) => r.name === "PAY_REAL_MONEY")?.level).toBe("ok");
  });

  it("signale chaque variable requise absente", () => {
    expect(errors({}).sort()).toEqual(Object.keys(valid).sort());
  });

  it("refuse localhost, http, les valeurs d'exemple et un secret trop court", () => {
    expect(errors({ ...valid, NEXT_PUBLIC_SUPABASE_URL: "http://abc.supabase.co" })).toEqual(["NEXT_PUBLIC_SUPABASE_URL"]);
    expect(errors({ ...valid, NEXT_PUBLIC_SUPABASE_URL: "https://votre-projet.supabase.co" })).toEqual(["NEXT_PUBLIC_SUPABASE_URL"]);
    expect(errors({ ...valid, NEXT_PUBLIC_BASE44_API_URL: "http://localhost:3000/api" })).toEqual(["NEXT_PUBLIC_BASE44_API_URL"]);
    expect(errors({ ...valid, NEXT_PUBLIC_BASE44_API_URL: "https://app.assoshop.org/api" })).toEqual([]);
    expect(errors({ ...valid, CRON_SECRET: "court" })).toEqual(["CRON_SECRET"]);
    expect(errors({ ...valid, SUPABASE_SERVICE_ROLE_KEY: valid.NEXT_PUBLIC_SUPABASE_ANON_KEY })).toEqual(["SUPABASE_SERVICE_ROLE_KEY"]);
    expect(errors({ ...valid, AI_API_KEY: "clé-ia" })).toEqual(["AI_API_KEY"]);
  });

  it("refuse PAY_REAL_MONEY activé, sauf demande explicite", () => {
    expect(errors({ ...valid, PAY_REAL_MONEY: "1" })).toEqual(["PAY_REAL_MONEY"]);
    expect(errors({ ...valid, PAY_REAL_MONEY: "1" }, { allowRealMoney: true })).toEqual([]);
    expect(errors({ ...valid, PAY_REAL_MONEY: "0" })).toEqual([]);
  });

  it("exige les variables du Control Plane seulement s'il est activé", () => {
    expect(errors({ ...valid, CONTROL_PLANE_ENABLED: "1" })).toEqual(
      expect.arrayContaining(["CONTROL_PLANE_METRICS_URL", "CONTROL_PLANE_OUTBOUND_SECRET", "CONTROL_PLANE_INBOUND_SECRET"]),
    );
    expect(errors({ ...valid, CONTROL_PLANE_ENABLED: "0" })).toEqual([]);
  });

  it("vérifie les variables PG* uniquement pour les migrations", () => {
    expect(errors(valid, { migrations: true }).sort()).toEqual(["PGDATABASE", "PGHOST", "PGPASSWORD", "PGPORT", "PGUSER"]);
  });

  it("n'affiche jamais une valeur", () => {
    const secret = "valeur-tres-secrete-0123456789-abcdefghij";
    const output = JSON.stringify(
      runPreflight({ ...valid, CRON_SECRET: secret, SUPABASE_SERVICE_ROLE_KEY: secret + "x", PGPASSWORD: secret }, { migrations: true }),
    );
    expect(output).not.toContain(secret);
    expect(output).not.toContain(valid.NEXT_PUBLIC_SUPABASE_URL);
  });
});

describe("Planification (vercel.json)", () => {
  it("appelle les deux routes planifiées toutes les 15 minutes", () => {
    const config = JSON.parse(read("vercel.json")) as {
      crons: { path: string; schedule: string }[];
    };
    expect(config.crons).toEqual([
      { path: "/api/cron/investments/settle", schedule: "*/15 * * * *" },
      { path: "/api/control-plane/push", schedule: "*/15 * * * *" },
    ]);
    // Les planificateurs n'émettent que des GET : les deux routes en exportent un.
    expect(read("app/api/cron/investments/settle/route.ts")).toContain("export const GET = handle;");
    expect(read("app/api/control-plane/push/route.ts")).toContain("export const GET = handle;");
  });
});

describe("Application des migrations sur une base neuve", () => {
  it("ne prend pas une base vide pour une migration à moitié appliquée", async () => {
    // Script Node sans types.
    const { summarizeChecks } = await import("../../scripts/db-state.mjs");
    // Base vide : « table supprimée » ou « politique retirée » y sont vrais d'office.
    expect(summarizeChecks([{ ok: false }, { ok: true, negative: true }])).toEqual({
      present: false,
      partial: false,
    });
    expect(summarizeChecks([{ ok: false }, { ok: false }])).toEqual({ present: false, partial: false });
    expect(summarizeChecks([{ ok: true }, { ok: false }])).toEqual({ present: false, partial: true });
    expect(summarizeChecks([{ ok: true }, { ok: true, negative: true }])).toEqual({
      present: true,
      partial: false,
    });
  });
});
