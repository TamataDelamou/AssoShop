import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";

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
  const { supabase, user } = ctx;

  const payload = (await request.json().catch(() => null)) as CreateOrderBody | null;

  try {
    if (!payload?.items?.length) {
      return NextResponse.json({ error: "Commande vide" }, { status: 400 });
    }
    const lines = payload.items;

    const { data: products, error: productsError } = await supabase
      .from("market_products")
      .select("*")
      .in("id", lines.map((i) => i.product_id));
    if (productsError) throw productsError;

    const items = lines
      .map((line) => {
        const product = (products ?? []).find((p) => p.id === line.product_id);
        return {
          product_id: line.product_id,
          product_name: product?.name ?? "Produit",
          quantity: line.quantity,
          unit_price: product?.retail_price ?? 0,
          currency: product?.currency ?? "GNF",
        };
      })
      .filter((item) => item.unit_price > 0);

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Aucun produit valide dans la commande" },
        { status: 400 },
      );
    }

    const firstProduct = (products ?? []).find(
      (p) => p.id === lines[0].product_id,
    );
    const resellerId = firstProduct?.reseller_id ?? null;

    let resellerName = "";
    if (resellerId) {
      const { data: reseller } = await supabase
        .from("market_resellers")
        .select("company_name")
        .eq("id", resellerId)
        .maybeSingle();
      resellerName = reseller?.company_name ?? "";
    }

    const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

    const { data: order, error: orderError } = await supabase
      .from("market_orders")
      .insert({
        buyer_id: user.id,
        reseller_id: resellerId,
        reseller_name: resellerName,
        total,
        currency: items[0].currency,
        delivery_method: payload.delivery_method ?? "pickup",
        delivery_date: payload.delivery_date ?? null,
        delivery_city: payload.delivery_city ?? "",
        status: "pending_payment",
        paid: false,
      })
      .select()
      .single();
    if (orderError) throw orderError;

    const { error: itemsError } = await supabase
      .from("market_order_items")
      .insert(items.map((item) => ({ ...item, order_id: order.id })));
    if (itemsError) throw itemsError;

    return NextResponse.json({ ...order, items });
  } catch (err) {
    return apiError(err);
  }
}
