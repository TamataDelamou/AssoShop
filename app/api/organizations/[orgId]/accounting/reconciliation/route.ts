import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import {
  getReconciliation,
  reconcileLine,
} from "@/lib/api/accounting";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const { orgId } = await params;

  try {
    const lines = await getReconciliation(supabase, orgId);
    return NextResponse.json(lines);
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
  const { supabase } = ctx;

  await params;
  const payload = await request.json().catch(() => null);
  if (!payload?.line_id) {
    return NextResponse.json({ error: "Ligne requise" }, { status: 400 });
  }

  try {
    const line = await reconcileLine(
      supabase,
      payload.line_id,
      payload.entry_id ?? null,
    );
    if (!line) {
      return NextResponse.json(
        { error: "Ligne introuvable" },
        { status: 404 },
      );
    }
    return NextResponse.json(line);
  } catch (err) {
    return apiError(err);
  }
}
