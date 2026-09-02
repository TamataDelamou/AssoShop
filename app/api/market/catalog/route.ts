import { NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";

type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  subcategories: CategoryNode[];
};

export async function GET() {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  try {
    const [cats, prods, resellers] = await Promise.all([
      supabase
        .from("market_product_categories")
        .select("id, name, slug, parent_id")
        .order("name"),
      supabase
        .from("market_products")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false }),
      supabase.from("market_resellers").select("*").order("company_name"),
    ]);
    if (cats.error) throw cats.error;
    if (prods.error) throw prods.error;
    if (resellers.error) throw resellers.error;

    const rows = (cats.data ?? []) as {
      id: string;
      name: string;
      slug: string;
      parent_id: string | null;
    }[];
    const nodes: CategoryNode[] = rows.map((c) => ({ ...c, subcategories: [] }));
    const byId = new Map<string, CategoryNode>(nodes.map((n) => [n.id, n]));
    const roots: CategoryNode[] = [];
    for (const node of nodes) {
      const parent = node.parent_id ? byId.get(node.parent_id) : undefined;
      if (parent) {
        parent.subcategories.push(node);
      } else {
        roots.push(node);
      }
    }

    return NextResponse.json({
      categories: roots,
      products: prods.data ?? [],
      resellers: resellers.data ?? [],
    });
  } catch (err) {
    return apiError(err);
  }
}
