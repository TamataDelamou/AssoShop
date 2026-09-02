"use client";

import { useCallback, useEffect, useState } from "react";
import { payService } from "@/services/pay/pay";
import { PayBundle } from "@/types/modules/pay";
import { PAY_CONFIG, PAY_MESSAGES } from "@/utils/constants";
import { readCache, useNetworkStatus, writeCache } from "@/lib/offline";

function parseBundle(data: PayBundle): PayBundle {
  return {
    wallets: data.wallets.map((w) => ({
      ...w,
      updated_at: new Date(w.updated_at),
    })),
    transactions: data.transactions.map((t) => ({
      ...t,
      created_at: new Date(t.created_at),
    })),
    methods: data.methods,
    reconciliation: data.reconciliation.map((r) => ({
      ...r,
      created_at: new Date(r.created_at),
    })),
    situation: data.situation,
    settings: data.settings,
  };
}

export function usePaySpace() {
  const [bundle, setBundle] = useState<PayBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const online = useNetworkStatus();

  const cacheKey = `${PAY_CONFIG.CACHE_KEY_PREFIX}bundle`;

  const fetchRemote = useCallback(async (): Promise<PayBundle> => {
    const data = await payService.getBundle();
    return parseBundle(data);
  }, []);

  const load = useCallback(async () => {
    const cached = readCache<PayBundle>(cacheKey);
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
        writeCache(cacheKey, fresh, PAY_CONFIG.CACHE_TTL_MS);
      } catch (err) {
        console.error(PAY_MESSAGES.LOAD_ERROR, err);
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
