import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { mapPayRpcError } from "@/lib/api/pay-rpc";
import {
  canAdvanceOrder,
  isManualAdvanceStatus,
  MANUAL_ADVANCE_STATUSES,
  ORDER_LOGISTICS_FLOW,
} from "@/lib/market-orders";
import { isUuid, parseTransferTarget } from "@/lib/pay-transfer";
import { OrderStatus } from "@/types/modules/market";

const MIGRATION = readFileSync(
  fileURLToPath(
    new URL(
      "../../supabase/migrations/0021_market_wallet_hardening.sql",
      import.meta.url,
    ),
  ),
  "utf8",
).replace(/\r\n/g, "\n");

// Corps d'une fonction SQL de la migration.
function sqlFunction(name: string): string {
  const start = MIGRATION.indexOf(`create or replace function public.${name}(`);
  if (start === -1) throw new Error(`Fonction ${name} introuvable dans 0021`);
  return MIGRATION.slice(start, MIGRATION.indexOf("$$;", start));
}

const MEMBER = "11111111-1111-4111-8111-111111111111";
const USER = "22222222-2222-4222-8222-222222222222";

describe("Transfert : désignation du destinataire", () => {
  it("accepte un membre ou un identifiant utilisateur", () => {
    expect(parseTransferTarget({ to_member_id: MEMBER })).toEqual({
      to_member_id: MEMBER,
      to_user_id: null,
    });
    expect(parseTransferTarget({ to_user_id: USER })).toEqual({
      to_member_id: null,
      to_user_id: USER,
    });
    expect(parseTransferTarget({ to_member_id: MEMBER, to_user_id: USER })).toEqual({
      to_member_id: MEMBER,
      to_user_id: USER,
    });
  });

  it("refuse un libellé libre ou une demande sans destinataire", () => {
    // Ancien contrat : { to_member: "Mamadou" }.
    expect(parseTransferTarget({ to_member: "Mamadou Bah" })).toBeNull();
    expect(parseTransferTarget({ to_member_id: "Mamadou Bah" })).toBeNull();
    expect(parseTransferTarget({ to_user_id: "u-2" })).toBeNull();
    expect(parseTransferTarget({ to_member_id: MEMBER, to_user_id: "x" })).toBeNull();
    expect(parseTransferTarget({ to_member_id: "", to_user_id: null })).toBeNull();
    expect(parseTransferTarget({})).toBeNull();
    expect(parseTransferTarget(null)).toBeNull();
    expect(parseTransferTarget("texte")).toBeNull();
  });

  it("reconnaît un identifiant uuid", () => {
    expect(isUuid(MEMBER)).toBe(true);
    expect(isUuid(MEMBER.toUpperCase())).toBe(true);
    expect(isUuid("1111")).toBe(false);
    expect(isUuid(`${MEMBER} `)).toBe(false);
    expect(isUuid(42)).toBe(false);
  });

  it("crédite le destinataire réel en base", () => {
    const transfer = sqlFunction("pay_transfer");
    // L'ancienne signature à libellé libre est supprimée.
    expect(MIGRATION).toContain("drop function if exists public.pay_transfer(integer, text, uuid);");
    expect(transfer).toContain("p_to_user_id uuid default null");
    expect(transfer).toContain("p_to_member_id uuid default null");
    expect(transfer).not.toMatch(/p_to_member text/);
    // Transfert vers soi-même refusé, deux portefeuilles verrouillés par id.
    expect(transfer).toMatch(/if v_recipient = v_user then\s+raise exception [^;]+PY013/);
    expect(transfer).toMatch(/where id in \(v_from_id, v_to_id\)\s+order by id\s+for update/);
    // Débit de l'émetteur, crédit du destinataire, deux écritures.
    expect(transfer).toContain("v_balance := v_from.balance - p_amount;");
    expect(transfer).toContain("v_balance := v_to.balance + p_amount;");
    expect(transfer).toContain("'transfer', 'confirmed', p_amount");
    expect(transfer).toContain("'receipt', 'confirmed', p_amount");
  });

  it("n'accepte un membre que d'une organisation commune", () => {
    const transfer = sqlFunction("pay_transfer");
    expect(transfer).toMatch(
      /m\.organization_id = v_member\.organization_id and m\.user_id = v_user/,
    );
  });
});

