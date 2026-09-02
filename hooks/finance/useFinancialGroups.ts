"use client";

import { useCallback, useEffect, useState } from "react";
import { financialGroupsService } from "@/services/finance/financialGroups";
import { FinancialGroup } from "@/types/modules/finance";
import { FINANCE_CONFIG, FINANCE_LABELS } from "@/utils/constants";
import { readCache, useNetworkStatus, writeCache } from "@/lib/offline";

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
  const [groups, setGroups] = useState<FinancialGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const online = useNetworkStatus();

  const cacheKey = `${FINANCE_CONFIG.CACHE_KEY_PREFIX}${organizationId}`;

  const fetchRemote = useCallback(async (): Promise<FinancialGroup[]> => {
    const data = await financialGroupsService.getFinancialGroups(
      organizationId,
      {
        search: search || undefined,
        type: type || undefined,
      },
    );
    return parseGroups(data);
  }, [organizationId, search, type]);

  const load = useCallback(async () => {
    const cached = readCache<FinancialGroup[]>(cacheKey);
    if (cached) {
      setGroups(parseGroups(cached));
      setFromCache(true);
      setLoading(false);
    }

    if (online) {
      try {
        const fresh = await fetchRemote();
        setGroups(fresh);
        setFromCache(false);
        writeCache(cacheKey, fresh, FINANCE_CONFIG.CACHE_TTL_MS);
      } catch (err) {
        console.error(FINANCE_LABELS.LOAD_ERROR, err);
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

  return { groups, loading, error, fromCache, online, refetch };
}
