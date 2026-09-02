import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { updateStaffStatus } from "@/lib/api/community-hr";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; staffId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { staffId } = await params;
  const payload = await request.json().catch(() => null);

  if (!payload?.status) {
    return NextResponse.json({ error: "Statut requis" }, { status: 400 });
  }

  try {
    const staff = await updateStaffStatus(ctx.supabase, staffId, payload.status);
    if (!staff) {
      return NextResponse.json(
        { error: "Membre du personnel introuvable" },
        { status: 404 },
      );
    }
    return NextResponse.json(staff);
  } catch (err) {
    return apiError(err);
  }
}
