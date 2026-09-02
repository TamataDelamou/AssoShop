import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { castVote } from "@/lib/api/community-governance";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; electionId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { electionId } = await params;
  const payload = await request.json().catch(() => null);

  if (!payload?.candidate_id) {
    return NextResponse.json({ error: "Candidat requis" }, { status: 400 });
  }

  try {
    const election = await castVote(
      ctx.supabase,
      electionId,
      payload.candidate_id,
    );
    if (!election) {
      return NextResponse.json({ error: "Élection introuvable" }, { status: 404 });
    }
    return NextResponse.json(election, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
