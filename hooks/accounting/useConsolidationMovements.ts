"use client";

import { useCallback, useEffect, useState } from "react";
import { accountingService } from "@/services/accounting/accounting";
import { ConsolidationMovement } from "@/types/modules/accounting";
import { ACCOUNTING_CONFIG, ACCOUNTING_LABELS } from "@/utils/constants";
import { readCache, useNetworkStatus, writeCache } from "@/lib/offline";

function parseMovements(
  data: ConsolidationMovement[],
): ConsolidationMovement[] {
  return data.map((m) => ({
    ...m,
    date: m.date ? new Date(m.date) : null,
  }));
}

export function useConsolidationMovements(organizationId: string) {
  const [movements, setMovements] = useState<ConsolidationMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const online = useNetworkStatus();

  const cacheKey = `${ACCOUNTING_CONFIG.CACHE_KEY_PREFIX}${organizationId}:consolidation`;

  const fetchRemote = useCallback(async (): Promise<
    ConsolidationMovement[]
  > => {
    const data = await accountingService.getConsolidation(organizationId);
    return parseMovements(data);
  }, [organizationId]);

  const load = useCallback(async () => {
    const cached = readCache<ConsolidationMovement[]>(cacheKey);
    if (cached) {
      setMovements(parseMovements(cached));
      setLoading(false);
    }

    if (online) {
      try {
        const fresh = await fetchRemote();
        setMovements(fresh);
        writeCache(cacheKey, fresh, ACCOUNTING_CONFIG.CACHE_TTL_MS);
      } catch (err) {
        console.error(ACCOUNTING_LABELS.CONSOLIDATE_ERROR, err);
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

  return { movements, loading, error, online, refetch };
}
