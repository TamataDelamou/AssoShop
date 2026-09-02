import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { createAsset, listAssets } from "@/lib/api/community-welfare";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { orgId } = await params;

  try {
    return NextResponse.json(await listAssets(ctx.supabase, orgId));
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { orgId } = await params;
  const payload = await request.json().catch(() => null);

  if (!payload?.name || !payload?.category) {
    return NextResponse.json(
      { error: "Nom et catégorie requis" },
      { status: 400 },
    );
  }

  try {
    const asset = await createAsset(ctx.supabase, orgId, payload);
    return NextResponse.json(asset, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
