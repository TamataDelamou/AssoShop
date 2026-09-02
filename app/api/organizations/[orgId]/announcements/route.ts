import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import {
  listAnnouncements,
  publishAnnouncement,
} from "@/lib/api/community";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const { orgId } = await params;
  const search = request.nextUrl.searchParams.get("search") ?? "";

  try {
    const items = await listAnnouncements(supabase, orgId, search);
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
  if (!payload?.title || !payload?.content || !payload?.audience) {
    return NextResponse.json(
      { error: "Titre, contenu et audience requis" },
      { status: 400 },
    );
  }

  try {
    const item = await publishAnnouncement(supabase, orgId, payload);
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
