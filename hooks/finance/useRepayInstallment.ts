"use client";

import { useState } from "react";
import { loansService } from "@/services/finance/loans";
import {
  GroupLoan,
  InstallmentStatus,
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

export function useRepayInstallment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingSync, setPendingSync] = useState(false);
  const online = useNetworkStatus();

  const repayInstallment = async (
    organizationId: string,
    loanId: string,
    installmentId: string,
  ): Promise<GroupLoan | null> => {
    setLoading(true);
    setError(null);
    setPendingSync(false);
    try {
      if (!online) {
        const cacheKey = `${LOAN_CONFIG.CACHE_KEY_PREFIX}${organizationId}`;
        enqueueSync({
          module: LOAN_CONFIG.SYNC_MODULE,
          action: "repay_installment",
          payload: { organizationId, loanId, installmentId },
        });

        const cached = readCache<GroupLoan[]>(cacheKey) ?? [];
        const updated = cached.map((l) => {
          if (l.id !== loanId) return l;
          const target = l.installments?.find(
            (i) => i.id === installmentId,
          );
          const paidAmount =
            target && target.status === InstallmentStatus.PENDING
              ? target.amount
              : 0;
          const repaid = l.repaid_amount + paidAmount;
          return {
            ...l,
            repaid_amount: repaid,
            status:
              l.total_due > 0 && repaid >= l.total_due
                ? LoanStatus.REPAID
                : l.status,
            installments: l.installments?.map((i) =>
              i.id === installmentId
                ? {
                    ...i,
                    status: InstallmentStatus.PAID,
                    paid_at: new Date(),
                  }
                : i,
            ),
          };
        });
        writeCache(cacheKey, updated, LOAN_CONFIG.CACHE_TTL_MS);
        setPendingSync(true);
        return null;
      }

      return await loansService.repayInstallment(
        organizationId,
        loanId,
        installmentId,
      );
    } catch (err: unknown) {
      const message =
        (err as ApiError).response?.data?.message || LOAN_LABELS.REPAY_ERROR;
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return { repayInstallment, loading, error, pendingSync };
}
