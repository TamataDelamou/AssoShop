"use client";

import { investmentsService } from "@/services/market/investments";
import { InvestmentProject } from "@/types/modules/market";
import { MARKET_CONFIG } from "@/utils/constants";
import { declareOffline, useOfflineQuery } from "@/lib/offline";

declareOffline({
  module: "market",
  cacheableReads: [`${MARKET_CONFIG.CACHE_KEY_PREFIX}investments`],
  deferredMutations: [],
});

function parseProjects(data: InvestmentProject[]): InvestmentProject[] {
  return data.map((p) => ({
    ...p,
    deadline: p.deadline ? new Date(p.deadline) : null,
    shares: p.shares ?? [],
    distributions: (p.distributions ?? []).map((d) => ({
      ...d,
      declared_at: new Date(d.declared_at),
    })),
    created_at: new Date(p.created_at),
  }));
}

export function useInvestments() {
  const { data, loading, error, fromCache, online, refetch } =
    useOfflineQuery<InvestmentProject[]>(
      `${MARKET_CONFIG.CACHE_KEY_PREFIX}investments`,
      () => investmentsService.getProjects(),
      { ttlMs: MARKET_CONFIG.CACHE_TTL_MS, parse: parseProjects },
    );

  return { projects: data, loading, error, fromCache, online, refetch };
}
