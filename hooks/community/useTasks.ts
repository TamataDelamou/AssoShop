"use client";

import { useState, useEffect, useCallback } from "react";
import { tasksService } from "@/services/community/tasks";
import { membersService } from "@/services/community/members";
import {
  CommunityTask,
  CreateTaskPayload,
  Member,
  UpdateTaskPayload,
} from "@/types/modules/community";

function parseTask(task: CommunityTask): CommunityTask {
  return {
    ...task,
    due_date: task.due_date ? new Date(task.due_date) : null,
    created_at: task.created_at ? new Date(task.created_at) : null,
  };
}

export function useTasks(organizationId: string) {
  const [tasks, setTasks] = useState<CommunityTask[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    const [tasksData, membersData] = await Promise.all([
      tasksService.getTasks(organizationId),
      membersService.getMembers(organizationId),
    ]);

    const tasksJoined = tasksData.map((task) => {
      const member = task.assignee_id
        ? membersData.find((m) => m.id === task.assignee_id)
        : undefined;
      return {
        ...parseTask(task),
        assignee: member
          ? { id: member.id, name: member.user?.name ?? "Utilisateur" }
          : undefined,
      };
    });

    return { tasks: tasksJoined, members: membersData };
  }, [organizationId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await load();
        if (!cancelled) {
          setTasks(data.tasks);
          setMembers(data.members);
        }
      } catch (err) {
        if (!cancelled) setError(err as Error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [load]);

  const refetch = useCallback(async () => {
    try {
      const data = await load();
      setTasks(data.tasks);
      setMembers(data.members);
    } catch (err) {
      setError(err as Error);
    }
  }, [load]);

  const createTask = useCallback(
    async (payload: CreateTaskPayload) => {
      setCreating(true);
      setError(null);
      try {
        await tasksService.createTask(organizationId, payload);
        await refetch();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setCreating(false);
      }
    },
    [organizationId, refetch],
  );

  const updateTask = useCallback(
    async (taskId: string, payload: UpdateTaskPayload) => {
      setBusyTaskId(taskId);
      setError(null);
      try {
        await tasksService.updateTask(organizationId, taskId, payload);
        await refetch();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setBusyTaskId(null);
      }
    },
    [organizationId, refetch],
  );

  return {
    tasks,
    members,
    loading,
    creating,
    busyTaskId,
    error,
    createTask,
    updateTask,
  };
}
