"use client";

import { useCallback, useEffect, useState } from "react";
import { projectsService } from "@/services/community/projects";
import { CommunityProject } from "@/types/modules/community";
import { PROJECT_CONFIG, PROJECT_LABELS } from "@/utils/constants";
import { readCache, useNetworkStatus, writeCache } from "@/lib/offline";

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
  const [projects, setProjects] = useState<CommunityProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const online = useNetworkStatus();

  const cacheKey = `${PROJECT_CONFIG.CACHE_KEY_PREFIX}${organizationId}`;

  const fetchRemote = useCallback(async (): Promise<CommunityProject[]> => {
    const data = await projectsService.getProjects(organizationId, {
      search: search || undefined,
      status: status || undefined,
    });
    return parseProjects(data);
  }, [organizationId, search, status]);

  const load = useCallback(async () => {
    const cached = readCache<CommunityProject[]>(cacheKey);
    if (cached) {
      setProjects(parseProjects(cached));
      setFromCache(true);
      setLoading(false);
    }

    if (online) {
      try {
        const fresh = await fetchRemote();
        setProjects(fresh);
        setFromCache(false);
        writeCache(cacheKey, fresh, PROJECT_CONFIG.CACHE_TTL_MS);
      } catch (err) {
        console.error(PROJECT_LABELS.LOAD_ERROR, err);
        if (!cached) {
          setError(err as Error);
        }
      }
    }
  }, [cacheKey, online, fetchRemote]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await load();
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [load]);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    await load();
    setLoading(false);
  }, [load]);

  return { projects, loading, error, fromCache, online, refetch };
}
