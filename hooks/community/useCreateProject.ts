"use client";

import { useState } from "react";
import { projectsService } from "@/services/community/projects";
import {
  CommunityProject,
  CreateProjectPayload,
  ProjectStatus,
} from "@/types/modules/community";
import { PROJECT_CONFIG, PROJECT_LABELS } from "@/utils/constants";
import {
  enqueueSync,
  readCache,
  useNetworkStatus,
  writeCache,
} from "@/lib/offline";

type ApiError = { response?: { data?: { message?: string } } };

export function useCreateProject() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingSync, setPendingSync] = useState(false);
  const online = useNetworkStatus();

  const createProject = async (
    organizationId: string,
    payload: CreateProjectPayload,
  ): Promise<CommunityProject | null> => {
    setLoading(true);
    setError(null);
    setPendingSync(false);
    try {
      if (!online) {
        const cacheKey = `${PROJECT_CONFIG.CACHE_KEY_PREFIX}${organizationId}`;
        enqueueSync({
          module: PROJECT_CONFIG.SYNC_MODULE,
          action: "create",
          payload: { organizationId, ...payload },
        });

        const cached = readCache<CommunityProject[]>(cacheKey) ?? [];
        const optimistic: CommunityProject = {
          id: `local-${Date.now()}`,
          organization_id: organizationId,
          name: payload.name,
          description: payload.description,
          goal_amount: payload.goal_amount,
          raised_amount: 0,
          status: ProjectStatus.IN_PROGRESS,
          relayed_from: null,
          relayed_to_affiliates: payload.relayed_to_affiliates,
          start_date: new Date(),
          created_at: new Date(),
          contributions: [],
        };
        writeCache(
          cacheKey,
          [optimistic, ...cached],
          PROJECT_CONFIG.CACHE_TTL_MS,
        );
        setPendingSync(true);
        return null;
      }

      return await projectsService.createProject(organizationId, payload);
    } catch (err: unknown) {
      const message =
        (err as ApiError).response?.data?.message ||
        PROJECT_LABELS.CREATE_ERROR;
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return { createProject, loading, error, pendingSync };
}
