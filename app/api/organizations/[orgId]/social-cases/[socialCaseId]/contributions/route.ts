import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { contributeSocialCase } from "@/lib/api/community-welfare";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; socialCaseId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { socialCaseId } = await params;
  const payload = await request.json().catch(() => null);

  if (!payload?.contributor_name || !payload?.amount) {
    return NextResponse.json(
      { error: "Contributeur et montant requis" },
      { status: 400 },
    );
  }

  try {
    const socialCase = await contributeSocialCase(ctx.supabase, socialCaseId, {
      name: payload.contributor_name,
      amount: payload.amount,
      anonymous: Boolean(payload.anonymous),
    });
    if (!socialCase) {
      return NextResponse.json(
        { error: "Cas social introuvable" },
        { status: 404 },
      );
    }
    return NextResponse.json(socialCase, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
