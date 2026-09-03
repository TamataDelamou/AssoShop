"use client";

import { useCallback, useState } from "react";
import { tasksService } from "@/services/community/tasks";
import { membersService } from "@/services/community/members";
import {
  CommunityTask,
  CreateTaskPayload,
  Member,
  UpdateTaskPayload,
} from "@/types/modules/community";
import { TASK_CONFIG } from "@/utils/constants";
import { declareOffline, useOfflineQuery } from "@/lib/offline";

declareOffline({
  module: "tasks",
  cacheableReads: [TASK_CONFIG.CACHE_KEY_PREFIX],
  deferredMutations: [],
});

function parseTask(task: CommunityTask): CommunityTask {
  return {
    ...task,
    due_date: task.due_date ? new Date(task.due_date) : null,
    created_at: task.created_at ? new Date(task.created_at) : null,
  };
}

interface TasksBundle {
  tasks: CommunityTask[];
  members: Member[];
}

export function useTasks(organizationId: string) {
  const [creating, setCreating] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<Error | null>(null);
  const { data, loading, error: loadError, refresh } =
    useOfflineQuery<TasksBundle>(
      `${TASK_CONFIG.CACHE_KEY_PREFIX}${organizationId}`,
      async () => {
        const [tasks, members] = await Promise.all([
          tasksService.getTasks(organizationId),
          membersService.getMembers(organizationId),
        ]);
        return { tasks, members };
      },
      {
        ttlMs: TASK_CONFIG.CACHE_TTL_MS,
        parse: (bundle) => ({
          tasks: bundle.tasks.map((task) => {
            const member = task.assignee_id
              ? bundle.members.find((m) => m.id === task.assignee_id)
              : undefined;
            return {
              ...parseTask(task),
              assignee: member
                ? { id: member.id, name: member.user?.name ?? "Utilisateur" }
                : undefined,
            };
          }),
          members: bundle.members,
        }),
      },
    );

  const error = actionError ?? loadError;

  const createTask = useCallback(
    async (payload: CreateTaskPayload) => {
      setCreating(true);
      setActionError(null);
      try {
        await tasksService.createTask(organizationId, payload);
        await refresh();
      } catch (err) {
        setActionError(err as Error);
        throw err;
      } finally {
        setCreating(false);
      }
    },
    [organizationId, refresh],
  );

  const updateTask = useCallback(
    async (taskId: string, payload: UpdateTaskPayload) => {
      setBusyTaskId(taskId);
      setActionError(null);
      try {
        await tasksService.updateTask(organizationId, taskId, payload);
        await refresh();
      } catch (err) {
        setActionError(err as Error);
        throw err;
      } finally {
        setBusyTaskId(null);
      }
    },
    [organizationId, refresh],
  );

  return {
    tasks: data?.tasks ?? [],
    members: data?.members ?? [],
    loading,
    creating,
    busyTaskId,
    error,
    createTask,
    updateTask,
  };
}
