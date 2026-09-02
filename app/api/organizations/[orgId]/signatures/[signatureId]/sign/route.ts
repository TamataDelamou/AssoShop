import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { signSignature } from "@/lib/api/community-governance";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; signatureId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { signatureId } = await params;
  const payload = await request.json().catch(() => null);

  if (!payload?.signatory_id) {
    return NextResponse.json(
      { error: "Signataire requis" },
      { status: 400 },
    );
  }

  try {
    const signature = await signSignature(
      ctx.supabase,
      signatureId,
      payload.signatory_id,
    );
    if (!signature) {
      return NextResponse.json(
        { error: "Demande introuvable" },
        { status: 404 },
      );
    }
    return NextResponse.json(signature);
  } catch (err) {
    return apiError(err);
  }
}
