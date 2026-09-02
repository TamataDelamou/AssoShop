import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { updateAssetStatus } from "@/lib/api/community-welfare";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; assetId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { assetId } = await params;
  const payload = await request.json().catch(() => null);

  if (!payload?.status) {
    return NextResponse.json({ error: "Statut requis" }, { status: 400 });
  }

  try {
    const asset = await updateAssetStatus(ctx.supabase, assetId, payload.status);
    if (!asset) {
      return NextResponse.json({ error: "Actif introuvable" }, { status: 404 });
    }
    return NextResponse.json(asset);
  } catch (err) {
    return apiError(err);
  }
}
