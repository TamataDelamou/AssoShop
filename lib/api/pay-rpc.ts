import { NextResponse } from "next/server";

// Codes d'erreur (SQLSTATE) levés par les fonctions SQL de
// supabase/migrations/0017_wallet_integrity.sql.
const PAY_RPC_ERRORS: Record<string, { status: number; message: string }> = {
  PY001: { status: 400, message: "Montant invalide" },
  PY002: { status: 404, message: "Portefeuille introuvable" },
  PY003: { status: 400, message: "Solde insuffisant" },
  PY004: { status: 401, message: "Non authentifié" },
  PY005: { status: 404, message: "Commande introuvable" },
  PY006: { status: 403, message: "Action non autorisée" },
  PY007: { status: 400, message: "Commande déjà payée" },
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
