import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import {
  createTransaction,
  listTransactions,
} from "@/lib/api/accounting";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const { orgId } = await params;

  try {
    const transactions = await listTransactions(supabase, orgId);
    return NextResponse.json(transactions);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const { orgId } = await params;
  const payload = await request.json().catch(() => null);
  if (!payload?.type || !payload?.label || !payload?.amount || !payload?.account) {
    return NextResponse.json(
      { error: "Champs requis manquants" },
      { status: 400 },
    );
  }

  try {
    const transaction = await createTransaction(supabase, orgId, payload);
    return NextResponse.json(transaction, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
