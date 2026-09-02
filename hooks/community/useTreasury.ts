"use client";

import { useState, useEffect, useCallback } from "react";
import { treasuryService } from "@/services/community/treasury";
import {
  CreateTransactionPayload,
  TransactionType,
  TreasuryTransaction,
} from "@/types/modules/community";

function parseTransaction(t: TreasuryTransaction): TreasuryTransaction {
  return {
    ...t,
    date: t.date ? new Date(t.date) : null,
    created_at: t.created_at ? new Date(t.created_at) : null,
  };
}

export function useTreasury(organizationId: string) {
  const [transactions, setTransactions] = useState<TreasuryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    const data = await treasuryService.getTransactions(organizationId);
    return data.map(parseTransaction);
  }, [organizationId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await load();
        if (!cancelled) setTransactions(data);
      } catch (err) {
        if (!cancelled) setError(err as Error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [load]);

  const refetch = useCallback(async () => {
    try {
      setTransactions(await load());
    } catch (err) {
      setError(err as Error);
    }
  }, [load]);

  const createTransaction = useCallback(
    async (payload: CreateTransactionPayload) => {
      setCreating(true);
      setError(null);
      try {
        await treasuryService.createTransaction(organizationId, payload);
        await refetch();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setCreating(false);
      }
    },
    [organizationId, refetch],
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
