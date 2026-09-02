import { NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";

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

    const { data: wallet } = await supabase
      .from("market_wallets")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();
    const balance = wallet?.balance ?? 0;
    if (balance < order.total) {
      return NextResponse.json({ error: "Solde insuffisant" }, { status: 400 });
    }

    const { error: walletError } = await supabase
      .from("market_wallets")
      .update({ balance: balance - order.total })
      .eq("user_id", user.id);
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
