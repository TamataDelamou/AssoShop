import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { listElections } from "@/lib/api/community-governance";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { orgId } = await params;

  try {
    return NextResponse.json(await listElections(ctx.supabase, orgId));
  } catch (err) {
    return apiError(err);
  }
}
