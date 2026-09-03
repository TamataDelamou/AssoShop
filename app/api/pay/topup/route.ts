import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { generateReference, serviceFee } from "@/lib/pay";
import { getWallet } from "@/lib/api/wallets";

export async function POST(request: NextRequest) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;

  const payload = (await request.json().catch(() => null)) as {
    wallet_id?: string;
    provider?: string;
    phone?: string;
    amount?: number;
  } | null;

  try {
    const amount = payload?.amount ?? 0;
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }

    const wallet = await getWallet(supabase, user.id, payload?.wallet_id);
    if (!wallet) {
      return NextResponse.json(
        { error: "Portefeuille introuvable" },
        { status: 404 },
      );
    }

    const commission = serviceFee(amount);
    const newBalance = wallet.balance + amount - commission;

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
        type: "topup",
        status: "confirmed",
        amount,
        currency: wallet.currency,
        counterparty: payload?.provider ?? "",
        description: "Recharge du portefeuille",
        commission,
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
