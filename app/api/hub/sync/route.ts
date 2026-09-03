import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { enqueueSync } from "@/lib/api/hub-producers";

export async function POST(request: NextRequest) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;

  const payload = await request.json().catch(() => null);
  if (!payload?.action || !payload?.module) {
    return NextResponse.json(
      { error: "Action et module requis" },
      { status: 400 },
    );
  }

  try {
    const item = await enqueueSync(
      supabase,
      user.id,
      String(payload.action),
      String(payload.module),
    );
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
