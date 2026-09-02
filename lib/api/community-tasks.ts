import type { SupabaseClient } from "@supabase/supabase-js";
import { CommunityTask, Sanction } from "@/types/modules/community";

interface TaskRow {
  id: string;
  organization_id: string;
  title: string;
  description: string;
  assignee_id: string | null;
  status: string;
  progress: number | string;
  due_date: string | null;
  created_at: string | null;
}

interface SanctionRow {
  id: string;
  organization_id: string;
  member_id: string;
  type: string;
  reason: string;
  duration_days: number | string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_at: string | null;
}

const TASK_COLUMNS = [
  "id",
  "organization_id",
  "title",
  "description",
  "assignee_id",
  "status",
  "progress",
  "due_date",
  "created_at",
].join(", ");

const SANCTION_COLUMNS = [
  "id",
  "organization_id",
  "member_id",
  "type",
  "reason",
  "duration_days",
  "start_date",
  "end_date",
  "status",
  "created_at",
].join(", ");

export function serializeTask(row: TaskRow): CommunityTask {
  return {
    id: row.id,
    organization_id: row.organization_id,
    title: row.title,
    description: row.description,
    assignee_id: row.assignee_id ?? null,
    status: row.status as CommunityTask["status"],
    progress: Number(row.progress),
    due_date: row.due_date ? new Date(row.due_date) : null,
    created_at: row.created_at ? new Date(row.created_at) : null,
  };
}

function serializeSanction(row: SanctionRow): Sanction {
  return {
    id: row.id,
    organization_id: row.organization_id,
    member_id: row.member_id,
    type: row.type as Sanction["type"],
    reason: row.reason,
    duration_days: row.duration_days == null ? null : Number(row.duration_days),
    start_date: row.start_date ? new Date(row.start_date) : null,
    end_date: row.end_date ? new Date(row.end_date) : null,
    status: row.status as Sanction["status"],
    created_at: row.created_at ? new Date(row.created_at) : null,
  };
}

const TASK_PRIORITY: Record<string, number> = {
  in_progress: 0,
  todo: 1,
  done: 2,
};

export async function listTasks(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<CommunityTask[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_COLUMNS)
    .eq("organization_id", organizationId);
  if (error) throw new Error(error.message);
  return (data as unknown as TaskRow[])
    .map(serializeTask)
    .sort(
      (a, b) =>
        (TASK_PRIORITY[a.status] ?? 9) - (TASK_PRIORITY[b.status] ?? 9),
    );
}

export async function createTask(
  supabase: SupabaseClient,
  organizationId: string,
  payload: {
    title: string;
    description?: string;
    assignee_id?: string;
    due_date?: string;
  },
): Promise<CommunityTask> {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      organization_id: organizationId,
      title: payload.title,
      description: payload.description ?? "",
      assignee_id: payload.assignee_id ?? null,
      status: "todo",
      progress: 0,
      due_date: payload.due_date
        ? new Date(`${payload.due_date}T00:00:00.000Z`).toISOString()
        : null,
    })
    .select(TASK_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return serializeTask(data as unknown as TaskRow);
}

export async function updateTask(
  supabase: SupabaseClient,
  taskId: string,
  payload: { progress?: number; assignee_id?: string | null },
): Promise<CommunityTask | null> {
  const { data: task, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!task) return null;

  const patch: Record<string, unknown> = {};
  if (typeof payload.progress === "number") {
    const progress = Math.max(0, Math.min(100, Math.round(payload.progress)));
    patch.progress = progress;
    patch.status =
      progress === 0 ? "todo" : progress === 100 ? "done" : "in_progress";
  }
  if ("assignee_id" in payload) patch.assignee_id = payload.assignee_id ?? null;

  const { error: updateError } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", taskId);
  if (updateError) throw new Error(updateError.message);

  const { data: updated } = await supabase
    .from("tasks")
    .select(TASK_COLUMNS)
    .eq("id", taskId)
    .maybeSingle();
  return updated ? serializeTask(updated as unknown as TaskRow) : null;
}

export async function listSanctions(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<Sanction[]> {
  const { data, error } = await supabase
    .from("sanctions")
    .select(SANCTION_COLUMNS)
    .eq("organization_id", organizationId)
    .order("start_date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as unknown as SanctionRow[]).map(serializeSanction);
}

export async function applySanction(
  supabase: SupabaseClient,
  organizationId: string,
  payload: { member_id: string; type: string; reason: string; duration_days?: number },
): Promise<Sanction> {
  const startDate = new Date().toISOString();
  const duration = payload.duration_days ?? null;
  const endDate =
    duration != null && duration > 0
      ? new Date(Date.now() + duration * 86_400_000).toISOString()
      : null;

  const { data, error } = await supabase
    .from("sanctions")
    .insert({
      organization_id: organizationId,
      member_id: payload.member_id,
      type: payload.type,
      reason: payload.reason,
      duration_days: duration,
      start_date: startDate,
      end_date: endDate,
      status: "active",
    })
    .select(SANCTION_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return serializeSanction(data as unknown as SanctionRow);
}

export async function liftSanction(
  supabase: SupabaseClient,
  sanctionId: string,
): Promise<Sanction | null> {
  const { data: sanction, error } = await supabase
    .from("sanctions")
    .select("*")
    .eq("id", sanctionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!sanction) return null;

  const { error: updateError } = await supabase
    .from("sanctions")
    .update({ status: "lifted", end_date: new Date().toISOString() })
    .eq("id", sanctionId);
  if (updateError) throw new Error(updateError.message);

  const { data: updated } = await supabase
    .from("sanctions")
    .select(SANCTION_COLUMNS)
    .eq("id", sanctionId)
    .maybeSingle();
  return updated ? serializeSanction(updated as unknown as SanctionRow) : null;
}
