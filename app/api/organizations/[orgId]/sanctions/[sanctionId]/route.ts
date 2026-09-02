import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { liftSanction } from "@/lib/api/community-tasks";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; sanctionId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { sanctionId } = await params;
  const payload = await request.json().catch(() => null);

  if (payload?.action !== "lift") {
    return NextResponse.json(
      { error: "Action 'lift' requise" },
      { status: 400 },
    );
  }

  try {
    const sanction = await liftSanction(ctx.supabase, sanctionId);
    if (!sanction) {
      return NextResponse.json({ error: "Sanction introuvable" }, { status: 404 });
    }
    return NextResponse.json(sanction);
  } catch (err) {
    return apiError(err);
  }
}
