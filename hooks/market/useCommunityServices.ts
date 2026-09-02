"use client";

import { useCallback, useEffect, useState } from "react";
import { communityServicesService } from "@/services/market/services";
import { CommunityService } from "@/types/modules/market";
import { MARKET_CONFIG, MARKET_MESSAGES } from "@/utils/constants";
import { readCache, useNetworkStatus, writeCache } from "@/lib/offline";

function parseServices(data: CommunityService[]): CommunityService[] {
  return data.map((s) => ({
    ...s,
    created_at: new Date(s.created_at),
    reviews: s.reviews.map((r) => ({
      ...r,
      created_at: new Date(r.created_at),
    })),
  }));
}

export function useCommunityServices() {
  const [services, setServices] = useState<CommunityService[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const online = useNetworkStatus();

  const cacheKey = `${MARKET_CONFIG.CACHE_KEY_PREFIX}services`;

  const fetchRemote = useCallback(async (): Promise<CommunityService[]> => {
    const data = await communityServicesService.getServices();
    return parseServices(data);
  }, []);

  const load = useCallback(async () => {
    const cached = readCache<CommunityService[]>(cacheKey);
    if (cached) {
      setServices(parseServices(cached));
      setFromCache(true);
      setLoading(false);
    }

    if (online) {
      try {
        const fresh = await fetchRemote();
        setServices(fresh);
        setFromCache(false);
        writeCache(cacheKey, fresh, MARKET_CONFIG.CACHE_TTL_MS);
      } catch (err) {
        console.error(MARKET_MESSAGES.SERVICES_LOAD_ERROR, err);
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

  return { services, loading, error, fromCache, online, refetch };
}
