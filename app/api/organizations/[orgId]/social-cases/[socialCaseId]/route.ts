import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import {
  disburseSocialCase,
  validateSocialCase,
} from "@/lib/api/community-welfare";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; socialCaseId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { socialCaseId } = await params;
  const payload = await request.json().catch(() => null);

  try {
    let socialCase;
    if (payload?.action === "approve" || payload?.action === "reject") {
      socialCase = await validateSocialCase(
        ctx.supabase,
        socialCaseId,
        payload.action,
        payload.committee_note ?? null,
      );
    } else if (payload?.action === "disburse") {
      socialCase = await disburseSocialCase(ctx.supabase, socialCaseId);
    } else {
      return NextResponse.json(
        { error: "Action invalide (approve, reject, disburse)" },
        { status: 400 },
      );
    }

    if (!socialCase) {
      return NextResponse.json(
        { error: "Cas social introuvable" },
        { status: 404 },
      );
    }
    return NextResponse.json(socialCase);
  } catch (err) {
    return apiError(err);
  }
}
