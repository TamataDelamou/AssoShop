import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import {
  createSignature,
  listSignatures,
} from "@/lib/api/community-governance";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { orgId } = await params;

  try {
    return NextResponse.json(await listSignatures(ctx.supabase, orgId));
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

  if (!payload?.type || !payload?.title || !payload?.requested_by) {
    return NextResponse.json(
      { error: "Type, titre et demandeur requis" },
      { status: 400 },
    );
  }

  try {
    const signature = await createSignature(ctx.supabase, orgId, payload);
    return NextResponse.json(signature, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
