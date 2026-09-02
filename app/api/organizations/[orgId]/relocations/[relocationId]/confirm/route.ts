import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { confirmRelocation } from "@/lib/api/community-network";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string; relocationId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { relocationId } = await params;

  try {
    const relocation = await confirmRelocation(ctx.supabase, relocationId);
    if (!relocation) {
      return NextResponse.json(
        { error: "Déménagement introuvable" },
        { status: 404 },
      );
    }
    return NextResponse.json(relocation);
  } catch (err) {
    return apiError(err);
  }
}
