import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import {
  getSettings,
  updateSettings,
} from "@/lib/api/community-settings";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { orgId } = await params;

  try {
    return NextResponse.json(await getSettings(ctx.supabase, orgId));
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { orgId } = await params;
  const payload = await request.json().catch(() => null);

  try {
    const settings = await updateSettings(ctx.supabase, orgId, payload ?? {});
    return NextResponse.json(settings);
  } catch (err) {
    return apiError(err);
  }
}
