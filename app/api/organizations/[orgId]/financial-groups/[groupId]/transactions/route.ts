import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { getTransactions } from "@/lib/api/finance";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string; groupId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const { groupId } = await params;

  try {
    const transactions = await getTransactions(supabase, groupId);
    if (!transactions) {
      return NextResponse.json(
        { error: "Groupe introuvable" },
        { status: 404 },
      );
    }
    return NextResponse.json(transactions);
  } catch (err) {
    return apiError(err);
  }
}
