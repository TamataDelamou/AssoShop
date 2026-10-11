import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { payRpcErrorResponse, rpcRow } from "@/lib/api/pay-rpc";
import { parseOrderLines } from "@/lib/market-orders";

type CreateOrderBody = {
  items?: { product_id: string; quantity: number }[];
  delivery_method?: string;
  delivery_date?: string | null;
  delivery_city?: string;
};

export async function GET() {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;

  try {
    const { data: orders, error } = await supabase
      .from("market_orders")
      .select("*")
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const list = orders ?? [];
    const itemsByOrder: Record<string, unknown[]> = {};
    if (list.length > 0) {
      const { data: items, error: itemsError } = await supabase
        .from("market_order_items")
        .select("*")
        .in("order_id", list.map((o) => o.id));
      if (itemsError) throw itemsError;
      for (const item of items ?? []) {
        (itemsByOrder[item.order_id] ??= []).push(item);
      }
    }

    return NextResponse.json(
      list.map((order) => ({ ...order, items: itemsByOrder[order.id] ?? [] })),
    );
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(request: NextRequest) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const payload = (await request.json().catch(() => null)) as CreateOrderBody | null;

  const lines = parseOrderLines(payload?.items);
  if (!lines) {
    return NextResponse.json({ error: "Commande vide ou invalide" }, { status: 400 });
  }

  // Prix, revendeur et total sont établis en base par market_create_order à
  // partir de market_products : rien de tout cela n'est accepté du navigateur.
  const { data, error } = await supabase.rpc("market_create_order", {
    p_items: lines,
    p_delivery_method: payload?.delivery_method ?? "pickup",
    p_delivery_date: payload?.delivery_date ?? null,
    p_delivery_city: payload?.delivery_city ?? "",
  });
  if (error) return payRpcErrorResponse(error);

  const order = rpcRow<{ id: string }>(data);
  if (!order) return payRpcErrorResponse(null);

  try {
    const { data: items, error: itemsError } = await supabase
      .from("market_order_items")
      .select("*")
      .eq("order_id", order.id);
    if (itemsError) throw itemsError;

    return NextResponse.json({ ...order, items: items ?? [] });
  } catch (err) {
    return apiError(err);
  }
}
