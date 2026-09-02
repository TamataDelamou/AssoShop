import { NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";

export async function GET() {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;

  try {
    const { data: reseller } = await supabase
      .from("market_resellers")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: application } = await supabase
      .from("market_reseller_applications")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!reseller) {
      return NextResponse.json({
        application: application ?? null,
        products: [],
        orders: [],
        pickups: [],
        reviews: [],
        stats: {
          total_revenue: 0,
          currency: "GNF",
          orders_count: 0,
          average_rating: 0,
          monthly: [],
        },
        settings: { delivery_zones: [], delivery_slots: [], payment_details: "" },
      });
    }

    const [products, orders, reviews, settings] = await Promise.all([
      supabase
        .from("market_products")
        .select("*")
        .eq("reseller_id", reseller.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("market_orders")
        .select("*")
        .eq("reseller_id", reseller.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("market_reviews")
        .select("*")
        .eq("reseller_id", reseller.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("market_reseller_settings")
        .select("*")
        .eq("reseller_id", reseller.id)
        .maybeSingle(),
    ]);
    if (products.error) throw products.error;
    if (orders.error) throw orders.error;
    if (reviews.error) throw reviews.error;
    if (settings.error) throw settings.error;

    const orderList = orders.data ?? [];
    const itemsByOrder: Record<string, unknown[]> = {};
    if (orderList.length > 0) {
      const { data: items, error: itemsError } = await supabase
        .from("market_order_items")
        .select("*")
        .in("order_id", orderList.map((o) => o.id));
      if (itemsError) throw itemsError;
      for (const item of items ?? []) {
        (itemsByOrder[item.order_id] ??= []).push(item);
      }
    }

    let pickups: unknown[] = [];
    if (orderList.length > 0) {
      const { data, error } = await supabase
        .from("market_pickup_records")
        .select("*")
        .in("order_id", orderList.map((o) => o.id))
        .order("scanned_at", { ascending: false });
      if (error) throw error;
      pickups = data ?? [];
    }

    const paidOrders = orderList.filter((o) => o.paid);
    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);

    const settingsRow = settings.data;
    const normalizedSettings = {
      delivery_zones: settingsRow?.delivery_zones ?? [],
      delivery_slots: settingsRow?.delivery_slots ?? [],
      payment_details: settingsRow?.payment_details ?? "",
    };

    return NextResponse.json({
      application: application ?? null,
      products: products.data ?? [],
      orders: orderList.map((o) => ({ ...o, items: itemsByOrder[o.id] ?? [] })),
      pickups,
      reviews: reviews.data ?? [],
      stats: {
        total_revenue: totalRevenue,
        currency: "GNF",
        orders_count: paidOrders.length,
        average_rating: reseller.rating ?? 0,
        monthly: [],
      },
      settings: normalizedSettings,
    });
  } catch (err) {
    return apiError(err);
  }
}
