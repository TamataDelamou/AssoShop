"use client";

import { ordersService } from "@/services/market/orders";
import { GroupOrder } from "@/types/modules/market";
import { MARKET_CONFIG } from "@/utils/constants";
import { declareOffline, useOfflineQuery } from "@/lib/offline";

declareOffline({
  module: "market",
  cacheableReads: [`${MARKET_CONFIG.CACHE_KEY_PREFIX}group-orders`],
  deferredMutations: [],
});

export function useGroupOrders() {
  const { data, loading, error, fromCache, online, refetch } =
    useOfflineQuery<GroupOrder[]>(
      `${MARKET_CONFIG.CACHE_KEY_PREFIX}group-orders`,
      () => ordersService.getGroupOrders(),
      { ttlMs: MARKET_CONFIG.CACHE_TTL_MS },
    );

  return { groupOrders: data, loading, error, fromCache, online, refetch };
}
