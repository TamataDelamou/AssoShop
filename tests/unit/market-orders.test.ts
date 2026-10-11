import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { mapPayRpcError } from "@/lib/api/pay-rpc";
import {
  canAutoConfirmTopup,
  getPayWebhookSecret,
  isValidWebhookSecret,
} from "@/lib/api/pay-topup";
import {
  canAdvanceOrder,
  canCancelOrder,
  nextOrderStatus,
  ORDER_LOGISTICS_FLOW,
  parseOrderLines,
  RESELLER_COMMISSION_SERVICE,
  splitOrderPayment,
} from "@/lib/market-orders";
import { OrderStatus } from "@/types/modules/market";

const MIGRATION = readFileSync(
  fileURLToPath(
    new URL(
      "../../supabase/migrations/0019_market_topup_integrity.sql",
      import.meta.url,
    ),
  ),
  "utf8",
);

// Corps d'une fonction SQL de la migration.
function sqlFunction(name: string): string {
  const start = MIGRATION.indexOf(`create or replace function public.${name}(`);
  if (start === -1) throw new Error(`Fonction ${name} introuvable dans 0019`);
  return MIGRATION.slice(start, MIGRATION.indexOf("$$;", start));
}

describe("Commandes marché : transitions", () => {
  it("suit le même ordre logistique que la migration", () => {
    const match = /v_flow constant text\[\] := array\[([^\]]+)\]/.exec(MIGRATION);
    expect(match).not.toBeNull();
    const sqlFlow = Array.from(match![1].matchAll(/'([^']+)'/g), (m) => m[1]);
    expect(sqlFlow).toEqual(ORDER_LOGISTICS_FLOW);
  });

  it("avance d'une seule étape à la fois", () => {
    expect(nextOrderStatus(OrderStatus.CONFIRMED)).toBe(OrderStatus.SHIPPED);
    expect(nextOrderStatus(OrderStatus.SHIPPED)).toBe(OrderStatus.ARRIVED);
    expect(nextOrderStatus(OrderStatus.ARRIVED)).toBe(OrderStatus.READY_FOR_PICKUP);
    expect(nextOrderStatus(OrderStatus.READY_FOR_PICKUP)).toBe(OrderStatus.DELIVERED);
    expect(nextOrderStatus(OrderStatus.DELIVERED)).toBeNull();
    expect(nextOrderStatus(OrderStatus.PENDING_PAYMENT)).toBeNull();
    expect(nextOrderStatus(OrderStatus.CANCELLED)).toBeNull();
  });

  it("autorise le revendeur uniquement sur l'étape suivante d'une commande payée", () => {
    const paid = { status: OrderStatus.CONFIRMED, paid: true };
    expect(canAdvanceOrder(paid, OrderStatus.SHIPPED)).toBe(true);
    // Saut d'étape, retour en arrière, statut identique.
    expect(canAdvanceOrder(paid, OrderStatus.ARRIVED)).toBe(false);
    expect(canAdvanceOrder(paid, OrderStatus.DELIVERED)).toBe(false);
    expect(canAdvanceOrder(paid, OrderStatus.CONFIRMED)).toBe(false);
    expect(
      canAdvanceOrder({ status: OrderStatus.SHIPPED, paid: true }, OrderStatus.CONFIRMED),
    ).toBe(false);
  });

  it("refuse tout avancement d'une commande non payée, annulée ou livrée", () => {
    expect(
      canAdvanceOrder({ status: OrderStatus.CONFIRMED, paid: false }, OrderStatus.SHIPPED),
    ).toBe(false);
    for (const to of Object.values(OrderStatus)) {
      expect(canAdvanceOrder({ status: OrderStatus.PENDING_PAYMENT, paid: false }, to)).toBe(false);
      expect(canAdvanceOrder({ status: OrderStatus.CANCELLED, paid: false }, to)).toBe(false);
      expect(canAdvanceOrder({ status: OrderStatus.DELIVERED, paid: true }, to)).toBe(false);
    }
  });

  it("ne permet jamais au revendeur de marquer une commande payée ou annulée", () => {
    for (const status of Object.values(OrderStatus)) {
      for (const paid of [true, false]) {
        expect(canAdvanceOrder({ status, paid }, OrderStatus.CONFIRMED)).toBe(false);
        expect(canAdvanceOrder({ status, paid }, OrderStatus.CANCELLED)).toBe(false);
        expect(canAdvanceOrder({ status, paid }, OrderStatus.PENDING_PAYMENT)).toBe(false);
      }
    }
  });

  it("limite l'annulation acheteur aux commandes non payées", () => {
    expect(canCancelOrder({ status: OrderStatus.PENDING_PAYMENT, paid: false })).toBe(true);
    expect(canCancelOrder({ status: OrderStatus.PENDING_PAYMENT, paid: true })).toBe(false);
    expect(canCancelOrder({ status: OrderStatus.CONFIRMED, paid: true })).toBe(false);
    expect(canCancelOrder({ status: OrderStatus.SHIPPED, paid: true })).toBe(false);
    expect(canCancelOrder({ status: OrderStatus.CANCELLED, paid: false })).toBe(false);
  });

  it("valide les lignes d'une commande", () => {
    expect(parseOrderLines([{ product_id: "p-1", quantity: 2 }])).toEqual([
      { product_id: "p-1", quantity: 2 },
    ]);
    // Un prix ou un total envoyé par le navigateur est ignoré.
    expect(
      parseOrderLines([{ product_id: "p-1", quantity: 1, unit_price: 1, total: 1 }]),
    ).toEqual([{ product_id: "p-1", quantity: 1 }]);
    expect(parseOrderLines([])).toBeNull();
    expect(parseOrderLines(undefined)).toBeNull();
    expect(parseOrderLines([{ product_id: "p-1", quantity: 0 }])).toBeNull();
    expect(parseOrderLines([{ product_id: "p-1", quantity: -3 }])).toBeNull();
    expect(parseOrderLines([{ product_id: "p-1", quantity: 1.5 }])).toBeNull();
    expect(parseOrderLines([{ product_id: "", quantity: 1 }])).toBeNull();
    expect(parseOrderLines([{ quantity: 1 }])).toBeNull();
  });
});

