import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { declarePayment } from "@/lib/api/finance";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; groupId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const { groupId } = await params;
  const payload = await request.json().catch(() => null);
  if (!payload?.member_id || !payload?.amount || !payload?.method) {
    return NextResponse.json(
      { error: "Membre, montant et méthode requis" },
      { status: 400 },
    );
  }

  try {
    const group = await declarePayment(supabase, groupId, payload);
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
