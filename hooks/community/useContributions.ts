"use client";

import { contributionsService } from "@/services/community/contributions";
import { Contribution } from "@/types/modules/community";
import { CONTRIBUTION_CONFIG } from "@/utils/constants";
import { declareOffline, useOfflineQuery } from "@/lib/offline";

declareOffline({
  module: "contributions",
  cacheableReads: [CONTRIBUTION_CONFIG.CACHE_KEY_PREFIX],
  deferredMutations: [],
});

function parseContributions(data: Contribution[]): Contribution[] {
  return data.map((c) => ({
    ...c,
    due_date: c.due_date ? new Date(c.due_date) : null,
    paid_at: c.paid_at ? new Date(c.paid_at) : null,
  }));
}

export function useContributions(
  organizationId: string,
  search = "",
  status = "",
) {
  const cacheKey = `${CONTRIBUTION_CONFIG.CACHE_KEY_PREFIX}${organizationId}:${search || "_"}:${status || "_"}`;
  const { data, loading, error, refetch } = useOfflineQuery<Contribution[]>(
    cacheKey,
    () =>
      contributionsService.getContributions(organizationId, {
        search: search || undefined,
        status: status || undefined,
      }),
    { ttlMs: CONTRIBUTION_CONFIG.CACHE_TTL_MS, parse: parseContributions },
  );

  return { contributions: data ?? [], loading, error, refetch };
}
