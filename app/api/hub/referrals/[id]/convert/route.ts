import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { convertReferral } from "@/lib/api/hub-producers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;

  const { id } = await params;

  try {
    const referral = await convertReferral(supabase, user.id, id);
    return NextResponse.json(referral);
  } catch (err) {
    return apiError(err);
  }
}
