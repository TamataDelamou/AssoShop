import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { confirmSponsorship } from "@/lib/api/finance";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string; requestId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const { requestId } = await params;

  try {
    const updated = await confirmSponsorship(supabase, requestId);
    if (!updated) {
      return NextResponse.json(
        { error: "Demande introuvable" },
        { status: 404 },
      );
    }
    return NextResponse.json(updated);
  } catch (err) {
    return apiError(err);
  }
}
