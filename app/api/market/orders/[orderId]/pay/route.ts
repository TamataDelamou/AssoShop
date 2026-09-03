import { NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { ensurePersonalWallet } from "@/lib/api/wallets";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;
  const { orderId } = await params;

  try {
    const { data: order, error } = await supabase
      .from("market_orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();
    if (error) throw error;
    if (!order) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }
    if (order.buyer_id !== user.id) {
      return NextResponse.json({ error: "Action non autorisée" }, { status: 403 });
    }
    if (order.paid) {
      return NextResponse.json({ error: "Commande déjà payée" }, { status: 400 });
    }

    const wallet = await ensurePersonalWallet(supabase, user.id);
    if (wallet.balance < order.total) {
      return NextResponse.json({ error: "Solde insuffisant" }, { status: 400 });
    }

    const newBalance = wallet.balance - order.total;
    const { error: walletError } = await supabase
      .from("pay_wallets")
      .update({
        balance: newBalance,
        last_known_balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", wallet.id);
    if (walletError) throw walletError;

    const { data: updated, error: updateError } = await supabase
      .from("market_orders")
      .update({ paid: true, status: "confirmed", updated_at: new Date().toISOString() })
      .eq("id", orderId)
      .select()
      .single();
    if (updateError) throw updateError;

    return NextResponse.json(updated);
  } catch (err) {
    return apiError(err);
  }
}
