import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { payRpcErrorResponse } from "@/lib/api/pay-rpc";

export async function POST(request: NextRequest) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;

  const payload = (await request.json().catch(() => null)) as {
    city?: string;
    language?: string;
  } | null;

  try {
    // Seules la ville et la langue sont modifiables : fonction SQL
    // profile_update (0025), plus d'écriture directe sur user_profiles.
    const { data, error } = await supabase.rpc("profile_update", {
      p_city: payload?.city ?? null,
      p_language: payload?.language ?? null,
    });
    if (error) return payRpcErrorResponse(error);
    const p = data as {
      city?: string;
      language?: string;
      engagement?: string;
      trust_score?: number;
      kyc_status?: string;
    } | null;

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
