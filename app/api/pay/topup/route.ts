import { NextRequest, NextResponse } from "next/server";
import { getAuthedContext } from "@/lib/api/auth";
import { parseAmount, payRpcErrorResponse, rpcRow } from "@/lib/api/pay-rpc";
import { canAutoConfirmTopup } from "@/lib/api/pay-topup";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const payload = (await request.json().catch(() => null)) as {
    wallet_id?: string;
    provider?: string;
    phone?: string;
    amount?: number;
  } | null;

  const amount = parseAmount(payload?.amount);
  if (amount === null) {
    return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
  }

  // pay_topup ne crédite rien : elle crée une transaction « pending ». Le
  // crédit n'intervient qu'à la confirmation serveur (pay_confirm_topup),
  // déclenchée par le webhook de l'opérateur : POST /api/pay/topup/confirm.
  const { data, error } = await supabase.rpc("pay_topup", {
    p_amount: amount,
    p_wallet_id: payload?.wallet_id ?? null,
    p_provider: payload?.provider ?? "",
  });
  if (error) return payRpcErrorResponse(error);

  const pending = rpcRow<{ reference: string }>(data);

  // Démo uniquement (hors production et hors backend réel) : pas d'opérateur
  // branché, la recharge est confirmée tout de suite.
  if (pending && canAutoConfirmTopup()) {
    const { data: confirmed, error: confirmError } =
      await createSupabaseAdminClient().rpc("pay_confirm_topup", {
        p_reference: pending.reference,
      });
    if (!confirmError && confirmed) {
      return NextResponse.json(rpcRow(confirmed));
    }
  }

  return NextResponse.json(pending);
}
