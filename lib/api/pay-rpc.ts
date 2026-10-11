import { NextResponse } from "next/server";

// Codes d'erreur (SQLSTATE) levés par les fonctions SQL de
// supabase/migrations (0017, 0019, 0021 à 0024).
const PAY_RPC_ERRORS: Record<string, { status: number; message: string }> = {
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

export interface PayRpcFailure {
  status: number;
  message: string;
}

// Traduit une erreur renvoyée par supabase.rpc() en statut HTTP + message.
// Toute erreur inconnue donne un 500 sans exposer le détail SQL au client.
export function mapPayRpcError(error: unknown): PayRpcFailure {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";
  return PAY_RPC_ERRORS[code] ?? { status: 500, message: "Erreur interne" };
}

export function payRpcErrorResponse(error: unknown): NextResponse {
  const { status, message } = mapPayRpcError(error);
  return NextResponse.json({ error: message }, { status });
}

// Montant accepté par les fonctions SQL (colonne integer) : entier strictement
// positif. Renvoie null sinon (décimal, NaN, chaîne, négatif, hors bornes).
export function parseAmount(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value <= 0 || value > 2_147_483_647) return null;
  return value;
}

// Une fonction SQL qui renvoie une ligne composite arrive sous forme d'objet ;
// on tolère aussi le tableau à un élément.
export function rpcRow<T>(data: unknown): T | null {
  const row = Array.isArray(data) ? data[0] : data;
  return (row as T) ?? null;
}
