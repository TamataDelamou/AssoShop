import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api/auth";
import { getAdminContext, logAudit } from "@/lib/api/admin-auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getAdminContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;
  const { id } = await params;
  const { monthly_price } = (await request.json().catch(() => ({}))) as {
    monthly_price?: number;
  };

  try {
    if (typeof monthly_price !== "number" || monthly_price < 0) {
      return NextResponse.json({ error: "Prix invalide" }, { status: 400 });
    }

    const { error } = await supabase
      .from("admin_plans")
      .update({ monthly_price })
      .eq("id", id);
    if (error) throw error;

    await logAudit(ctx, `update_plan:${id}`, "config");

    const { data: list } = await supabase
      .from("admin_plans")
      .select("*")
      .order("monthly_price");

    return NextResponse.json(list ?? []);
  } catch (err) {
    return apiError(err);
  }
}
