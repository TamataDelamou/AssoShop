import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { createLeave, listLeaves } from "@/lib/api/community-hr";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { orgId } = await params;

  try {
    return NextResponse.json(await listLeaves(ctx.supabase, orgId));
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

  if (!payload?.staff_id || !payload?.start_date || !payload?.end_date) {
    return NextResponse.json(
      { error: "Agent, date de début et de fin requis" },
      { status: 400 },
    );
  }

  try {
    const leave = await createLeave(ctx.supabase, orgId, payload);
    return NextResponse.json(leave, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
