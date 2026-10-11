import { NextRequest, NextResponse } from "next/server";
import { payRpcErrorResponse, rpcRow } from "@/lib/api/pay-rpc";
import { isRealMoneyBlocked, realMoneyBlockedResponse } from "@/lib/api/pay-real-money";
import { getPayWebhookSecret, isValidWebhookSecret } from "@/lib/api/pay-topup";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

// POST /api/pay/topup/confirm  { "reference": "PAY-2026-XXXXXXXX" }
// Point d'entrée du futur webhook de l'opérateur Mobile Money : confirme une
// recharge « pending » et crédite le portefeuille (pay_confirm_topup).
//
// - Désactivée par défaut : sans PAY_WEBHOOK_SECRET, la route répond 404.
// - Serveur à serveur uniquement : en-tête Authorization: Bearer <secret>.
//   Aucune session utilisateur n'est acceptée.
// - Idempotente : rejouer la même référence ne crédite pas une seconde fois.
// - En production, refusée (503) tant que PAY_REAL_MONEY n'est pas activé :
//   aucun crédit en argent réel avant le choix du partenaire agréé.
export async function POST(request: NextRequest) {
  const secret = getPayWebhookSecret();
  if (!secret) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }
  if (!isValidWebhookSecret(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (isRealMoneyBlocked()) return realMoneyBlockedResponse();

  const payload = (await request.json().catch(() => null)) as {
    reference?: unknown;
  } | null;
  const reference =
    typeof payload?.reference === "string" ? payload.reference.trim() : "";
  if (!reference) {
    return NextResponse.json({ error: "Référence requise" }, { status: 400 });
  }

  const { data, error } = await createSupabaseAdminClient().rpc(
    "pay_confirm_topup",
    { p_reference: reference },
  );
  if (error) return payRpcErrorResponse(error);

  return NextResponse.json(rpcRow(data), {
    headers: { "Cache-Control": "no-store" },
  });
}
