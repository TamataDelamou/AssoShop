import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { updateBeneficiaryStatus } from "@/lib/api/community-welfare";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; beneficiaryId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { beneficiaryId } = await params;
  const payload = await request.json().catch(() => null);

  if (!payload?.status) {
    return NextResponse.json({ error: "Statut requis" }, { status: 400 });
  }

  try {
    const beneficiary = await updateBeneficiaryStatus(
      ctx.supabase,
      beneficiaryId,
      payload.status,
    );
    if (!beneficiary) {
      return NextResponse.json(
        { error: "Bénéficiaire introuvable" },
        { status: 404 },
      );
    }
    return NextResponse.json(beneficiary);
  } catch (err) {
    return apiError(err);
  }
}
