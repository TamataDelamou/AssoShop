import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import {
  listContributions,
  payContribution,
} from "@/lib/api/community-welfare";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { orgId } = await params;
  const search = request.nextUrl.searchParams.get("search") ?? "";
  const status = request.nextUrl.searchParams.get("status") ?? "";

  try {
    return NextResponse.json(
      await listContributions(ctx.supabase, orgId, search, status),
    );
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

  if (!payload?.beneficiary_member_id || !payload?.amount || !payload?.method) {
    return NextResponse.json(
      { error: "Membre, montant et méthode requis" },
      { status: 400 },
    );
  }

  try {
    const contribution = await payContribution(ctx.supabase, orgId, payload);
    return NextResponse.json(contribution, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
