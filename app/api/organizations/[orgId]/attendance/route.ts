import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { getAttendance } from "@/lib/api/community-hr";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { orgId } = await params;
  const date = request.nextUrl.searchParams.get("date");

  try {
    return NextResponse.json(await getAttendance(ctx.supabase, orgId, date));
  } catch (err) {
    return apiError(err);
  }
}
