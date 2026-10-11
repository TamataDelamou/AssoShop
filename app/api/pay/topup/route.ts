import { NextRequest, NextResponse } from "next/server";
import { getAuthedContext } from "@/lib/api/auth";
import { parseAmount, payRpcErrorResponse, rpcRow } from "@/lib/api/pay-rpc";

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

  // Solde et transaction sont écrits par la fonction SQL atomique pay_topup.
  const { data, error } = await supabase.rpc("pay_topup", {
    p_amount: amount,
    p_wallet_id: payload?.wallet_id ?? null,
    p_provider: payload?.provider ?? "",
  });
  if (error) return payRpcErrorResponse(error);

  return NextResponse.json(rpcRow(data));
}
