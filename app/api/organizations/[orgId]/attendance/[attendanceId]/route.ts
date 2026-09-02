import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { updateAttendance } from "@/lib/api/community-hr";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; attendanceId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { attendanceId } = await params;
  const payload = await request.json().catch(() => null);

  if (typeof payload?.present !== "boolean") {
    return NextResponse.json(
      { error: "Champ present (booléen) requis" },
      { status: 400 },
    );
  }

  try {
    const record = await updateAttendance(
      ctx.supabase,
      attendanceId,
      payload.present,
    );
    if (!record) {
      return NextResponse.json(
        { error: "Pointage introuvable" },
        { status: 404 },
      );
    }
    return NextResponse.json(record);
  } catch (err) {
    return apiError(err);
  }
}
