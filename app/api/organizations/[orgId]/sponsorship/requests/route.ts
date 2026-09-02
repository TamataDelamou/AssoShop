import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { createSponsorshipRequest } from "@/lib/api/finance";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  await params;
  const payload = await request.json().catch(() => null);
  if (!payload?.group_id || !payload?.sponsor_id || !payload?.invitee_name) {
    return NextResponse.json(
      { error: "Groupe, parrain et invité requis" },
      { status: 400 },
    );
  }

  try {
    const requestRow = await createSponsorshipRequest(supabase, payload);
    if (!requestRow) {
      return NextResponse.json(
        { error: "Groupe introuvable" },
        { status: 404 },
      );
    }
    return NextResponse.json(requestRow, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
