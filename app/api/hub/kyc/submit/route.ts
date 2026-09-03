import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";

export async function POST(request: NextRequest) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;

  const { document_type } = (await request.json().catch(() => ({}))) as {
    document_type?: string;
  };

  try {
    if (!document_type?.trim()) {
      return NextResponse.json({ error: "Type de document requis" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("hub_kyc")
      .insert({
        user_id: user.id,
        document_type,
        status: "pending",
      })
      .select()
      .single();
    if (error) throw error;

    await supabase
      .from("user_profiles")
      .upsert({ user_id: user.id, kyc_status: "pending" }, { onConflict: "user_id" });

    return NextResponse.json(data);
  } catch (err) {
    return apiError(err);
  }
}
