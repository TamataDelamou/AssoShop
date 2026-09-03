"use client";

import { ordersService } from "@/services/market/orders";
import { Order } from "@/types/modules/market";
import { MARKET_CONFIG } from "@/utils/constants";
import { declareOffline, useOfflineQuery } from "@/lib/offline";

declareOffline({
  module: "market",
  cacheableReads: [`${MARKET_CONFIG.CACHE_KEY_PREFIX}orders`],
  deferredMutations: [],
});

function parseOrders(data: Order[]): Order[] {
  return data.map((o) => ({
    ...o,
    created_at: new Date(o.created_at),
    updated_at: new Date(o.updated_at),
  }));
}

export function useOrders() {
  const { data, loading, error, fromCache, online, refetch } =
    useOfflineQuery<Order[]>(
      `${MARKET_CONFIG.CACHE_KEY_PREFIX}orders`,
      () => ordersService.getOrders(),
      { ttlMs: MARKET_CONFIG.CACHE_TTL_MS, parse: parseOrders },
    );

  return { orders: data, loading, error, fromCache, online, refetch };
}
