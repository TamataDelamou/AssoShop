import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { decideTransfer } from "@/lib/api/community-mobility";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; relocationId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { orgId, relocationId } = await params;
  const payload = await request.json().catch(() => null);

  if (!payload?.status) {
    return NextResponse.json({ error: "Statut requis" }, { status: 400 });
  }

  try {
    const decision = await decideTransfer(
      ctx.supabase,
      orgId,
      relocationId,
      payload,
    );
    return NextResponse.json(decision, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
