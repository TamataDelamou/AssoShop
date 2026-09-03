import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { checkInAttendee } from "@/lib/api/community";
import { enqueueSync } from "@/lib/api/hub-producers";

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ orgId: string; meetingId: string; attendeeId: string }>;
  },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const { meetingId, attendeeId } = await params;
  const payload = await request.json().catch(() => null);
  if (!payload?.status) {
    return NextResponse.json({ error: "Statut requis" }, { status: 400 });
  }

  try {
    const meeting = await checkInAttendee(
      supabase,
      meetingId,
      attendeeId,
      payload.status,
    );
    if (!meeting) {
      return NextResponse.json(
        { error: "Participant introuvable" },
        { status: 404 },
      );
    }
    await enqueueSync(
      supabase,
      ctx.user.id,
      "Présence réunion (QR Code)",
      "community",
    ).catch(() => null);
    return NextResponse.json(meeting);
  } catch (err) {
    return apiError(err);
  }
}
