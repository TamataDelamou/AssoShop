import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import {
  linkAffiliation,
  listAffiliations,
} from "@/lib/api/community-network";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { orgId } = await params;

  try {
    return NextResponse.json(await listAffiliations(ctx.supabase, orgId));
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

  if (!payload?.affiliate_id) {
    return NextResponse.json(
      { error: "Association affiliée requise" },
      { status: 400 },
    );
  }

  try {
    const affiliation = await linkAffiliation(ctx.supabase, orgId, payload);
    return NextResponse.json(affiliation, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
