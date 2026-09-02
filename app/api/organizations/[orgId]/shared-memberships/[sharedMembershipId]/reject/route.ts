import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { decideSharedMembership } from "@/lib/api/community-network";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string; sharedMembershipId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { sharedMembershipId } = await params;

  try {
    const membership = await decideSharedMembership(
      ctx.supabase,
      sharedMembershipId,
      false,
    );
    if (!membership) {
      return NextResponse.json(
        { error: "Demande introuvable" },
        { status: 404 },
      );
    }
    return NextResponse.json(membership);
  } catch (err) {
    return apiError(err);
  }
}
