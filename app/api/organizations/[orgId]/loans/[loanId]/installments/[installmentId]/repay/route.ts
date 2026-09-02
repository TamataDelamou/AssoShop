import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { repayInstallment } from "@/lib/api/finance";

export async function POST(
  _request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      orgId: string;
      loanId: string;
      installmentId: string;
    }>;
  },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const { loanId, installmentId } = await params;

  try {
    const loan = await repayInstallment(supabase, loanId, installmentId);
    if (!loan) {
      return NextResponse.json(
        { error: "Échéance introuvable" },
        { status: 404 },
      );
    }
    return NextResponse.json(loan);
  } catch (err) {
    return apiError(err);
  }
}
