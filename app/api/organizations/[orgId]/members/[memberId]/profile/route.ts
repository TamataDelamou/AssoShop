import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { getMemberProfile } from "@/lib/api/community-mobility";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string; memberId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { orgId, memberId } = await params;

  try {
    const profile = await getMemberProfile(ctx.supabase, orgId, memberId);
    if (!profile) {
      return NextResponse.json({ error: "Membre introuvable" }, { status: 404 });
    }
    return NextResponse.json(profile);
  } catch (err) {
    return apiError(err);
  }
}