describe("Commandes marché : étapes déclarées par le revendeur", () => {
  it("limite l'avancement manuel à expédiée et arrivée", () => {
    expect(MANUAL_ADVANCE_STATUSES).toEqual([OrderStatus.SHIPPED, OrderStatus.ARRIVED]);
    expect(isManualAdvanceStatus("shipped")).toBe(true);
    expect(isManualAdvanceStatus("arrived")).toBe(true);
    // RG-M03 : « prête au retrait » passe par le scan ; « livrée » par la remise.
    expect(isManualAdvanceStatus("ready_for_pickup")).toBe(false);
    expect(isManualAdvanceStatus("delivered")).toBe(false);
    expect(isManualAdvanceStatus("confirmed")).toBe(false);
    expect(isManualAdvanceStatus("cancelled")).toBe(false);
    expect(isManualAdvanceStatus(undefined)).toBe(false);
  });

  it("reste un sous-ensemble du flux logistique", () => {
    for (const status of MANUAL_ADVANCE_STATUSES) {
      expect(ORDER_LOGISTICS_FLOW).toContain(status);
    }
    expect(canAdvanceOrder({ status: OrderStatus.CONFIRMED, paid: true }, OrderStatus.SHIPPED)).toBe(true);
    expect(canAdvanceOrder({ status: OrderStatus.SHIPPED, paid: true }, OrderStatus.ARRIVED)).toBe(true);
    expect(canAdvanceOrder({ status: OrderStatus.CONFIRMED, paid: true }, OrderStatus.ARRIVED)).toBe(false);
  });
});

describe("Migration 0021 : politiques et écritures directes", () => {
  it("retire les politiques trop larges", () => {
    for (const [policy, table] of [
      ["market_group_orders_update", "market_group_orders"],
      ["market_group_orders_insert", "market_group_orders"],
      ["market_group_participants_insert", "market_group_order_participants"],
      ["market_projects_update", "market_investment_projects"],
      ["market_projects_insert", "market_investment_projects"],
      ["market_contribs_insert", "market_investment_contributions"],
      ["market_pickups_insert", "market_pickup_records"],
      ["market_pickups_update", "market_pickup_records"],
    ]) {
      expect(MIGRATION).toContain(`drop policy if exists "${policy}" on public.${table};`);
    }
    // Aucune politique d'écriture n'est recréée.
    expect(MIGRATION).not.toMatch(/create policy/);
  });

  it("retire les privilèges d'écriture aux rôles client", () => {
    for (const table of [
      "market_group_orders",
      "market_group_order_participants",
      "market_investment_projects",
      "market_investment_contributions",
      "market_pickup_records",
    ]) {
      expect(MIGRATION).toContain(
        `revoke insert, update, delete, truncate on public.${table} from anon, authenticated;`,
      );
    }
  });

  it("réserve les modifications au créateur ou au revendeur concerné", () => {
    expect(sqlFunction("market_close_group_order")).toMatch(
      /v_group\.creator_id is distinct from v_user and not exists/,
    );
    for (const name of ["market_update_investment_rules", "market_close_investment_project"]) {
      expect(sqlFunction(name)).toMatch(/v_project\.created_by is distinct from v_user/);
    }
    // RG-M05 : règles figées après le premier investissement.
    expect(sqlFunction("market_update_investment_rules")).toMatch(/if v_project\.rules_locked then/);
    expect(sqlFunction("market_invest")).toContain("rules_locked = true");
  });

  it("prend le prix d'une commande groupée sur le produit", () => {
    const create = sqlFunction("market_create_group_order");
    expect(create).not.toMatch(/p_unit_price/);
    expect(create).toContain("v_product.retail_price");
  });
});

