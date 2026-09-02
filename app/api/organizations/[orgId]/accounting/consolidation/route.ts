import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { consolidate, getConsolidation } from "@/lib/api/accounting";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const { orgId } = await params;

  try {
    const movements = await getConsolidation(supabase, orgId);
    return NextResponse.json(movements);
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
  const { supabase } = ctx;

  const { orgId } = await params;
  const payload = await request.json().catch(() => null);
  const movementIds = Array.isArray(payload?.movement_ids)
    ? payload.movement_ids
    : [];

  try {
    const created = await consolidate(supabase, orgId, movementIds);
    return NextResponse.json(created);
  } catch (err) {
    return apiError(err);
  }
}
