import type { SupabaseClient } from "@supabase/supabase-js";

// Dénouement des séquestres d'investissement échus (migration 0023) :
// versement au porteur si l'objectif est atteint, remboursement intégral
// sinon. Tout se passe dans la fonction SQL market_settle_due_investments,
// réservée au service_role et idempotente.

export interface InvestmentSettlementReport {
  released: number;
  refunded: number;
  expired: number;
  failed: { project_id: string; code: string; error: string }[];
  // Renseigné si l'appel lui-même a échoué (aucun projet traité).
  error?: string;
}

export function parseSettlementReport(data: unknown): InvestmentSettlementReport {
  const raw = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const count = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) ? value : 0;
  return {
    released: count(raw.released),
    refunded: count(raw.refunded),
    expired: count(raw.expired),
    failed: Array.isArray(raw.failed)
      ? (raw.failed as InvestmentSettlementReport["failed"])
      : [],
  };
}

// `supabase` doit être le client service_role. Ne lève jamais : un échec est
// rapporté dans le compte rendu et journalisé.
export async function settleDueInvestments(
  supabase: SupabaseClient,
): Promise<InvestmentSettlementReport> {
  const { data, error } = await supabase.rpc("market_settle_due_investments");
  if (error) {
    console.error(`[investissements] dénouement impossible : ${error.message}`);
    return { released: 0, refunded: 0, expired: 0, failed: [], error: "indisponible" };
  }
  const report = parseSettlementReport(data);
  for (const failure of report.failed) {
    console.error(
      `[investissements] projet ${failure.project_id} non dénoué (${failure.code}) : ${failure.error}`,
    );
  }
  return report;
}
