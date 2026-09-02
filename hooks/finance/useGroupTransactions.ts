"use client";

import { useEffect, useState } from "react";
import { financialGroupsService } from "@/services/finance/financialGroups";
import { GroupTransaction } from "@/types/modules/finance";

function parse(t: GroupTransaction): GroupTransaction {
  return { ...t, date: t.date ? new Date(t.date) : null };
}

export function useGroupTransactions(
  organizationId: string,
  groupId: string | null,
) {
  const [transactions, setTransactions] = useState<GroupTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!groupId) return;
    let cancelled = false;

    (async () => {
      try {
        const data = await financialGroupsService.getGroupTransactions(
          organizationId,
          groupId,
        );
        if (!cancelled) setTransactions(data.map(parse));
      } catch (err) {
        if (!cancelled) setError(err as Error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [organizationId, groupId]);

  return { transactions, loading, error };
}
