import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;
  const { orderId } = await params;

  const payload = (await request.json().catch(() => null)) as {
    recipient_name?: string;
  } | null;

  try {
    const { data: reseller } = await supabase
      .from("market_resellers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!reseller) {
      return NextResponse.json({ error: "Compte revendeur requis" }, { status: 403 });
    }

    const { data: order } = await supabase
      .from("market_orders")
      .select("*")
      .eq("id", orderId)
      .eq("reseller_id", reseller.id)
      .maybeSingle();
    if (!order) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }
    if (order.status !== "ready_for_pickup") {
      return NextResponse.json(
        { error: "La commande doit être prête au retrait" },
        { status: 400 },
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("market_orders")
      .update({ status: "delivered", updated_at: new Date().toISOString() })
      .eq("id", orderId)
      .select()
      .single();
    if (updateError) throw updateError;

    await supabase
      .from("market_pickup_records")
      .update({
        status: "delivered",
        delivered_at: new Date().toISOString(),
        recipient_name: payload?.recipient_name ?? "Client",
      })
      .eq("order_id", orderId);

    return NextResponse.json(updated);
  } catch (err) {
    return apiError(err);
  }
}
