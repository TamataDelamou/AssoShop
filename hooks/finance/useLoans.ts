"use client";

import { useCallback, useEffect, useState } from "react";
import { loansService } from "@/services/finance/loans";
import { GroupLoan } from "@/types/modules/finance";
import { LOAN_CONFIG, LOAN_LABELS } from "@/utils/constants";
import { readCache, useNetworkStatus, writeCache } from "@/lib/offline";

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
  const [loans, setLoans] = useState<GroupLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const online = useNetworkStatus();

  const cacheKey = `${LOAN_CONFIG.CACHE_KEY_PREFIX}${organizationId}`;

  const fetchRemote = useCallback(async (): Promise<GroupLoan[]> => {
    const data = await loansService.getLoans(organizationId, {
      search: search || undefined,
      status: status || undefined,
    });
    return parseLoans(data);
  }, [organizationId, search, status]);

  const load = useCallback(async () => {
    const cached = readCache<GroupLoan[]>(cacheKey);
    if (cached) {
      setLoans(parseLoans(cached));
      setFromCache(true);
      setLoading(false);
    }

    if (online) {
      try {
        const fresh = await fetchRemote();
        setLoans(fresh);
        setFromCache(false);
        writeCache(cacheKey, fresh, LOAN_CONFIG.CACHE_TTL_MS);
      } catch (err) {
        console.error(LOAN_LABELS.LOAD_ERROR, err);
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

  return { loans, loading, error, fromCache, online, refetch };
}
