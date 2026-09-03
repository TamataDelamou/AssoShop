import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/auth";
import { getAdminContext, logAudit } from "@/lib/api/admin-auth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getAdminContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;
  const { id } = await params;

  try {
    const { data: country } = await supabase
      .from("admin_countries")
      .select("status")
      .eq("id", id)
      .maybeSingle();
    if (!country) {
      return NextResponse.json({ error: "Pays introuvable" }, { status: 404 });
    }

    await supabase
      .from("admin_countries")
      .update({ status: country.status === "active" ? "inactive" : "active" })
      .eq("id", id);

    await logAudit(ctx, `toggle_country:${id}`, "config");

    const { data: list } = await supabase
      .from("admin_countries")
      .select("*")
      .order("name");

    return NextResponse.json(list ?? []);
  } catch (err) {
    return apiError(err);
  }
}
