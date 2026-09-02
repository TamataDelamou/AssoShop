"use client";

import { useCallback, useEffect, useState } from "react";
import { ordersService } from "@/services/market/orders";
import { GroupOrder } from "@/types/modules/market";
import { MARKET_CONFIG, MARKET_MESSAGES } from "@/utils/constants";
import { readCache, useNetworkStatus, writeCache } from "@/lib/offline";

export function useGroupOrders() {
  const [groupOrders, setGroupOrders] = useState<GroupOrder[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const online = useNetworkStatus();

  const cacheKey = `${MARKET_CONFIG.CACHE_KEY_PREFIX}group-orders`;

  const fetchRemote = useCallback(async (): Promise<GroupOrder[]> => {
    return ordersService.getGroupOrders();
  }, []);

  const load = useCallback(async () => {
    const cached = readCache<GroupOrder[]>(cacheKey);
    if (cached) {
      setGroupOrders(cached);
      setFromCache(true);
      setLoading(false);
    }

    if (online) {
      try {
        const fresh = await fetchRemote();
        setGroupOrders(fresh);
        setFromCache(false);
        writeCache(cacheKey, fresh, MARKET_CONFIG.CACHE_TTL_MS);
      } catch (err) {
        console.error(MARKET_MESSAGES.ORDERS_LOAD_ERROR, err);
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

  return { groupOrders, loading, error, fromCache, online, refetch };
}
