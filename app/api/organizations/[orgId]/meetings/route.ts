import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { listMeetings, planMeeting } from "@/lib/api/community";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const { orgId } = await params;
  const search = request.nextUrl.searchParams.get("search") ?? "";
  const status = request.nextUrl.searchParams.get("status") ?? "";

  try {
    const meetings = await listMeetings(supabase, orgId, search, status);
    return NextResponse.json(meetings);
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
  if (!payload?.title || !payload?.date) {
    return NextResponse.json(
      { error: "Titre et date requis" },
      { status: 400 },
    );
  }

  try {
    const meeting = await planMeeting(supabase, orgId, payload);
    return NextResponse.json(meeting, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
