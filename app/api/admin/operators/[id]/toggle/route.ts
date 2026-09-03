import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/auth";
import { getAdminContext } from "@/lib/api/admin-auth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getAdminContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;
  const { id } = await params;

  try {
    const { data: operator } = await supabase
      .from("admin_operators")
      .select("status")
      .eq("id", id)
      .maybeSingle();
    if (!operator) {
      return NextResponse.json({ error: "Opérateur introuvable" }, { status: 404 });
    }

    await supabase
      .from("admin_operators")
      .update({ status: operator.status === "active" ? "inactive" : "active" })
      .eq("id", id);

    const { data: list } = await supabase
      .from("admin_operators")
      .select("*")
      .order("name");

    return NextResponse.json(list ?? []);
  } catch (err) {
    return apiError(err);
  }
}
