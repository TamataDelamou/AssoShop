// Séquestre des investissements (migration 0023) : miroir TypeScript des
// règles appliquées en base. Les mouvements de fonds restent exclusivement
// dans les fonctions SQL ; ce module sert à l'affichage et aux tests.

import { InvestmentShare } from "@/types/modules/market";

export const INVESTMENT_COMMISSION_SERVICE = "Commission investissement";

export type InvestmentSettlement = "released" | "refunded" | "expired" | "skipped";

export interface SettlementInput {
  status: string;
  settled: boolean;
  // Date limite de collecte (AAAA-MM-JJ), incluse.
  deadline: string | null;
  target_amount: number;
  // Somme des contributions non remboursées.
  escrow_total: number;
  has_owner: boolean;
}

// Dénouement « tout ou rien » d'un projet à la date `today` (AAAA-MM-JJ).
// Même décision que market_settle_investment_project.
export function settlementOutcome(
  project: SettlementInput,
  today: string,
): InvestmentSettlement {
  if (project.settled) return "skipped";
  const abandoned = project.status === "closed";
  if (!abandoned && (project.deadline === null || today <= project.deadline)) {
    return "skipped";
  }
  if (project.escrow_total === 0) return "expired";
  if (abandoned || project.escrow_total < project.target_amount || !project.has_owner) {
    return "refunded";
  }
  return "released";
}

// Commission plateforme (taux en %), arrondie comme market_commission.
export function investmentCommission(total: number, rate: number): number {
  return Math.round((total * rate) / 100);
}

export interface Stake {
  user_id: string;
  amount: number;
}

// Mise totale par investisseur, dans l'ordre de première contribution.
export function stakesByInvestor(contributions: Stake[]): Stake[] {
  const totals = new Map<string, number>();
  for (const c of contributions) {
    totals.set(c.user_id, (totals.get(c.user_id) ?? 0) + c.amount);
  }
  return Array.from(totals, ([user_id, amount]) => ({ user_id, amount }));
}

// Répartition d'un bénéfice au prorata des mises, arrondie à l'unité
// inférieure : la somme versée ne dépasse jamais le montant déclaré.
export function distributeProRata(amount: number, stakes: Stake[]): Stake[] {
  const total = stakes.reduce((sum, s) => sum + s.amount, 0);
  if (total <= 0 || amount <= 0) return stakes.map((s) => ({ ...s, amount: 0 }));
  return stakes.map((s) => ({
    user_id: s.user_id,
    // BigInt : le produit peut dépasser 2^53.
    amount: Number((BigInt(amount) * BigInt(s.amount)) / BigInt(total)),
  }));
}

// Part de chaque investisseur, sans identité : seul l'utilisateur courant est
// signalé.
export function investorShares(
  contributions: Stake[],
  currentUserId: string,
): InvestmentShare[] {
  const stakes = stakesByInvestor(contributions);
  const total = stakes.reduce((sum, s) => sum + s.amount, 0);
  return stakes
    .map((s) => ({
      is_me: s.user_id === currentUserId,
      amount: s.amount,
      percent: total > 0 ? Math.round((s.amount * 1000) / total) / 10 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}
