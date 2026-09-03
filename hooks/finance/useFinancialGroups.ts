"use client";

import { financialGroupsService } from "@/services/finance/financialGroups";
import { FinancialGroup } from "@/types/modules/finance";
import { FINANCE_CONFIG } from "@/utils/constants";
import { declareOffline, useOfflineQuery } from "@/lib/offline";

declareOffline({
  module: "finance",
  cacheableReads: [FINANCE_CONFIG.CACHE_KEY_PREFIX],
  deferredMutations: [],
});

function parseGroups(data: FinancialGroup[]): FinancialGroup[] {
  return data.map((g) => ({
    ...g,
    start_date: g.start_date ? new Date(g.start_date) : null,
    created_at: g.created_at ? new Date(g.created_at) : null,
    members: g.members?.map((m) => ({
      ...m,
      joined_at: m.joined_at ? new Date(m.joined_at) : null,
      last_payment_at: m.last_payment_at
        ? new Date(m.last_payment_at)
        : null,
    })),
    payments: g.payments?.map((p) => ({
      ...p,
      paid_at: p.paid_at ? new Date(p.paid_at) : null,
    })),
    turns: g.turns?.map((t) => ({
      ...t,
      expected_date: t.expected_date ? new Date(t.expected_date) : null,
      received_at: t.received_at ? new Date(t.received_at) : null,
    })),
  }));
}

export function useFinancialGroups(
  organizationId: string,
  search = "",
  type = "",
) {
  const cacheKey = `${FINANCE_CONFIG.CACHE_KEY_PREFIX}${organizationId}:${search || "_"}:${type || "_"}`;
  const { data, loading, error, fromCache, online, refetch } =
    useOfflineQuery<FinancialGroup[]>(
      cacheKey,
      () =>
        financialGroupsService.getFinancialGroups(organizationId, {
          search: search || undefined,
          type: type || undefined,
        }),
      { ttlMs: FINANCE_CONFIG.CACHE_TTL_MS, parse: parseGroups },
    );

  return { groups: data ?? [], loading, error, fromCache, online, refetch };
}
