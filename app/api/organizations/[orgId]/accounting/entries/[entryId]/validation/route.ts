import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { validateEntry } from "@/lib/api/accounting";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; entryId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const { entryId } = await params;
  const payload = await request.json().catch(() => null);
  if (
    (payload?.decision !== "approve" && payload?.decision !== "reject") ||
    !payload?.validator_name
  ) {
    return NextResponse.json(
      { error: "Décision et validateur requis" },
      { status: 400 },
    );
  }

  try {
    const entry = await validateEntry(supabase, entryId, payload);
    if (!entry) {
      return NextResponse.json(
        { error: "Écriture introuvable" },
        { status: 404 },
      );
    }
    return NextResponse.json(entry);
  } catch (err) {
    return apiError(err);
  }
}
