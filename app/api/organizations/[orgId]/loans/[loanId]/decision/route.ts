import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { decideLoan } from "@/lib/api/finance";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; loanId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const { loanId } = await params;
  const payload = await request.json().catch(() => null);

  try {
    const loan = await decideLoan(supabase, loanId, payload?.approved === true);
    if (!loan) {
      return NextResponse.json({ error: "Prêt introuvable" }, { status: 404 });
    }
    return NextResponse.json(loan);
  } catch (err) {
    return apiError(err);
  }
}