describe("Commandes marché : commission revendeur", () => {
  it("partage le paiement entre revendeur et plateforme", () => {
    expect(splitOrderPayment(100000, 0.7)).toEqual({ total: 100000, commission: 700, net: 99300 });
    expect(splitOrderPayment(250000, 1)).toEqual({ total: 250000, commission: 2500, net: 247500 });
    expect(splitOrderPayment(50000, 0)).toEqual({ total: 50000, commission: 0, net: 50000 });
  });

  it("arrondit la commission à l'unité et conserve la somme", () => {
    // 0,7 % de 12 345 = 86,415 → 86.
    expect(splitOrderPayment(12345, 0.7)).toEqual({ total: 12345, commission: 86, net: 12259 });
    // 0,7 % de 12 500 = 87,5 → 88.
    expect(splitOrderPayment(12500, 0.7)?.commission).toBe(88);
    for (const total of [1, 99, 12345, 1999999]) {
      const split = splitOrderPayment(total, 0.7)!;
      expect(split.commission + split.net).toBe(total);
      expect(split.net).toBeGreaterThanOrEqual(0);
    }
  });

  it("refuse un total ou un taux invalide", () => {
    expect(splitOrderPayment(0, 0.7)).toBeNull();
    expect(splitOrderPayment(-100, 0.7)).toBeNull();
    expect(splitOrderPayment(10.5, 0.7)).toBeNull();
    expect(splitOrderPayment(1000, -1)).toBeNull();
    expect(splitOrderPayment(1000, 101)).toBeNull();
    expect(splitOrderPayment(1000, Number.NaN)).toBeNull();
  });

  it("applique en base la même formule et le même service de commission", () => {
    expect(sqlFunction("market_commission")).toContain("round(p_total * p_rate / 100.0)::integer");
    const pay = sqlFunction("market_pay_order");
    expect(pay).toContain(`c.service = '${RESELLER_COMMISSION_SERVICE}'`);
    expect(pay).toContain("v_net := v_total - v_commission");
    // Deux écritures : paiement de l'acheteur, encaissement du revendeur.
    expect(pay).toContain("'payment', 'confirmed', v_total");
    expect(pay).toContain("'receipt', 'confirmed', v_net");
  });
});

