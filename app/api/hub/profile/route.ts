import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";

export async function POST(request: NextRequest) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;

  const payload = (await request.json().catch(() => null)) as {
    city?: string;
    language?: string;
  } | null;

  try {
    const updates: Record<string, string> = {};
    if (payload?.city !== undefined) updates.city = payload.city;
    if (payload?.language !== undefined) updates.language = payload.language;

    if (Object.keys(updates).length > 0) {
      await supabase
        .from("user_profiles")
        .upsert({ user_id: user.id, ...updates }, { onConflict: "user_id" });
    }

    const { data: p } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    return NextResponse.json({
      id: user.id,
      name: (user.user_metadata?.full_name as string) ?? user.email ?? "",
      phone: user.phone ?? "",
      email: user.email ?? "",
      city: p?.city ?? "",
      country: "Guinée",
      language: p?.language ?? "Français",
      engagement: p?.engagement ?? "reliable",
      trust_score: p?.trust_score ?? 0,
      kyc_status: p?.kyc_status ?? "not_submitted",
      joined_at: user.created_at,
    });
  } catch (err) {
    return apiError(err);
  }
}
