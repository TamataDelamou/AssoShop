"use client";

import { financialGroupsService } from "@/services/finance/financialGroups";
import { GroupTransaction } from "@/types/modules/finance";
import { FINANCE_CONFIG } from "@/utils/constants";
import { useOfflineQuery } from "@/lib/offline";

function parse(t: GroupTransaction): GroupTransaction {
  return { ...t, date: t.date ? new Date(t.date) : null };
}

export function useGroupTransactions(
  organizationId: string,
  groupId: string | null,
) {
  const { data, loading, error } = useOfflineQuery<GroupTransaction[]>(
    `${FINANCE_CONFIG.CACHE_KEY_PREFIX}${organizationId}:${groupId ?? "null"}:transactions`,
    () =>
      financialGroupsService.getGroupTransactions(
        organizationId,
        groupId as string,
      ),
    {
      ttlMs: FINANCE_CONFIG.CACHE_TTL_MS,
      parse: (list) => list.map(parse),
      enabled: groupId !== null,
    },
  );

  return { transactions: data ?? [], loading, error };
}
