import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { listDocuments, uploadDocument } from "@/lib/api/community";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const { orgId } = await params;
  const search = request.nextUrl.searchParams.get("search") ?? "";
  const category = request.nextUrl.searchParams.get("category") ?? "";

  try {
    const items = await listDocuments(supabase, orgId, search, category);
    return NextResponse.json(items);
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

  const { orgId } = await params;
  const payload = await request.json().catch(() => null);
  if (
    !payload?.name ||
    !payload?.category ||
    !payload?.file_name ||
    !payload?.file_type
  ) {
    return NextResponse.json(
      { error: "Champs requis manquants" },
      { status: 400 },
    );
  }

  try {
    const doc = await uploadDocument(supabase, orgId, payload);
    return NextResponse.json(doc, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
