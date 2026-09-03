import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";

export async function POST(request: NextRequest) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;

  const { preferences } = (await request.json().catch(() => ({}))) as {
    preferences?: { channel?: string; event_type?: string; enabled?: boolean }[];
  };

  try {
    if (!Array.isArray(preferences)) {
      return NextResponse.json({ error: "Préférences invalides" }, { status: 400 });
    }

    await supabase.from("hub_preferences").delete().eq("user_id", user.id);
    if (preferences.length > 0) {
      const { error } = await supabase.from("hub_preferences").insert(
        preferences.map((p) => ({
          user_id: user.id,
          channel: p.channel ?? "in_app",
          event_type: p.event_type ?? "",
          enabled: p.enabled ?? true,
        })),
      );
      if (error) throw error;
    }

    const { data: list } = await supabase
      .from("hub_preferences")
      .select("*")
      .eq("user_id", user.id)
      .order("event_type");

    return NextResponse.json(list ?? []);
  } catch (err) {
    return apiError(err);
  }
}
