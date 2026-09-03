import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { createGroup, listGroups } from "@/lib/api/finance";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const { orgId } = await params;
  const search = request.nextUrl.searchParams.get("search") ?? "";
  const type = request.nextUrl.searchParams.get("type") ?? "";

  try {
    const groups = await listGroups(supabase, orgId, search, type);
    return NextResponse.json(groups);
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
  const { supabase, user } = ctx;

  const { orgId } = await params;
  const payload = await request.json().catch(() => null);
  if (
    !payload?.name ||
    !payload?.type ||
    !payload?.amount ||
    !payload?.periodicity ||
    !payload?.max_members
  ) {
    return NextResponse.json(
      { error: "Champs requis manquants" },
      { status: 400 },
    );
  }

  try {
    const group = await createGroup(supabase, orgId, {
      ...payload,
      creator_user_id: user.id,
    });
    return NextResponse.json(group, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
