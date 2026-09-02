"use client";

import { useEffect, useState } from "react";
import { financialGroupsService } from "@/services/finance/financialGroups";
import { GroupStatistics } from "@/types/modules/finance";

function parse(s: GroupStatistics): GroupStatistics {
  return { ...s, last_payment_at: s.last_payment_at ? new Date(s.last_payment_at) : null };
}

export function useGroupStatistics(
  organizationId: string,
  groupId: string | null,
) {
  const [statistics, setStatistics] = useState<GroupStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!groupId) return;
    let cancelled = false;

    (async () => {
      try {
        const data = await financialGroupsService.getGroupStatistics(
          organizationId,
          groupId,
        );
        if (!cancelled) setStatistics(parse(data));
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

  return { statistics, loading, error };
}
