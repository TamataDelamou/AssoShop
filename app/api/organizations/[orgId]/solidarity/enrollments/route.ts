import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { enrollInsurance } from "@/lib/api/finance";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const { orgId } = await params;
  const payload = await request.json().catch(() => null);
  if (!payload?.member_id || !payload?.member_name) {
    return NextResponse.json(
      { error: "Membre requis" },
      { status: 400 },
    );
  }

  try {
    const enrollment = await enrollInsurance(supabase, orgId, payload);
    return NextResponse.json(enrollment, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
