import { NextRequest, NextResponse } from "next/server";
import { getAuthedContext } from "@/lib/api/auth";
import { parseAmount, payRpcErrorResponse, rpcRow } from "@/lib/api/pay-rpc";
import { parseTransferTarget } from "@/lib/pay-transfer";

export async function POST(request: NextRequest) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const payload = (await request.json().catch(() => null)) as {
    from_wallet_id?: string;
    to_member_id?: unknown;
    to_user_id?: unknown;
    amount?: number;
  } | null;

  const amount = parseAmount(payload?.amount);
  if (amount === null) {
    return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
  }

  // Le destinataire est un membre d'une organisation commune ou un
  // identifiant utilisateur, jamais un libellé libre.
  const target = parseTransferTarget(payload);
  if (!target) {
    return NextResponse.json({ error: "Destinataire requis" }, { status: 400 });
  }

  // Débit de l'émetteur et crédit du destinataire dans la fonction SQL
  // atomique pay_transfer (deux portefeuilles verrouillés dans un ordre fixe).
  const { data, error } = await supabase.rpc("pay_transfer", {
    p_amount: amount,
    p_to_user_id: target.to_user_id,
    p_to_member_id: target.to_member_id,
    p_from_wallet_id: payload?.from_wallet_id ?? null,
  });
  if (error) return payRpcErrorResponse(error);

  return NextResponse.json(rpcRow(data));
}
