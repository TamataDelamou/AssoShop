import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { applySanction, listSanctions } from "@/lib/api/community-tasks";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { orgId } = await params;

  try {
    return NextResponse.json(await listSanctions(ctx.supabase, orgId));
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

  if (!payload?.member_id || !payload?.type || !payload?.reason) {
    return NextResponse.json(
      { error: "Membre, type et motif requis" },
      { status: 400 },
    );
  }

  try {
    const sanction = await applySanction(ctx.supabase, orgId, payload);
    return NextResponse.json(sanction, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
