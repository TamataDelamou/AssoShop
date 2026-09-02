"use client";

import { useCallback, useEffect, useState } from "react";
import { accountingService } from "@/services/accounting/accounting";
import { AccountingBundle } from "@/types/modules/accounting";
import { ACCOUNTING_CONFIG, ACCOUNTING_LABELS } from "@/utils/constants";
import { readCache, useNetworkStatus, writeCache } from "@/lib/offline";

function parseBundle(data: AccountingBundle): AccountingBundle {
  return {
    accounts: data.accounts,
    entries: data.entries.map((e) => ({
      ...e,
      created_at: e.created_at ? new Date(e.created_at) : null,
      validated_at: e.validated_at ? new Date(e.validated_at) : null,
    })),
  };
}

export function useAccounting(organizationId: string) {
  const [bundle, setBundle] = useState<AccountingBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const online = useNetworkStatus();

  const cacheKey = `${ACCOUNTING_CONFIG.CACHE_KEY_PREFIX}${organizationId}`;

  const fetchRemote = useCallback(async (): Promise<AccountingBundle> => {
    const data = await accountingService.getAccounting(organizationId);
    return parseBundle(data);
  }, [organizationId]);

  const load = useCallback(async () => {
    const cached = readCache<AccountingBundle>(cacheKey);
    if (cached) {
      setBundle(parseBundle(cached));
      setFromCache(true);
      setLoading(false);
    }

    if (online) {
      try {
        const fresh = await fetchRemote();
        setBundle(fresh);
        setFromCache(false);
        writeCache(cacheKey, fresh, ACCOUNTING_CONFIG.CACHE_TTL_MS);
      } catch (err) {
        console.error(ACCOUNTING_LABELS.LOAD_ERROR, err);
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

  return { bundle, loading, error, fromCache, online, refetch };
}
