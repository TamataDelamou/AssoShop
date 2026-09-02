import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { requestLoan } from "@/lib/api/finance";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; groupId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const { groupId } = await params;
  const payload = await request.json().catch(() => null);
  if (!payload?.member_id || !payload?.amount) {
    return NextResponse.json(
      { error: "Membre et montant requis" },
      { status: 400 },
    );
  }

  try {
    const loan = await requestLoan(supabase, groupId, payload);
    if (!loan) {
      return NextResponse.json(
        { error: "Groupe introuvable" },
        { status: 404 },
      );
    }
    return NextResponse.json(loan, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
