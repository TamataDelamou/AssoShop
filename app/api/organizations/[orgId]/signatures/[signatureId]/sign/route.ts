import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { signSignature } from "@/lib/api/community-governance";

// L'appelant signe SA propre ligne : le signataire n'est plus désigné par le
// client mais reconnu en base à partir du compte connecté (migration 0027).
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string; signatureId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { signatureId } = await params;

  try {
    const signature = await signSignature(ctx.supabase, signatureId);
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
