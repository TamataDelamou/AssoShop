import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { updateLeaveStatus } from "@/lib/api/community-hr";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; leaveId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { leaveId } = await params;
  const payload = await request.json().catch(() => null);

  if (!payload?.status) {
    return NextResponse.json({ error: "Statut requis" }, { status: 400 });
  }

  try {
    const leave = await updateLeaveStatus(ctx.supabase, leaveId, payload.status);
    if (!leave) {
      return NextResponse.json({ error: "Congé introuvable" }, { status: 404 });
    }
    return NextResponse.json(leave);
  } catch (err) {
    return apiError(err);
  }
}
