import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { validateContribution } from "@/lib/api/community-welfare";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; contributionId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { contributionId } = await params;
  const payload = await request.json().catch(() => null);

  if (
    (payload?.decision !== "approve" && payload?.decision !== "reject") ||
    !payload?.validator_name
  ) {
    return NextResponse.json(
      { error: "Décision et validateur requis" },
      { status: 400 },
    );
  }

  try {
    const contribution = await validateContribution(
      ctx.supabase,
      contributionId,
      payload,
    );
    if (!contribution) {
      return NextResponse.json(
        { error: "Cotisation introuvable" },
        { status: 404 },
      );
    }
    return NextResponse.json(contribution);
  } catch (err) {
    return apiError(err);
  }
}
