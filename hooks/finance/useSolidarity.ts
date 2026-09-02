"use client";

import { useCallback, useEffect, useState } from "react";
import { solidarityService } from "@/services/finance/solidarity";
import { SolidarityBundle } from "@/types/modules/finance";
import { INSURANCE_CONFIG, INSURANCE_LABELS } from "@/utils/constants";
import { readCache, useNetworkStatus, writeCache } from "@/lib/offline";

function parseBundle(data: SolidarityBundle): SolidarityBundle {
  return {
    fund: data.fund,
    enrollments: data.enrollments.map((e) => ({
      ...e,
      joined_at: e.joined_at ? new Date(e.joined_at) : null,
    })),
    claims: data.claims.map((c) => ({
      ...c,
      submitted_at: c.submitted_at ? new Date(c.submitted_at) : null,
      decided_at: c.decided_at ? new Date(c.decided_at) : null,
    })),
  };
}

export function useSolidarity(organizationId: string) {
  const [bundle, setBundle] = useState<SolidarityBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const online = useNetworkStatus();

  const cacheKey = `${INSURANCE_CONFIG.CACHE_KEY_PREFIX}${organizationId}`;

  const fetchRemote = useCallback(async (): Promise<SolidarityBundle> => {
    const data = await solidarityService.getSolidarity(organizationId);
    return parseBundle(data);
  }, [organizationId]);

  const load = useCallback(async () => {
    const cached = readCache<SolidarityBundle>(cacheKey);
    if (cached) {
      setBundle(parseBundle(cached));
      setFromCache(true);
      setLoading(false);
    }

    if (online) {
      try {
        const fresh = await fetchRemote();
        setBundle(fresh);
        setFromCache(false);
        writeCache(cacheKey, fresh, INSURANCE_CONFIG.CACHE_TTL_MS);
      } catch (err) {
        console.error(INSURANCE_LABELS.LOAD_ERROR, err);
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

  return { bundle, loading, error, fromCache, online, refetch };
}
