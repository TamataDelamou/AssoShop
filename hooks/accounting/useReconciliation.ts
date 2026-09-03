"use client";

import { accountingService } from "@/services/accounting/accounting";
import { ReconciliationLine } from "@/types/modules/accounting";
import { ACCOUNTING_CONFIG } from "@/utils/constants";
import { declareOffline, useOfflineQuery } from "@/lib/offline";

declareOffline({
  module: "accounting",
  cacheableReads: [ACCOUNTING_CONFIG.CACHE_KEY_PREFIX],
  deferredMutations: [],
});

function parseLines(data: ReconciliationLine[]): ReconciliationLine[] {
  return data.map((l) => ({
    ...l,
    date: l.date ? new Date(l.date) : null,
  }));
}

export function useReconciliation(organizationId: string) {
  const { data, loading, error, online, refetch } = useOfflineQuery<
    ReconciliationLine[]
  >(
    `${ACCOUNTING_CONFIG.CACHE_KEY_PREFIX}${organizationId}:reconciliation`,
    () => accountingService.getReconciliation(organizationId),
    { ttlMs: ACCOUNTING_CONFIG.CACHE_TTL_MS, parse: parseLines },
  );

  return { lines: data ?? [], loading, error, online, refetch };
}
