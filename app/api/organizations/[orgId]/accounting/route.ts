import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { getAccounting } from "@/lib/api/accounting";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const { orgId } = await params;

  try {
    const bundle = await getAccounting(supabase, orgId);
    return NextResponse.json(bundle);
  } catch (err) {
    return apiError(err);
  }
}
