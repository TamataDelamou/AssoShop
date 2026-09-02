import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { createProject, listProjects } from "@/lib/api/community";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const { orgId } = await params;
  const search = request.nextUrl.searchParams.get("search") ?? "";
  const status = request.nextUrl.searchParams.get("status") ?? "";

  try {
    const projects = await listProjects(supabase, orgId, search, status);
    return NextResponse.json(projects);
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
  if (!payload?.name || !payload?.goal_amount) {
    return NextResponse.json(
      { error: "Nom et objectif requis" },
      { status: 400 },
    );
  }

  try {
    const project = await createProject(supabase, orgId, payload);
    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
