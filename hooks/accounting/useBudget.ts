"use client";

import { useCallback, useEffect, useState } from "react";
import { accountingService } from "@/services/accounting/accounting";
import { BudgetLine } from "@/types/modules/accounting";
import { ACCOUNTING_CONFIG, ACCOUNTING_LABELS } from "@/utils/constants";
import { readCache, useNetworkStatus, writeCache } from "@/lib/offline";

export function useBudget(organizationId: string) {
  const [budget, setBudget] = useState<BudgetLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const online = useNetworkStatus();

  const cacheKey = `${ACCOUNTING_CONFIG.CACHE_KEY_PREFIX}${organizationId}:budget`;

  const fetchRemote = useCallback(async (): Promise<BudgetLine[]> => {
    return await accountingService.getBudget(organizationId);
  }, [organizationId]);

  const load = useCallback(async () => {
    const cached = readCache<BudgetLine[]>(cacheKey);
    if (cached) {
      setBudget(cached);
      setLoading(false);
    }

    if (online) {
      try {
        const fresh = await fetchRemote();
        setBudget(fresh);
        writeCache(cacheKey, fresh, ACCOUNTING_CONFIG.CACHE_TTL_MS);
      } catch (err) {
        console.error(ACCOUNTING_LABELS.BUDGET_LOAD_ERROR, err);
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

  return { budget, loading, error, online, refetch };
}
