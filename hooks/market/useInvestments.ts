"use client";

import { useCallback, useEffect, useState } from "react";
import { investmentsService } from "@/services/market/investments";
import { InvestmentProject } from "@/types/modules/market";
import { MARKET_CONFIG, MARKET_MESSAGES } from "@/utils/constants";
import { readCache, useNetworkStatus, writeCache } from "@/lib/offline";

function parseProjects(data: InvestmentProject[]): InvestmentProject[] {
  return data.map((p) => ({
    ...p,
    created_at: new Date(p.created_at),
  }));
}

export function useInvestments() {
  const [projects, setProjects] = useState<InvestmentProject[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const online = useNetworkStatus();

  const cacheKey = `${MARKET_CONFIG.CACHE_KEY_PREFIX}investments`;

  const fetchRemote = useCallback(async (): Promise<InvestmentProject[]> => {
    const data = await investmentsService.getProjects();
    return parseProjects(data);
  }, []);

  const load = useCallback(async () => {
    const cached = readCache<InvestmentProject[]>(cacheKey);
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
        writeCache(cacheKey, fresh, MARKET_CONFIG.CACHE_TTL_MS);
      } catch (err) {
        console.error(MARKET_MESSAGES.PROJECTS_LOAD_ERROR, err);
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
