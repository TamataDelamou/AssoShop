import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { createEntry } from "@/lib/api/accounting";

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
    !payload?.account_type ||
    !payload?.entry_type ||
    !payload?.label ||
    !payload?.amount
  ) {
    return NextResponse.json(
      { error: "Champs requis manquants" },
      { status: 400 },
    );
  }

  try {
    const entry = await createEntry(supabase, orgId, payload);
    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
