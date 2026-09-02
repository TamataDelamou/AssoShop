import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  CommunityTask,
  CreateTaskPayload,
  TaskStatus,
  UpdateTaskPayload,
} from "@/types/modules/community";

// Représentation sérialisable (dates en chaînes ISO) renvoyée par le mock.
// Le responsable (nom) est joint côté client par le hook useTasks.
type TaskDTO = Omit<CommunityTask, "due_date" | "created_at" | "assignee"> & {
  due_date: string | null;
  created_at: string | null;
};

const DAY_MS = 86_400_000;

function at(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * DAY_MS).toISOString();
}

function statusFromProgress(progress: number): TaskStatus {
  if (progress <= 0) return TaskStatus.TODO;
  if (progress >= 100) return TaskStatus.DONE;
  return TaskStatus.IN_PROGRESS;
}

const store: TaskDTO[] = [
  {
    id: "t-1",
    organization_id: "org-1",
    title: "Organiser la sortie familiale",
    description: "Réserver le lieu et coordonner la logistique.",
    assignee_id: "m-2",
    status: TaskStatus.IN_PROGRESS,
    progress: 60,
    due_date: at(15),
    created_at: at(-10),
  },
  {
    id: "t-2",
    organization_id: "org-1",
    title: "Préparer le bilan financier trimestriel",
    description: "Consolider les cotisations et dépenses du trimestre.",
    assignee_id: "m-3",
    status: TaskStatus.IN_PROGRESS,
    progress: 30,
    due_date: at(20),
    created_at: at(-8),
  },
  {
    id: "t-3",
    organization_id: "org-1",
    title: "Mettre à jour la liste des membres",
    assignee_id: "m-1",
    status: TaskStatus.DONE,
    progress: 100,
    due_date: at(-5),
    created_at: at(-30),
  },
  {
    id: "t-4",
    organization_id: "org-1",
    title: "Contacter le fournisseur de fournitures",
    assignee_id: null,
    status: TaskStatus.TODO,
    progress: 0,
    due_date: at(10),
    created_at: at(-2),
  },
];

const LIST_URL = /^\/organizations\/[^/]+\/tasks$/;
const TASK_URL = /^\/organizations\/([^/]+)\/tasks\/([^/]+)$/;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function toResponse(data: unknown): AxiosResponse {
  return {
    data,
    status: 200,
    statusText: "OK",
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  };
}

function extractOrgId(url: string): string | null {
  const match = url.match(/^\/organizations\/([^/]+)\//);
  return match ? match[1] : null;
}

function listTasks(config: InternalAxiosRequestConfig): TaskDTO[] {
  const orgId = extractOrgId(config.url ?? "");
  return clone(
    store
      .filter((t) => t.organization_id === orgId)
      .sort((a, b) => {
        const order: Record<TaskStatus, number> = {
          [TaskStatus.IN_PROGRESS]: 0,
          [TaskStatus.TODO]: 1,
          [TaskStatus.DONE]: 2,
        };
        return (order[a.status] ?? 9) - (order[b.status] ?? 9);
      }),
  );
}

function createTask(config: InternalAxiosRequestConfig): TaskDTO {
  const payload = (config.data ?? {}) as CreateTaskPayload;
  const orgId = extractOrgId(config.url ?? "") ?? "";
  const now = new Date().toISOString();

  const record: TaskDTO = {
    id: `t-${Date.now()}`,
    organization_id: orgId,
    title: payload.title,
    description: payload.description ?? "",
    assignee_id: payload.assignee_id ?? null,
    status: TaskStatus.TODO,
    progress: 0,
    due_date: payload.due_date
      ? new Date(payload.due_date).toISOString()
      : null,
    created_at: now,
  };
  store.push(record);
  return clone(record);
}

function updateTask(config: InternalAxiosRequestConfig): TaskDTO {
  const match = TASK_URL.exec(config.url ?? "");
  const [, , taskId] = match ?? [];
  const payload = (config.data ?? {}) as UpdateTaskPayload;

  const record = store.find((t) => t.id === taskId);
  if (!record) throw new Error("Tâche introuvable");

  if (typeof payload.progress === "number") {
    const clamped = Math.max(0, Math.min(100, payload.progress));
    record.progress = clamped;
    record.status = statusFromProgress(clamped);
  }
  if ("assignee_id" in payload) {
    record.assignee_id = payload.assignee_id ?? null;
  }
  return clone(record);
}

export function tasksMockAdapter(
  config: InternalAxiosRequestConfig,
): AxiosAdapter | null {
  const method = (config.method ?? "get").toLowerCase();
  const url = config.url ?? "";

  if (method === "get" && LIST_URL.test(url)) {
    return async (cfg) => toResponse(listTasks(cfg));
  }
  if (method === "post" && LIST_URL.test(url)) {
    return async (cfg) => toResponse(createTask(cfg));
  }
  if (method === "patch" && TASK_URL.test(url)) {
    return async (cfg) => toResponse(updateTask(cfg));
  }

  return null;
}
