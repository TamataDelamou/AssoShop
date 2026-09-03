"use client";

import { accountingService } from "@/services/accounting/accounting";
import { AccountingBundle } from "@/types/modules/accounting";
import { ACCOUNTING_CONFIG } from "@/utils/constants";
import { declareOffline, useOfflineQuery } from "@/lib/offline";

declareOffline({
  module: "accounting",
  cacheableReads: [ACCOUNTING_CONFIG.CACHE_KEY_PREFIX],
  deferredMutations: [],
});

function parseBundle(data: AccountingBundle): AccountingBundle {
  return {
    accounts: data.accounts,
    entries: data.entries.map((e) => ({
      ...e,
      created_at: e.created_at ? new Date(e.created_at) : null,
      validated_at: e.validated_at ? new Date(e.validated_at) : null,
    })),
  };
}

export function useAccounting(organizationId: string) {
  const { data, loading, error, fromCache, online, refetch } =
    useOfflineQuery<AccountingBundle>(
      `${ACCOUNTING_CONFIG.CACHE_KEY_PREFIX}${organizationId}`,
      () => accountingService.getAccounting(organizationId),
      { ttlMs: ACCOUNTING_CONFIG.CACHE_TTL_MS, parse: parseBundle },
    );

  return { bundle: data, loading, error, fromCache, online, refetch };
}
