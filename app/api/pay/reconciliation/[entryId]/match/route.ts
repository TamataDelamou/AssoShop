import { NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ entryId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;
  const { entryId } = await params;

  try {
    const { data: entry } = await supabase
      .from("pay_reconciliation")
      .select("*")
      .eq("id", entryId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!entry) {
      return NextResponse.json(
        { error: "Opération introuvable" },
        { status: 404 },
      );
    }

    const { data, error } = await supabase
      .from("pay_reconciliation")
      .update({ status: "matched", ai_note: null })
      .eq("id", entryId)
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    return apiError(err);
  }
}
