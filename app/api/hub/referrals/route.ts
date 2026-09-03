import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { recordReferral } from "@/lib/api/hub-producers";

export async function POST(request: NextRequest) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;

  const payload = await request.json().catch(() => null);
  if (!payload?.referred_name) {
    return NextResponse.json(
      { error: "Nom du filleul requis" },
      { status: 400 },
    );
  }

  try {
    const referral = await recordReferral(
      supabase,
      user.id,
      String(payload.referred_name),
    );
    return NextResponse.json(referral, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