describe("Migration 0021 : portefeuille plateforme", () => {
  it("crée un portefeuille unique sans utilisateur", () => {
    expect(MIGRATION).toContain("check ((type = 'platform') = (user_id is null));");
    expect(MIGRATION).toMatch(/create unique index if not exists idx_pay_wallets_platform\s+on public\.pay_wallets \(type\)\s+where type = 'platform';/);
    expect(MIGRATION).toContain(
      "revoke all on function public.pay_credit_platform(integer) from public, anon, authenticated;",
    );
  });

  it("crédite les commissions dans la même transaction que l'opération", () => {
    expect(sqlFunction("pay_withdraw")).toContain("perform public.pay_credit_platform(v_commission);");
    expect(sqlFunction("pay_confirm_topup")).toContain("perform public.pay_credit_platform(v_tx.commission);");
    expect(sqlFunction("market_pay_order")).toContain("perform public.pay_credit_platform(v_commission);");
  });

  it("verrouille la plateforme après les portefeuilles utilisateurs", () => {
    // Ordre de verrou fixe : pas d'interblocage entre opérations concurrentes.
    for (const name of ["pay_withdraw", "pay_confirm_topup", "market_pay_order"]) {
      const body = sqlFunction(name);
      expect(body.indexOf("pay_credit_platform")).toBeGreaterThan(
        body.lastIndexOf("update public.pay_wallets"),
      );
    }
  });

  it("ne crédite pas deux fois une recharge déjà confirmée", () => {
    const confirm = sqlFunction("pay_confirm_topup");
    expect(confirm.indexOf("if v_tx.status = 'confirmed' then")).toBeLessThan(
      confirm.indexOf("pay_credit_platform"),
    );
  });

  it("expose le solde dans les métriques du Control Plane", () => {
    expect(sqlFunction("cp_metrics_snapshot")).toContain("'platform_wallet_balance'");
  });
});

describe("Migration 0021 : stock", () => {
  it("contrôle le stock et la quantité minimale à la commande", () => {
    const create = sqlFunction("market_create_order");
    expect(create).toContain("l.quantity < p.min_order_quantity");
    expect(create).toContain("l.quantity > p.stock");
    expect(create).toMatch(/PY017/);
    expect(create).toMatch(/PY016/);
  });

  it("verrouille les produits puis décrémente le stock au paiement", () => {
    const pay = sqlFunction("market_pay_order");
    const lock = pay.indexOf("from public.market_products p\n  where p.id in");
    const check = pay.indexOf("i.quantity > p.stock");
    const decrement = pay.indexOf("set stock = p.stock - i.quantity");
    expect(lock).toBeGreaterThan(-1);
    expect(check).toBeGreaterThan(lock);
    expect(decrement).toBeGreaterThan(check);
    // Le contrôle du solde précède toute écriture.
    expect(pay.indexOf("if v_buyer_wallet.balance < v_total then")).toBeLessThan(decrement);
  });

  it("interdit un stock négatif", () => {
    expect(MIGRATION).toContain("check (stock >= 0) not valid;");
  });
});

describe("Migration 0021 : codes d'erreur", () => {
  it("traduit les nouveaux codes en statut HTTP", () => {
    expect(mapPayRpcError({ code: "PY013" })).toEqual({
      status: 400,
      message: "Transfert vers soi-même impossible",
    });
    expect(mapPayRpcError({ code: "PY014" }).status).toBe(404);
    expect(mapPayRpcError({ code: "PY015" }).status).toBe(409);
    expect(mapPayRpcError({ code: "PY016" })).toEqual({ status: 409, message: "Stock insuffisant" });
    expect(mapPayRpcError({ code: "PY017" }).status).toBe(400);
    expect(mapPayRpcError({ code: "PY018" }).status).toBe(404);
    expect(mapPayRpcError({ code: "PY019" }).status).toBe(409);
  });

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
