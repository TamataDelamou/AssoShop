"use client";

import { resellerService } from "@/services/market/reseller";
import { ResellerBundle } from "@/types/modules/market";
import { MARKET_CONFIG } from "@/utils/constants";
import { declareOffline, useOfflineQuery } from "@/lib/offline";

declareOffline({
  module: "market",
  cacheableReads: [`${MARKET_CONFIG.CACHE_KEY_PREFIX}reseller`],
  deferredMutations: [],
});

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
  const { data, loading, error, fromCache, online, refetch } =
    useOfflineQuery<ResellerBundle>(
      `${MARKET_CONFIG.CACHE_KEY_PREFIX}reseller`,
      () => resellerService.getBundle(),
      { ttlMs: MARKET_CONFIG.CACHE_TTL_MS, parse: parseBundle },
    );

  return { bundle: data, loading, error, fromCache, online, refetch };
}
