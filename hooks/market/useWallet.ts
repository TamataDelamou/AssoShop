"use client";

import { ordersService } from "@/services/market/orders";
import { Wallet } from "@/types/modules/market";
import { MARKET_CONFIG } from "@/utils/constants";
import { declareOffline, useOfflineQuery } from "@/lib/offline";

declareOffline({
  module: "market",
  cacheableReads: [`${MARKET_CONFIG.CACHE_KEY_PREFIX}wallet`],
  deferredMutations: [],
});

export function useWallet() {
  const { data, loading, error, fromCache, online, refetch } =
    useOfflineQuery<Wallet>(
      `${MARKET_CONFIG.CACHE_KEY_PREFIX}wallet`,
      () => ordersService.getWallet(),
      { ttlMs: MARKET_CONFIG.CACHE_TTL_MS },
    );

  return { wallet: data, loading, error, fromCache, online, refetch };
}
