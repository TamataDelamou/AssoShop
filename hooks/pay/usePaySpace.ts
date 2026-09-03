"use client";

import { payService } from "@/services/pay/pay";
import { PayBundle } from "@/types/modules/pay";
import { PAY_CONFIG } from "@/utils/constants";
import { declareOffline, useOfflineQuery } from "@/lib/offline";

declareOffline({
  module: "pay",
  cacheableReads: [`${PAY_CONFIG.CACHE_KEY_PREFIX}bundle`],
  deferredMutations: [],
});

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
  const { data, loading, error, fromCache, online, refetch } =
    useOfflineQuery<PayBundle>(
      `${PAY_CONFIG.CACHE_KEY_PREFIX}bundle`,
      () => payService.getBundle(),
      { ttlMs: PAY_CONFIG.CACHE_TTL_MS, parse: parseBundle },
    );

  return { bundle: data, loading, error, fromCache, online, refetch };
}
