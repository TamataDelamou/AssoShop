import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { generateMobilityReport } from "@/lib/api/community-mobility";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; relocationId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { orgId, relocationId } = await params;
  const payload = await request.json().catch(() => null);

  if (!payload?.member_id) {
    return NextResponse.json({ error: "Membre requis" }, { status: 400 });
  }

  try {
    const report = await generateMobilityReport(
      ctx.supabase,
      orgId,
      relocationId,
      payload,
    );
    return NextResponse.json(report, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
