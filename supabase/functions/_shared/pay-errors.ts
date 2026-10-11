// Codes d'erreur (SQLSTATE) levés par les fonctions SQL de supabase/migrations.
// Même table que lib/api/pay-rpc.ts (application Next.js de référence) et que
// docs/CONTRAT_BACKEND_FLUTTER.md ; tests/unit/edge-functions.test.ts vérifie
// qu'elles restent identiques.
export const PAY_RPC_ERRORS: Record<string, { status: number; message: string }> = {
  PY001: { status: 400, message: "Montant invalide" },
  PY002: { status: 404, message: "Portefeuille introuvable" },
  PY003: { status: 400, message: "Solde insuffisant" },
  PY004: { status: 401, message: "Non authentifié" },
  PY005: { status: 404, message: "Commande introuvable" },
  PY006: { status: 403, message: "Action non autorisée" },
  PY007: { status: 400, message: "Commande déjà payée" },
  PY008: { status: 409, message: "Transition de statut non autorisée" },
  PY009: { status: 400, message: "Commande invalide" },
  PY010: { status: 409, message: "Paiement indisponible pour ce revendeur" },
  PY011: { status: 404, message: "Recharge introuvable" },
  PY012: { status: 409, message: "Recharge non confirmable" },
  PY013: { status: 400, message: "Transfert vers soi-même impossible" },
  PY014: { status: 404, message: "Destinataire introuvable" },
  PY015: { status: 409, message: "Devises incompatibles" },
  PY016: { status: 409, message: "Stock insuffisant" },
  PY017: { status: 400, message: "Quantité minimale de commande non atteinte" },
  PY018: { status: 404, message: "Élément introuvable" },
  PY019: { status: 409, message: "Opération impossible dans l'état actuel" },
  AC001: { status: 409, message: "Compte non supprimable : il doit être anonymisé" },
};

// Toute erreur inconnue donne un 500 sans exposer le détail SQL.
export function mapPayRpcError(error: unknown): { status: number; message: string } {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";
  return PAY_RPC_ERRORS[code] ?? { status: 500, message: "Erreur interne" };
}
