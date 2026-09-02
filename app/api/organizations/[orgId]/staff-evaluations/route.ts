import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import {
  createEvaluation,
  listEvaluations,
} from "@/lib/api/community-hr";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { orgId } = await params;

  try {
    return NextResponse.json(await listEvaluations(ctx.supabase, orgId));
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

  if (!payload?.staff_id || !payload?.period || payload?.rating == null) {
    return NextResponse.json(
      { error: "Agent, période et note requis" },
      { status: 400 },
    );
  }

  try {
    const evaluation = await createEvaluation(ctx.supabase, orgId, payload);
    return NextResponse.json(evaluation, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
