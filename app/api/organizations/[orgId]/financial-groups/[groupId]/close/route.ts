import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { closeGroup } from "@/lib/api/finance";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string; groupId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const { groupId } = await params;

  try {
    const group = await closeGroup(supabase, groupId);
    if (!group) {
      return NextResponse.json(
        { error: "Groupe introuvable" },
        { status: 404 },
      );
    }
    return NextResponse.json(group);
  } catch (err) {
    return apiError(err);
  }
}
