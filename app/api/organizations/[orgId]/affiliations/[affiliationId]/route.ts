import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import {
  unlinkAffiliation,
  updateAffiliation,
} from "@/lib/api/community-network";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; affiliationId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { affiliationId } = await params;
  const payload = await request.json().catch(() => null);

  if (!payload) {
    return NextResponse.json(
      { error: "Aucun champ à mettre à jour" },
      { status: 400 },
    );
  }

  try {
    const affiliation = await updateAffiliation(
      ctx.supabase,
      affiliationId,
      payload,
    );
    if (!affiliation) {
      return NextResponse.json(
        { error: "Affiliation introuvable" },
        { status: 404 },
      );
    }
    return NextResponse.json(affiliation);
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string; affiliationId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { affiliationId } = await params;

  try {
    await unlinkAffiliation(ctx.supabase, affiliationId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return apiError(err);
  }
}
