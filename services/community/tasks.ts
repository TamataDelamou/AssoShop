// services/community/tasks.ts
import { base44Client } from "@/lib/base44";
import {
  CommunityTask,
  CreateTaskPayload,
  UpdateTaskPayload,
} from "@/types/modules/community";

export const tasksService = {
  async getTasks(organizationId: string): Promise<CommunityTask[]> {
    const response = await base44Client.get(
      `/organizations/${organizationId}/tasks`,
    );
    return response.data;
  },

  async createTask(
    organizationId: string,
    payload: CreateTaskPayload,
  ): Promise<CommunityTask> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/tasks`,
      payload,
    );
    return response.data;
  },

  async updateTask(
    organizationId: string,
    taskId: string,
    payload: UpdateTaskPayload,
  ): Promise<CommunityTask> {
    const response = await base44Client.patch(
      `/organizations/${organizationId}/tasks/${taskId}`,
      payload,
    );
    return response.data;
  },
};
