import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import {
  createSocialCase,
  listSocialCases,
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
      await listSocialCases(ctx.supabase, orgId, search, status),
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

  if (
    !payload?.title ||
    !payload?.beneficiary_name ||
    !payload?.target_amount ||
    !payload?.type
  ) {
    return NextResponse.json(
      { error: "Titre, bénéficiaire, montant et type requis" },
      { status: 400 },
    );
  }

  try {
    const socialCase = await createSocialCase(ctx.supabase, orgId, payload);
    return NextResponse.json(socialCase, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
