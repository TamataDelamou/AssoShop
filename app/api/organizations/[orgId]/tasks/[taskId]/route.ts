import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { updateTask } from "@/lib/api/community-tasks";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; taskId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { taskId } = await params;
  const payload = await request.json().catch(() => null);

  try {
    const task = await updateTask(ctx.supabase, taskId, payload ?? {});
    if (!task) {
      return NextResponse.json({ error: "Tâche introuvable" }, { status: 404 });
    }
    return NextResponse.json(task);
  } catch (err) {
    return apiError(err);
  }
}
