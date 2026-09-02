import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { respondSponsorship } from "@/lib/api/finance";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; requestId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const { requestId } = await params;
  const payload = await request.json().catch(() => null);
  if (payload?.decision !== "accept" && payload?.decision !== "decline") {
    return NextResponse.json({ error: "Décision invalide" }, { status: 400 });
  }

  try {
    const updated = await respondSponsorship(
      supabase,
      requestId,
      payload.decision,
    );
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
