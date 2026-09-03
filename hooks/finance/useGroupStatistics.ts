"use client";

import { financialGroupsService } from "@/services/finance/financialGroups";
import { GroupStatistics } from "@/types/modules/finance";
import { FINANCE_CONFIG } from "@/utils/constants";
import { useOfflineQuery } from "@/lib/offline";

function parse(s: GroupStatistics): GroupStatistics {
  return {
    ...s,
    last_payment_at: s.last_payment_at ? new Date(s.last_payment_at) : null,
  };
}

export function useGroupStatistics(
  organizationId: string,
  groupId: string | null,
) {
  const { data, loading, error } = useOfflineQuery<GroupStatistics>(
    `${FINANCE_CONFIG.CACHE_KEY_PREFIX}${organizationId}:${groupId ?? "null"}:stats`,
    () =>
      financialGroupsService.getGroupStatistics(
        organizationId,
        groupId as string,
      ),
    {
      ttlMs: FINANCE_CONFIG.CACHE_TTL_MS,
      parse,
      enabled: groupId !== null,
    },
  );

  return { statistics: data, loading, error };
}
