import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import {
  createBeneficiary,
  listBeneficiaries,
} from "@/lib/api/community-welfare";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { orgId } = await params;

  try {
    return NextResponse.json(await listBeneficiaries(ctx.supabase, orgId));
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
  const { orgId } = await params;
  const payload = await request.json().catch(() => null);

  if (!payload?.project_id || !payload?.name || !payload?.category) {
    return NextResponse.json(
      { error: "Projet, nom et catégorie requis" },
      { status: 400 },
    );
  }

  try {
    const beneficiary = await createBeneficiary(ctx.supabase, orgId, payload);
    return NextResponse.json(beneficiary, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
