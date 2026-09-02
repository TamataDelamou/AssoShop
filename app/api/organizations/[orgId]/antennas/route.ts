import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { createAntenna, listAntennas } from "@/lib/api/community-network";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { orgId } = await params;

  try {
    return NextResponse.json(await listAntennas(ctx.supabase, orgId));
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

  if (!payload?.name || !payload?.level || !payload?.city) {
    return NextResponse.json(
      { error: "Nom, niveau et ville requis" },
      { status: 400 },
    );
  }

  try {
    const antenna = await createAntenna(ctx.supabase, orgId, payload);
    return NextResponse.json(antenna, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
