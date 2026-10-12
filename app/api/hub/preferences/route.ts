import { NextRequest, NextResponse } from "next/server";
import { getAuthedContext } from "@/lib/api/auth";
import { payRpcErrorResponse } from "@/lib/api/pay-rpc";

export async function POST(request: NextRequest) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;

  const { preferences } = (await request.json().catch(() => ({}))) as {
    preferences?: { channel?: string; event_type?: string; enabled?: boolean }[];
  };
  if (!Array.isArray(preferences)) {
    return NextResponse.json({ error: "Préférences invalides" }, { status: 400 });
  }

  // Remplacement d'un bloc (fonction SQL hub_set_preferences, migration
  // 0028) : jamais de préférences à moitié enregistrées.
  const { data, error } = await ctx.supabase.rpc("hub_set_preferences", {
    p_preferences: preferences.map((p) => ({
      channel: p.channel ?? "in_app",
      event_type: p.event_type ?? "",
      enabled: p.enabled ?? true,
    })),
  });
  if (error) return payRpcErrorResponse(error);

  return NextResponse.json(data ?? []);
}
