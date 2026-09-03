"use client";

import { accountingService } from "@/services/accounting/accounting";
import { BudgetLine } from "@/types/modules/accounting";
import { ACCOUNTING_CONFIG } from "@/utils/constants";
import { declareOffline, useOfflineQuery } from "@/lib/offline";

declareOffline({
  module: "accounting",
  cacheableReads: [ACCOUNTING_CONFIG.CACHE_KEY_PREFIX],
  deferredMutations: [],
});

export function useBudget(organizationId: string) {
  const { data, loading, error, online, refetch } = useOfflineQuery<
    BudgetLine[]
  >(
    `${ACCOUNTING_CONFIG.CACHE_KEY_PREFIX}${organizationId}:budget`,
    () => accountingService.getBudget(organizationId),
    { ttlMs: ACCOUNTING_CONFIG.CACHE_TTL_MS },
  );

  return { budget: data ?? [], loading, error, online, refetch };
}
