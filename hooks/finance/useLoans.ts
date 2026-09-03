"use client";

import { loansService } from "@/services/finance/loans";
import { GroupLoan } from "@/types/modules/finance";
import { LOAN_CONFIG } from "@/utils/constants";
import { declareOffline, useOfflineQuery } from "@/lib/offline";

declareOffline({
  module: "loans",
  cacheableReads: [LOAN_CONFIG.CACHE_KEY_PREFIX],
  deferredMutations: [],
});

function parseLoans(data: GroupLoan[]): GroupLoan[] {
  return data.map((l) => ({
    ...l,
    requested_at: l.requested_at ? new Date(l.requested_at) : null,
    sponsor_confirmed_at: l.sponsor_confirmed_at
      ? new Date(l.sponsor_confirmed_at)
      : null,
    decision_at: l.decision_at ? new Date(l.decision_at) : null,
    installments: l.installments?.map((i) => ({
      ...i,
      due_date: i.due_date ? new Date(i.due_date) : null,
      paid_at: i.paid_at ? new Date(i.paid_at) : null,
    })),
  }));
}

export function useLoans(organizationId: string, search = "", status = "") {
  const cacheKey = `${LOAN_CONFIG.CACHE_KEY_PREFIX}${organizationId}:${search || "_"}:${status || "_"}`;
  const { data, loading, error, fromCache, online, refetch } =
    useOfflineQuery<GroupLoan[]>(
      cacheKey,
      () =>
        loansService.getLoans(organizationId, {
          search: search || undefined,
          status: status || undefined,
        }),
      { ttlMs: LOAN_CONFIG.CACHE_TTL_MS, parse: parseLoans },
    );

  return { loans: data ?? [], loading, error, fromCache, online, refetch };
}
