import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api/auth";
import { getAdminContext, logAudit } from "@/lib/api/admin-auth";

export async function POST(request: NextRequest) {
  const ctx = await getAdminContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const payload = (await request.json().catch(() => null)) as {
    service?: string;
    rate?: number;
  } | null;

  try {
    if (!payload?.service?.trim()) {
      return NextResponse.json({ error: "Service requis" }, { status: 400 });
    }

    const { error } = await supabase.from("admin_commissions").upsert(
      { service: payload.service, rate: payload.rate ?? 0, currency: "GNF" },
      { onConflict: "service" },
    );
    if (error) throw error;

    await logAudit(ctx, `update_commission:${payload.service}`, "config");

    const { data: list } = await supabase
      .from("admin_commissions")
      .select("*")
      .order("service");

    return NextResponse.json(list ?? []);
  } catch (err) {
    return apiError(err);
  }
}
