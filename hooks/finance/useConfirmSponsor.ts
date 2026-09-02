"use client";

import { useState } from "react";
import { loansService } from "@/services/finance/loans";
import { GroupLoan, LoanStatus } from "@/types/modules/finance";
import { LOAN_CONFIG, LOAN_LABELS } from "@/utils/constants";
import {
  enqueueSync,
  readCache,
  useNetworkStatus,
  writeCache,
} from "@/lib/offline";

type ApiError = { response?: { data?: { message?: string } } };

export function useConfirmSponsor() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingSync, setPendingSync] = useState(false);
  const online = useNetworkStatus();

  const confirmSponsor = async (
    organizationId: string,
    loanId: string,
  ): Promise<GroupLoan | null> => {
    setLoading(true);
    setError(null);
    setPendingSync(false);
    try {
      if (!online) {
        const cacheKey = `${LOAN_CONFIG.CACHE_KEY_PREFIX}${organizationId}`;
        enqueueSync({
          module: LOAN_CONFIG.SYNC_MODULE,
          action: "confirm_sponsor",
          payload: { organizationId, loanId },
        });

        const cached = readCache<GroupLoan[]>(cacheKey) ?? [];
        const updated = cached.map((l) =>
          l.id === loanId && l.status === LoanStatus.REQUESTED
            ? {
                ...l,
                status: LoanStatus.SPONSOR_CONFIRMED,
                sponsor_confirmed_at: new Date(),
              }
            : l,
        );
        writeCache(cacheKey, updated, LOAN_CONFIG.CACHE_TTL_MS);
        setPendingSync(true);
        return null;
      }

      return await loansService.confirmSponsor(organizationId, loanId);
    } catch (err: unknown) {
      const message =
        (err as ApiError).response?.data?.message || LOAN_LABELS.CONFIRM_ERROR;
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return { confirmSponsor, loading, error, pendingSync };
}