describe("Migration 0019 : garde-fous", () => {
  it("retire toute écriture client sur les commandes", () => {
    expect(MIGRATION).toContain('drop policy if exists "market_orders_update" on public.market_orders;');
    expect(MIGRATION).toContain('drop policy if exists "market_orders_insert" on public.market_orders;');
    expect(MIGRATION).toContain(
      "revoke insert, update, delete, truncate on public.market_orders from anon, authenticated;",
    );
    expect(MIGRATION).toContain(
      "revoke insert, update, delete, truncate on public.market_order_items from anon, authenticated;",
    );
    expect(MIGRATION).not.toMatch(/create policy "[^"]+"\s+on public\.market_orders for (insert|update|delete)/);
  });

  it("ne laisse pas le revendeur toucher à paid ni à total", () => {
    const advance = sqlFunction("market_advance_order");
    expect(advance).not.toMatch(/\bpaid\s*=/);
    expect(advance).not.toMatch(/\btotal\s*=/);
  });

  it("ne crédite plus rien à la demande de recharge", () => {
    const topup = sqlFunction("pay_topup");
    expect(topup).toContain("'topup', 'pending'");
    expect(topup).not.toContain("update public.pay_wallets");
  });

  it("réserve la confirmation de recharge au service_role, sans double crédit", () => {
    const confirm = sqlFunction("pay_confirm_topup");
    expect(confirm).toContain("for update");
    expect(confirm).toMatch(/if v_tx\.status = 'confirmed' then\s+return v_tx;/);
    expect(MIGRATION).toContain(
      "revoke all on function public.pay_confirm_topup(text) from public, anon, authenticated;",
    );
    expect(MIGRATION).toContain("grant execute on function public.pay_confirm_topup(text) to service_role;");
  });

  it("traduit les nouveaux codes d'erreur", () => {
    expect(mapPayRpcError({ code: "PY008" }).status).toBe(409);
    expect(mapPayRpcError({ code: "PY009" }).status).toBe(400);
    expect(mapPayRpcError({ code: "PY010" }).status).toBe(409);
    expect(mapPayRpcError({ code: "PY011" }).status).toBe(404);
    expect(mapPayRpcError({ code: "PY012" }).status).toBe(409);
  });
});

describe("Recharge : confirmation serveur", () => {
  it("désactive le webhook sans secret", () => {
    expect(getPayWebhookSecret({})).toBeNull();
    expect(getPayWebhookSecret({ PAY_WEBHOOK_SECRET: "" })).toBeNull();
    expect(getPayWebhookSecret({ PAY_WEBHOOK_SECRET: "   " })).toBeNull();
    expect(getPayWebhookSecret({ PAY_WEBHOOK_SECRET: "s3cret" })).toBe("s3cret");
  });

  it("n'accepte que le secret exact en Bearer", () => {
    expect(isValidWebhookSecret("Bearer s3cret", "s3cret")).toBe(true);
    expect(isValidWebhookSecret("Bearer s3cre", "s3cret")).toBe(false);
    expect(isValidWebhookSecret("Bearer s3cret ", "s3cret")).toBe(false);
    expect(isValidWebhookSecret("s3cret", "s3cret")).toBe(false);
    expect(isValidWebhookSecret("Basic s3cret", "s3cret")).toBe(false);
    expect(isValidWebhookSecret("", "s3cret")).toBe(false);
    expect(isValidWebhookSecret(null, "s3cret")).toBe(false);
  });

  it("ne confirme automatiquement qu'en démo (hors production et hors API réelle)", () => {
    expect(canAutoConfirmTopup({ NODE_ENV: "development" })).toBe(true);
    expect(canAutoConfirmTopup({ NODE_ENV: "development", NEXT_PUBLIC_USE_REAL_API: "0" })).toBe(true);
    expect(canAutoConfirmTopup({ NODE_ENV: "development", NEXT_PUBLIC_USE_REAL_API: "1" })).toBe(false);
    expect(canAutoConfirmTopup({ NODE_ENV: "production" })).toBe(false);
    expect(canAutoConfirmTopup({ NODE_ENV: "production", NEXT_PUBLIC_USE_REAL_API: "0" })).toBe(false);
  });
});
