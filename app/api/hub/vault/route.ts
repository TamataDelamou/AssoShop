import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";

export async function POST(request: NextRequest) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;

  const payload = (await request.json().catch(() => null)) as {
    name?: string;
    category?: string;
  } | null;

  try {
    if (!payload?.name?.trim()) {
      return NextResponse.json({ error: "Nom de document requis" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("hub_vault")
      .insert({
        user_id: user.id,
        name: payload.name,
        category: payload.category ?? "",
      })
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    return apiError(err);
  }
}
