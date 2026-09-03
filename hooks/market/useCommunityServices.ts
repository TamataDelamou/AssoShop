"use client";

import { communityServicesService } from "@/services/market/services";
import { CommunityService } from "@/types/modules/market";
import { MARKET_CONFIG } from "@/utils/constants";
import { declareOffline, useOfflineQuery } from "@/lib/offline";

declareOffline({
  module: "market",
  cacheableReads: [`${MARKET_CONFIG.CACHE_KEY_PREFIX}services`],
  deferredMutations: [],
});

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
  const { data, loading, error, fromCache, online, refetch } =
    useOfflineQuery<CommunityService[]>(
      `${MARKET_CONFIG.CACHE_KEY_PREFIX}services`,
      () => communityServicesService.getServices(),
      { ttlMs: MARKET_CONFIG.CACHE_TTL_MS, parse: parseServices },
    );

  return { services: data, loading, error, fromCache, online, refetch };
}
