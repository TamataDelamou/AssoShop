import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { decideClaim } from "@/lib/api/finance";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; claimId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const { orgId, claimId } = await params;
  const payload = await request.json().catch(() => null);

  try {
    const claim = await decideClaim(
      supabase,
      orgId,
      claimId,
      payload?.approved === true,
    );
    if (!claim) {
      return NextResponse.json(
        { error: "Demande introuvable" },
        { status: 404 },
      );
    }
    return NextResponse.json(claim);
  } catch (err) {
    return apiError(err);
  }
}
