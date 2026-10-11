// Fermeture de compte (migration 0024) : miroir TypeScript de la décision
// prise en base par account_close / account_deletion_blockers.

// Motifs qui interdisent la suppression : le compte est alors anonymisé.
export const ACCOUNT_DELETION_BLOCKERS = [
  "wallet_balance",
  "escrow_contribution",
  "undelivered_order",
  "project_share",
] as const;

export type AccountDeletionBlocker = (typeof ACCOUNT_DELETION_BLOCKERS)[number];

export interface AccountClosure {
  action: "delete" | "anonymized";
  reasons: AccountDeletionBlocker[];
}

// État financier d'un compte, tel que le lit account_deletion_blockers.
export interface AccountCommitments {
  wallet_balances: number[];
  // Contributions non remboursées dans un projet non dénoué.
  escrow_contributions: number;
  // Commandes ni livrées ni annulées, comme acheteur ou revendeur.
  undelivered_orders: number;
  // Mises dans un projet financé, ou projets portés financés / avec contributions.
  project_shares: number;
}

export function accountDeletionBlockers(
  account: AccountCommitments,
): AccountDeletionBlocker[] {
  const blockers: AccountDeletionBlocker[] = [];
  if (account.wallet_balances.some((balance) => balance !== 0)) {
    blockers.push("wallet_balance");
  }
  if (account.escrow_contributions > 0) blockers.push("escrow_contribution");
  if (account.undelivered_orders > 0) blockers.push("undelivered_order");
  if (account.project_shares > 0) blockers.push("project_share");
  return blockers;
}

// Supprimé seulement s'il ne porte aucun engagement ; anonymisé sinon.
export function accountClosureAction(
  account: AccountCommitments,
): AccountClosure["action"] {
  return accountDeletionBlockers(account).length === 0 ? "delete" : "anonymized";
}

// Réponse de la fonction SQL account_close. Renvoie null si elle est illisible.
export function parseAccountClosure(data: unknown): AccountClosure | null {
  const raw = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
  if (!raw || typeof raw !== "object") return null;
  if (raw.action !== "delete" && raw.action !== "anonymized") return null;
  const reasons = Array.isArray(raw.reasons)
    ? raw.reasons.filter((reason): reason is AccountDeletionBlocker =>
        (ACCOUNT_DELETION_BLOCKERS as readonly string[]).includes(reason as string),
      )
    : [];
  return { action: raw.action, reasons };
}
