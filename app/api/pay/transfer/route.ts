import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { generateReference } from "@/lib/pay";

export async function POST(request: NextRequest) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;

  const payload = (await request.json().catch(() => null)) as {
    from_wallet_id?: string;
    to_member?: string;
    amount?: number;
  } | null;

  try {
    const amount = payload?.amount ?? 0;
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }

    const { data: wallet } = await supabase
      .from("pay_wallets")
      .select("*")
      .eq("id", payload?.from_wallet_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!wallet) {
      return NextResponse.json(
        { error: "Portefeuille introuvable" },
        { status: 404 },
      );
    }

    if (wallet.balance < amount) {
      return NextResponse.json({ error: "Solde insuffisant" }, { status: 400 });
    }

    const newBalance = wallet.balance - amount;

    const { error: walletError } = await supabase
      .from("pay_wallets")
      .update({
        balance: newBalance,
        last_known_balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", wallet.id);
    if (walletError) throw walletError;

    const { data: transaction, error: txError } = await supabase
      .from("pay_transactions")
      .insert({
        user_id: user.id,
        wallet_id: wallet.id,
        type: "transfer",
        status: "confirmed",
        amount,
        currency: wallet.currency,
        counterparty: payload?.to_member ?? "",
        description: "Transfert entre membres",
        commission: 0,
        reference: generateReference(),
        module: "pay",
      })
      .select()
      .single();
    if (txError) throw txError;

    return NextResponse.json(transaction);
  } catch (err) {
    return apiError(err);
  }
}
