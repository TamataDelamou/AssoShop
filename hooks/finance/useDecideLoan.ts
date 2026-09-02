"use client";

import { useState } from "react";
import { loansService } from "@/services/finance/loans";
import {
  GroupLoan,
  InstallmentStatus,
  LoanInstallment,
  LoanStatus,
} from "@/types/modules/finance";
import { LOAN_CONFIG, LOAN_LABELS } from "@/utils/constants";
import {
  enqueueSync,
  readCache,
  useNetworkStatus,
  writeCache,
} from "@/lib/offline";

type ApiError = { response?: { data?: { message?: string } } };

function generateInstallments(
  amount: number,
  interestRate: number,
): LoanInstallment[] {
  const count = 3;
  const total = Math.round(amount * (1 + interestRate / 100));
  const per = Math.floor(total / count);
  const remainder = total - per * count;
  return Array.from({ length: count }, (_, i) => ({
    id: `local-inst-${Date.now()}-${i}`,
    position: i + 1,
    due_date: new Date(Date.now() + (i + 1) * 30 * 24 * 60 * 60 * 1000),
    amount: per + (i === count - 1 ? remainder : 0),
    status: InstallmentStatus.PENDING,
    paid_at: null,
  }));
}

export function useDecideLoan() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingSync, setPendingSync] = useState(false);
  const online = useNetworkStatus();

  const decideLoan = async (
    organizationId: string,
    loanId: string,
    approved: boolean,
  ): Promise<GroupLoan | null> => {
    setLoading(true);
    setError(null);
    setPendingSync(false);
    try {
      if (!online) {
        const cacheKey = `${LOAN_CONFIG.CACHE_KEY_PREFIX}${organizationId}`;
        enqueueSync({
          module: LOAN_CONFIG.SYNC_MODULE,
          action: "decide_loan",
          payload: { organizationId, loanId, approved },
        });

        const cached = readCache<GroupLoan[]>(cacheKey) ?? [];
        const updated = cached.map((l) => {
          if (l.id !== loanId || l.status !== LoanStatus.SPONSOR_CONFIRMED) {
            return l;
          }
          const decision_at = new Date();
          if (approved) {
            const total = Math.round(l.amount * (1 + l.interest_rate / 100));
            return {
              ...l,
              status: LoanStatus.APPROVED,
              decision_at,
              total_due: total,
              installments: generateInstallments(
                l.amount,
                l.interest_rate,
              ),
            };
          }
          return { ...l, status: LoanStatus.REJECTED, decision_at };
        });
        writeCache(cacheKey, updated, LOAN_CONFIG.CACHE_TTL_MS);
        setPendingSync(true);
        return null;
      }

      return await loansService.decideLoan(organizationId, loanId, approved);
    } catch (err: unknown) {
      const message =
        (err as ApiError).response?.data?.message || LOAN_LABELS.DECIDE_ERROR;
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return { decideLoan, loading, error, pendingSync };
}
