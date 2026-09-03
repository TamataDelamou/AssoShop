"use client";

import { accountingService } from "@/services/accounting/accounting";
import { ConsolidationMovement } from "@/types/modules/accounting";
import { ACCOUNTING_CONFIG } from "@/utils/constants";
import { declareOffline, useOfflineQuery } from "@/lib/offline";

declareOffline({
  module: "accounting",
  cacheableReads: [ACCOUNTING_CONFIG.CACHE_KEY_PREFIX],
  deferredMutations: [],
});

function parseMovements(
  data: ConsolidationMovement[],
): ConsolidationMovement[] {
  return data.map((m) => ({
    ...m,
    date: m.date ? new Date(m.date) : null,
  }));
}

export function useConsolidationMovements(organizationId: string) {
  const { data, loading, error, online, refetch } = useOfflineQuery<
    ConsolidationMovement[]
  >(
    `${ACCOUNTING_CONFIG.CACHE_KEY_PREFIX}${organizationId}:consolidation`,
    () => accountingService.getConsolidation(organizationId),
    { ttlMs: ACCOUNTING_CONFIG.CACHE_TTL_MS, parse: parseMovements },
  );

  return { movements: data ?? [], loading, error, online, refetch };
}
