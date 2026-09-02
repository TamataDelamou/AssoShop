import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import {
  createRelocation,
  listRelocations,
} from "@/lib/api/community-network";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { orgId } = await params;

  try {
    return NextResponse.json(await listRelocations(ctx.supabase, orgId));
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
    !payload?.member_id ||
    !payload?.old_address ||
    !payload?.new_address ||
    !payload?.new_city
  ) {
    return NextResponse.json(
      { error: "Membre, ancienne et nouvelle adresse requis" },
      { status: 400 },
    );
  }

  try {
    const relocation = await createRelocation(ctx.supabase, orgId, payload);
    return NextResponse.json(relocation, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
