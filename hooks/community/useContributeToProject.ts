"use client";

import { useState } from "react";
import { projectsService } from "@/services/community/projects";
import {
  CommunityProject,
  ContributeToProjectPayload,
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

export function useContributeToProject() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingSync, setPendingSync] = useState(false);
  const online = useNetworkStatus();

  const contribute = async (
    organizationId: string,
    projectId: string,
    payload: ContributeToProjectPayload,
  ): Promise<CommunityProject | null> => {
    setLoading(true);
    setError(null);
    setPendingSync(false);
    try {
      if (!online) {
        const cacheKey = `${PROJECT_CONFIG.CACHE_KEY_PREFIX}${organizationId}`;
        enqueueSync({
          module: PROJECT_CONFIG.SYNC_MODULE,
          action: "contribute",
          payload: { organizationId, projectId, ...payload },
        });

        const cached = readCache<CommunityProject[]>(cacheKey) ?? [];
        const updated = cached.map((p) => {
          if (p.id !== projectId) return p;
          const raised = p.raised_amount + payload.amount;
          return {
            ...p,
            raised_amount: raised,
            status:
              raised >= p.goal_amount
                ? ProjectStatus.COMPLETED
                : p.status,
            contributions: [
              ...(p.contributions ?? []),
              {
                id: `local-${Date.now()}`,
                contributor_name: payload.anonymous
                  ? "Donateur anonyme"
                  : payload.contributor_name,
                amount: payload.amount,
                anonymous: payload.anonymous,
                contributed_at: new Date(),
              },
            ],
          };
        });
        writeCache(cacheKey, updated, PROJECT_CONFIG.CACHE_TTL_MS);
        setPendingSync(true);
        return null;
      }

      return await projectsService.contribute(
        organizationId,
        projectId,
        payload,
      );
    } catch (err: unknown) {
      const message =
        (err as ApiError).response?.data?.message ||
        PROJECT_LABELS.CONTRIBUTE_ERROR;
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return { contribute, loading, error, pendingSync };
}
