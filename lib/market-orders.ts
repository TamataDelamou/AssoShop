import { OrderStatus } from "@/types/modules/market";

// Règles des commandes marché, miroir de
// supabase/migrations/0019_market_topup_integrity.sql (les fonctions SQL font
// foi ; la cohérence est vérifiée par tests/unit/market-orders.test.ts).

// Étapes logistiques qu'un revendeur fait avancer, une à la fois et dans cet
// ordre, sur une commande payée (market_advance_order).
export const ORDER_LOGISTICS_FLOW: OrderStatus[] = [
  OrderStatus.CONFIRMED,
  OrderStatus.SHIPPED,
  OrderStatus.ARRIVED,
  OrderStatus.READY_FOR_PICKUP,
  OrderStatus.DELIVERED,
];

// Étapes que le revendeur déclare lui-même. « Prête au retrait » passe par
// le scan du colis (RG-M03) et « livrée » par la remise au client.
export const MANUAL_ADVANCE_STATUSES: OrderStatus[] = [
  OrderStatus.SHIPPED,
  OrderStatus.ARRIVED,
];

export function isManualAdvanceStatus(value: unknown): value is OrderStatus {
  return (
    typeof value === "string" &&
    (MANUAL_ADVANCE_STATUSES as string[]).includes(value)
  );
}

// Libellé du taux lu dans admin_commissions (market_pay_order).
export const RESELLER_COMMISSION_SERVICE = "Commission revendeur B2B";

export function isOrderStatus(value: unknown): value is OrderStatus {
  return (
    typeof value === "string" &&
    (Object.values(OrderStatus) as string[]).includes(value)
  );
}

// Étape logistique suivante, ou null si le statut n'en a pas.
export function nextOrderStatus(status: OrderStatus): OrderStatus | null {
  const index = ORDER_LOGISTICS_FLOW.indexOf(status);
  if (index === -1 || index === ORDER_LOGISTICS_FLOW.length - 1) return null;
  return ORDER_LOGISTICS_FLOW[index + 1];
}

// Le revendeur peut-il faire passer la commande de son statut à `to` ?
export function canAdvanceOrder(
  order: { status: OrderStatus; paid: boolean },
  to: OrderStatus,
): boolean {
  return order.paid && nextOrderStatus(order.status) === to;
}

// L'acheteur ne peut annuler qu'une commande en attente de paiement.
export function canCancelOrder(order: {
  status: OrderStatus;
  paid: boolean;
}): boolean {
  return !order.paid && order.status === OrderStatus.PENDING_PAYMENT;
}

export interface OrderSplit {
  // Débité à l'acheteur.
  total: number;
  // Retenu par la plateforme.
  commission: number;
  // Crédité au revendeur.
  net: number;
}

// Partage d'un paiement de commande. `ratePercent` est un pourcentage
// (0.7 = 0,7 %), comme admin_commissions.rate. Renvoie null si le total ou le
// taux est invalide.
export function splitOrderPayment(
  total: number,
  ratePercent: number,
): OrderSplit | null {
  if (!Number.isInteger(total) || total <= 0) return null;
  if (!Number.isFinite(ratePercent) || ratePercent < 0 || ratePercent > 100) {
    return null;
  }
  const commission = Math.round((total * ratePercent) / 100);
  return { total, commission, net: total - commission };
}

export interface OrderLine {
  product_id: string;
  quantity: number;
}

// Lignes acceptées par market_create_order : identifiant de produit et
// quantité entière strictement positive. Renvoie null si le panier est invalide.
export function parseOrderLines(value: unknown): OrderLine[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const lines: OrderLine[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return null;
    const { product_id, quantity } = entry as Record<string, unknown>;
    if (typeof product_id !== "string" || !product_id) return null;
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity <= 0) {
      return null;
    }
    lines.push({ product_id, quantity });
  }
  return lines;
}
