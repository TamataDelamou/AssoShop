import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { contributeToProject } from "@/lib/api/community";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; projectId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const { projectId } = await params;
  const payload = await request.json().catch(() => null);
  if (!payload?.contributor_name || !payload?.amount) {
    return NextResponse.json(
      { error: "Contributeur et montant requis" },
      { status: 400 },
    );
  }

  try {
    const project = await contributeToProject(supabase, projectId, payload);
    if (!project) {
      return NextResponse.json(
        { error: "Projet introuvable" },
        { status: 404 },
      );
    }
    return NextResponse.json(project);
  } catch (err) {
    return apiError(err);
  }
}
