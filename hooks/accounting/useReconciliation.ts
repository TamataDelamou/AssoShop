"use client";

import { useCallback, useEffect, useState } from "react";
import { accountingService } from "@/services/accounting/accounting";
import { ReconciliationLine } from "@/types/modules/accounting";
import { ACCOUNTING_CONFIG, ACCOUNTING_LABELS } from "@/utils/constants";
import { readCache, useNetworkStatus, writeCache } from "@/lib/offline";

function parseLines(data: ReconciliationLine[]): ReconciliationLine[] {
  return data.map((l) => ({
    ...l,
    date: l.date ? new Date(l.date) : null,
  }));
}

export function useReconciliation(organizationId: string) {
  const [lines, setLines] = useState<ReconciliationLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const online = useNetworkStatus();

  const cacheKey = `${ACCOUNTING_CONFIG.CACHE_KEY_PREFIX}${organizationId}:reconciliation`;

  const fetchRemote = useCallback(async (): Promise<ReconciliationLine[]> => {
    const data = await accountingService.getReconciliation(organizationId);
    return parseLines(data);
  }, [organizationId]);

  const load = useCallback(async () => {
    const cached = readCache<ReconciliationLine[]>(cacheKey);
    if (cached) {
      setLines(parseLines(cached));
      setLoading(false);
    }

    if (online) {
      try {
        const fresh = await fetchRemote();
        setLines(fresh);
        writeCache(cacheKey, fresh, ACCOUNTING_CONFIG.CACHE_TTL_MS);
      } catch (err) {
        console.error(ACCOUNTING_LABELS.RECONCILIATION_LOAD_ERROR, err);
        if (!cached) {
          setError(err as Error);
        }
      }
    }
  }, [cacheKey, online, fetchRemote]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await load();
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [load]);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    await load();
    setLoading(false);
  }, [load]);

  return { lines, loading, error, online, refetch };
}
