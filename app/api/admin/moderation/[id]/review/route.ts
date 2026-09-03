import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api/auth";
import { getAdminContext, logAudit } from "@/lib/api/admin-auth";

const VALID = ["pending", "approved", "rejected"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getAdminContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;
  const { id } = await params;
  const { status } = (await request.json().catch(() => ({}))) as { status?: string };

  try {
    if (!status || !VALID.includes(status)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }

    const { error } = await supabase
      .from("admin_moderation")
      .update({ status })
      .eq("id", id);
    if (error) throw error;

    await logAudit(ctx, `review_moderation:${status}`, "community");

    const { data: list } = await supabase
      .from("admin_moderation")
      .select("*")
      .order("reported_at", { ascending: false });

    return NextResponse.json(list ?? []);
  } catch (err) {
    return apiError(err);
  }
}
