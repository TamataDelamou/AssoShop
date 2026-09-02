import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { validatePayment } from "@/lib/api/finance";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string; groupId: string; paymentId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const { groupId, paymentId } = await params;

  try {
    const group = await validatePayment(supabase, groupId, paymentId);
    if (!group) {
      return NextResponse.json(
        { error: "Versement ou groupe introuvable" },
        { status: 404 },
      );
    }
    return NextResponse.json(group);
  } catch (err) {
    return apiError(err);
  }
}
