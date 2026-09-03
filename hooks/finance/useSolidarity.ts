"use client";

import { solidarityService } from "@/services/finance/solidarity";
import { SolidarityBundle } from "@/types/modules/finance";
import { INSURANCE_CONFIG } from "@/utils/constants";
import { declareOffline, useOfflineQuery } from "@/lib/offline";

declareOffline({
  module: "solidarity",
  cacheableReads: [INSURANCE_CONFIG.CACHE_KEY_PREFIX],
  deferredMutations: [],
});

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
  const { data, loading, error, fromCache, online, refetch } =
    useOfflineQuery<SolidarityBundle>(
      `${INSURANCE_CONFIG.CACHE_KEY_PREFIX}${organizationId}`,
      () => solidarityService.getSolidarity(organizationId),
      { ttlMs: INSURANCE_CONFIG.CACHE_TTL_MS, parse: parseBundle },
    );

  return { bundle: data, loading, error, fromCache, online, refetch };
}
