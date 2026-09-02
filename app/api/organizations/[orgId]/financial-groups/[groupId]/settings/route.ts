import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { getSettings, updateSettings } from "@/lib/api/finance";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string; groupId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const { groupId } = await params;

  try {
    const settings = await getSettings(supabase, groupId);
    return NextResponse.json(settings);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; groupId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const { groupId } = await params;
  const payload = await request.json().catch(() => null);

  try {
    const settings = await updateSettings(supabase, groupId, payload ?? {});
    return NextResponse.json(settings);
  } catch (err) {
    return apiError(err);
  }
}
