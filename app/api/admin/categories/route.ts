import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api/auth";
import { getAdminContext } from "@/lib/api/admin-auth";

export async function POST(request: NextRequest) {
  const ctx = await getAdminContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const payload = (await request.json().catch(() => null)) as {
    name?: string;
    parent?: string | null;
  } | null;

  try {
    if (!payload?.name?.trim()) {
      return NextResponse.json({ error: "Nom de catégorie requis" }, { status: 400 });
    }

    const base = payload.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const slug = `${base || "categorie"}-${Date.now().toString(36)}`;

    const { error } = await supabase.from("market_product_categories").insert({
      name: payload.name,
      slug,
      parent_id: payload.parent ?? null,
    });
    if (error) throw error;

    const [{ data: list }, { data: products }] = await Promise.all([
      supabase.from("market_product_categories").select("*").order("name"),
      supabase.from("market_products").select("category_id, subcategory_id"),
    ]);

    const counts: Record<string, number> = {};
    for (const p of products ?? []) {
      if (p.category_id) counts[p.category_id] = (counts[p.category_id] ?? 0) + 1;
      if (p.subcategory_id) {
        counts[p.subcategory_id] = (counts[p.subcategory_id] ?? 0) + 1;
      }
    }

    return NextResponse.json(
      (list ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        parent: c.parent_id ?? null,
        products_count: counts[c.id] ?? 0,
      })),
    );
  } catch (err) {
    return apiError(err);
  }
}
