import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { saveMinutes } from "@/lib/api/community";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; meetingId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const { meetingId } = await params;
  const payload = await request.json().catch(() => null);

  if (payload?.action !== "save-minutes" || typeof payload.minutes !== "string") {
    return NextResponse.json(
      { error: "Compte-rendu requis" },
      { status: 400 },
    );
  }

  try {
    const meeting = await saveMinutes(supabase, meetingId, payload.minutes);
    if (!meeting) {
      return NextResponse.json(
        { error: "Réunion introuvable" },
        { status: 404 },
      );
    }
    return NextResponse.json(meeting);
  } catch (err) {
    return apiError(err);
  }
}
