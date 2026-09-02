import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { createEvent, listEvents } from "@/lib/api/community-network";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { orgId } = await params;

  try {
    return NextResponse.json(await listEvents(ctx.supabase, orgId));
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

  if (!payload?.title || !payload?.type || !payload?.start_at || !payload?.location) {
    return NextResponse.json(
      { error: "Titre, type, date de début et lieu requis" },
      { status: 400 },
    );
  }

  try {
    const event = await createEvent(ctx.supabase, orgId, payload);
    return NextResponse.json(event, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
