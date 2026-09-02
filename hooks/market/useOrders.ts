"use client";

import { useCallback, useEffect, useState } from "react";
import { ordersService } from "@/services/market/orders";
import { Order } from "@/types/modules/market";
import { MARKET_CONFIG, MARKET_MESSAGES } from "@/utils/constants";
import { readCache, useNetworkStatus, writeCache } from "@/lib/offline";

function parseOrders(data: Order[]): Order[] {
  return data.map((o) => ({
    ...o,
    created_at: new Date(o.created_at),
    updated_at: new Date(o.updated_at),
  }));
}

export function useOrders() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const online = useNetworkStatus();

  const cacheKey = `${MARKET_CONFIG.CACHE_KEY_PREFIX}orders`;

  const fetchRemote = useCallback(async (): Promise<Order[]> => {
    const data = await ordersService.getOrders();
    return parseOrders(data);
  }, []);

  const load = useCallback(async () => {
    const cached = readCache<Order[]>(cacheKey);
    if (cached) {
      setOrders(parseOrders(cached));
      setFromCache(true);
      setLoading(false);
    }

    if (online) {
      try {
        const fresh = await fetchRemote();
        setOrders(fresh);
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

  return { orders, loading, error, fromCache, online, refetch };
}
