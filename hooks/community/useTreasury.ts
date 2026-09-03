"use client";

import { useCallback, useState } from "react";
import { treasuryService } from "@/services/community/treasury";
import {
  CreateTransactionPayload,
  TransactionType,
  TreasuryTransaction,
} from "@/types/modules/community";
import { TREASURY_CONFIG } from "@/utils/constants";
import { declareOffline, useOfflineQuery } from "@/lib/offline";

declareOffline({
  module: "treasury",
  cacheableReads: [TREASURY_CONFIG.CACHE_KEY_PREFIX],
  deferredMutations: [],
});

function parseTransaction(t: TreasuryTransaction): TreasuryTransaction {
  return {
    ...t,
    date: t.date ? new Date(t.date) : null,
    created_at: t.created_at ? new Date(t.created_at) : null,
  };
}

export function useTreasury(organizationId: string) {
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<Error | null>(null);
  const { data, loading, error: loadError, refresh } = useOfflineQuery<
    TreasuryTransaction[]
  >(
    `${TREASURY_CONFIG.CACHE_KEY_PREFIX}${organizationId}`,
    () => treasuryService.getTransactions(organizationId),
    {
      ttlMs: TREASURY_CONFIG.CACHE_TTL_MS,
      parse: (list) => list.map(parseTransaction),
    },
  );

  const error = actionError ?? loadError;
  const transactions = data ?? [];

  const createTransaction = useCallback(
    async (payload: CreateTransactionPayload) => {
      setCreating(true);
      setActionError(null);
      try {
        await treasuryService.createTransaction(organizationId, payload);
        await refresh();
      } catch (err) {
        setActionError(err as Error);
        throw err;
      } finally {
        setCreating(false);
      }
    },
    [organizationId, refresh],
  );

  const incomeTotal = transactions
    .filter((t) => t.type === TransactionType.INCOME)
    .reduce((sum, t) => sum + t.amount, 0);
  const expenseTotal = transactions
    .filter((t) => t.type === TransactionType.EXPENSE)
    .reduce((sum, t) => sum + t.amount, 0);
  const balance = incomeTotal - expenseTotal;

  return {
    transactions,
    loading,
    creating,
    error,
    balance,
    incomeTotal,
    expenseTotal,
    createTransaction,
  };
}
