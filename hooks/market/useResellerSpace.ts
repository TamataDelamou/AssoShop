"use client";

import { useCallback, useEffect, useState } from "react";
import { resellerService } from "@/services/market/reseller";
import { ResellerBundle } from "@/types/modules/market";
import { MARKET_CONFIG, MARKET_MESSAGES } from "@/utils/constants";
import { readCache, useNetworkStatus, writeCache } from "@/lib/offline";

function parseBundle(data: ResellerBundle): ResellerBundle {
  return {
    application: data.application
      ? {
          ...data.application,
          submitted_at: new Date(data.application.submitted_at),
          reviewed_at: data.application.reviewed_at
            ? new Date(data.application.reviewed_at)
            : null,
        }
      : null,
    products: data.products.map((p) => ({
      ...p,
      created_at: new Date(p.created_at),
      updated_at: new Date(p.updated_at),
    })),
    orders: data.orders.map((o) => ({
      ...o,
      created_at: new Date(o.created_at),
      updated_at: new Date(o.updated_at),
    })),
    pickups: data.pickups.map((p) => ({
      ...p,
      scanned_at: new Date(p.scanned_at),
      delivered_at: p.delivered_at ? new Date(p.delivered_at) : null,
    })),
    reviews: data.reviews.map((r) => ({
      ...r,
      created_at: new Date(r.created_at),
    })),
    stats: data.stats,
    settings: data.settings,
  };
}

export function useResellerSpace() {
  const [bundle, setBundle] = useState<ResellerBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const online = useNetworkStatus();

  const cacheKey = `${MARKET_CONFIG.CACHE_KEY_PREFIX}reseller`;

  const fetchRemote = useCallback(async (): Promise<ResellerBundle> => {
    const data = await resellerService.getBundle();
    return parseBundle(data);
  }, []);

  const load = useCallback(async () => {
    const cached = readCache<ResellerBundle>(cacheKey);
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
        writeCache(cacheKey, fresh, MARKET_CONFIG.CACHE_TTL_MS);
      } catch (err) {
        console.error(MARKET_MESSAGES.LOAD_ERROR, err);
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
