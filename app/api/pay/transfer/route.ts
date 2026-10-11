import { NextRequest, NextResponse } from "next/server";
import { getAuthedContext } from "@/lib/api/auth";
import { parseAmount, payRpcErrorResponse, rpcRow } from "@/lib/api/pay-rpc";

export async function POST(request: NextRequest) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const payload = (await request.json().catch(() => null)) as {
    from_wallet_id?: string;
    to_member?: string;
    amount?: number;
  } | null;

  const amount = parseAmount(payload?.amount);
  if (amount === null) {
    return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
  }

  // Contrôle du solde, débit et transaction dans la fonction SQL atomique
  // pay_transfer (verrou de ligne : pas de double dépense).
  const { data, error } = await supabase.rpc("pay_transfer", {
    p_amount: amount,
    p_to_member: payload?.to_member ?? "",
    p_from_wallet_id: payload?.from_wallet_id ?? null,
  });
  if (error) return payRpcErrorResponse(error);

  return NextResponse.json(rpcRow(data));
}
