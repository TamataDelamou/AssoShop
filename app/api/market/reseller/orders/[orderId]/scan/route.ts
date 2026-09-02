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
    if (order.status !== "arrived") {
      return NextResponse.json(
        { error: "La commande doit être au statut arrivée" },
        { status: 400 },
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("market_orders")
      .update({ status: "ready_for_pickup", updated_at: new Date().toISOString() })
      .eq("id", orderId)
      .select()
      .single();
    if (updateError) throw updateError;

    await supabase.from("market_pickup_records").upsert(
      {
        order_id: orderId,
        tracking_code: `QR-${orderId.slice(0, 8).toUpperCase()}`,
        status: "scanned",
        scanned_at: new Date().toISOString(),
      },
      { onConflict: "order_id" },
    );

    return NextResponse.json(updated);
  } catch (err) {
    return apiError(err);
  }
}
