import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { closeElection } from "@/lib/api/community-governance";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; electionId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { electionId } = await params;
  const payload = await request.json().catch(() => null);

  if (payload?.action !== "close") {
    return NextResponse.json(
      { error: "Action 'close' requise" },
      { status: 400 },
    );
  }

  try {
    const election = await closeElection(ctx.supabase, electionId);
    if (!election) {
      return NextResponse.json({ error: "Élection introuvable" }, { status: 404 });
    }
    return NextResponse.json(election);
  } catch (err) {
    return apiError(err);
  }
}
