"use client";

import { projectsService } from "@/services/community/projects";
import { CommunityProject } from "@/types/modules/community";
import { PROJECT_CONFIG } from "@/utils/constants";
import { declareOffline, useOfflineQuery } from "@/lib/offline";

declareOffline({
  module: "projects",
  cacheableReads: [PROJECT_CONFIG.CACHE_KEY_PREFIX],
  deferredMutations: [],
});

function parseProjects(data: CommunityProject[]): CommunityProject[] {
  return data.map((p) => ({
    ...p,
    start_date: p.start_date ? new Date(p.start_date) : null,
    created_at: p.created_at ? new Date(p.created_at) : null,
    contributions: p.contributions?.map((c) => ({
      ...c,
      contributed_at: c.contributed_at ? new Date(c.contributed_at) : null,
    })),
  }));
}

export function useProjects(
  organizationId: string,
  search = "",
  status = "",
) {
  const cacheKey = `${PROJECT_CONFIG.CACHE_KEY_PREFIX}${organizationId}:${search || "_"}:${status || "_"}`;
  const { data, loading, error, fromCache, online, refetch } =
    useOfflineQuery<CommunityProject[]>(
      cacheKey,
      () =>
        projectsService.getProjects(organizationId, {
          search: search || undefined,
          status: status || undefined,
        }),
      { ttlMs: PROJECT_CONFIG.CACHE_TTL_MS, parse: parseProjects },
    );

  return { projects: data ?? [], loading, error, fromCache, online, refetch };
}
