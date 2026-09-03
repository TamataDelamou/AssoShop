import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";

export async function POST(request: NextRequest) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;

  const payload = (await request.json().catch(() => null)) as {
    type?: string;
    label?: string;
    detail?: string;
  } | null;

  try {
    if (!payload?.type || !payload?.label) {
      return NextResponse.json({ error: "Type et libellé requis" }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("hub_favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("type", payload.type)
      .eq("label", payload.label)
      .maybeSingle();

    if (existing) {
      await supabase.from("hub_favorites").delete().eq("id", existing.id);
    } else {
      const { error } = await supabase.from("hub_favorites").insert({
        user_id: user.id,
        type: payload.type,
        label: payload.label,
        detail: payload.detail ?? "",
      });
      if (error) throw error;
    }

    const { data: list } = await supabase
      .from("hub_favorites")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    return NextResponse.json(list ?? []);
  } catch (err) {
    return apiError(err);
  }
}
