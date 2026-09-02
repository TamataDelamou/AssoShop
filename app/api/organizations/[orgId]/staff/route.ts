import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { createStaff, listStaff } from "@/lib/api/community-hr";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { orgId } = await params;

  try {
    return NextResponse.json(await listStaff(ctx.supabase, orgId));
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

  if (!payload?.first_name || !payload?.last_name) {
    return NextResponse.json(
      { error: "Prénom et nom requis" },
      { status: 400 },
    );
  }

  try {
    const staff = await createStaff(ctx.supabase, orgId, payload);
    return NextResponse.json(staff, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
