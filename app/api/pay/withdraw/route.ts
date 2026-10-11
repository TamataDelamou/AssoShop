import { NextRequest, NextResponse } from "next/server";
import { getAuthedContext } from "@/lib/api/auth";
import { isRealMoneyBlocked, realMoneyBlockedResponse } from "@/lib/api/pay-real-money";
import { parseAmount, payRpcErrorResponse, rpcRow } from "@/lib/api/pay-rpc";

export async function POST(request: NextRequest) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  // En production, aucun retrait vers Mobile Money tant que PAY_REAL_MONEY
  // n'est pas activé (partenaire agréé non choisi) : le solde n'est pas débité.
  if (isRealMoneyBlocked()) return realMoneyBlockedResponse();

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

  // Contrôle du solde, débit et transaction dans la fonction SQL atomique
  // pay_withdraw (verrou de ligne : pas de double dépense).
  const { data, error } = await supabase.rpc("pay_withdraw", {
    p_amount: amount,
    p_wallet_id: payload?.wallet_id ?? null,
    p_provider: payload?.provider ?? "",
  });
  if (error) return payRpcErrorResponse(error);

  return NextResponse.json(rpcRow(data));
}
