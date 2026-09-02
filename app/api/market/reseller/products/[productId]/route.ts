import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;
  const { productId } = await params;

  const payload = (await request.json().catch(() => null)) as {
    category_id?: string | null;
    subcategory_id?: string | null;
    name?: string;
    description?: string;
    wholesale_price?: number;
    retail_price?: number;
    min_order_quantity?: number;
    stock?: number;
    country?: string;
    city?: string;
    currency?: string;
  } | null;

  try {
    const { data: reseller } = await supabase
      .from("market_resellers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!reseller) {
      return NextResponse.json(
        { error: "Compte revendeur requis" },
        { status: 403 },
      );
    }

    const { data, error } = await supabase
      .from("market_products")
      .update({
        category_id: payload?.category_id ?? null,
        subcategory_id: payload?.subcategory_id ?? null,
        name: payload?.name,
        description: payload?.description ?? "",
        wholesale_price: payload?.wholesale_price ?? 0,
        retail_price: payload?.retail_price ?? 0,
        min_order_quantity: payload?.min_order_quantity ?? 1,
        stock: payload?.stock ?? 0,
        country: payload?.country ?? "",
        city: payload?.city ?? "",
        currency: payload?.currency ?? "GNF",
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId)
      .eq("reseller_id", reseller.id)
      .select()
      .single();
    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return apiError(err);
  }
}
