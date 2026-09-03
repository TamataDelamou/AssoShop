"use client";

import { catalogService } from "@/services/market/catalog";
import { MarketCatalog } from "@/types/modules/market";
import { MARKET_CONFIG } from "@/utils/constants";
import { declareOffline, useOfflineQuery } from "@/lib/offline";

declareOffline({
  module: "market",
  cacheableReads: [`${MARKET_CONFIG.CACHE_KEY_PREFIX}catalog`],
  deferredMutations: [],
});

function parseCatalog(data: MarketCatalog): MarketCatalog {
  return {
    categories: data.categories,
    products: data.products.map((p) => ({
      ...p,
      created_at: new Date(p.created_at),
      updated_at: new Date(p.updated_at),
    })),
    resellers: data.resellers.map((r) => ({
      ...r,
      validated_at: r.validated_at ? new Date(r.validated_at) : null,
    })),
  };
}

export function useCatalog() {
  const { data, loading, error, fromCache, online, refetch } =
    useOfflineQuery<MarketCatalog>(
      `${MARKET_CONFIG.CACHE_KEY_PREFIX}catalog`,
      () => catalogService.getCatalog(),
      { ttlMs: MARKET_CONFIG.CACHE_TTL_MS, parse: parseCatalog },
    );

  return { catalog: data, loading, error, fromCache, online, refetch };
}
