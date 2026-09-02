"use client";

import { useState } from "react";
import { financialGroupsService } from "@/services/finance/financialGroups";
import {
  FinancialGroup,
  GroupPaymentStatus,
} from "@/types/modules/finance";
import { FINANCE_CONFIG, FINANCE_LABELS } from "@/utils/constants";
import {
  enqueueSync,
  readCache,
  useNetworkStatus,
  writeCache,
} from "@/lib/offline";

type ApiError = { response?: { data?: { message?: string } } };

export function useValidatePayment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingSync, setPendingSync] = useState(false);
  const online = useNetworkStatus();

  const validatePayment = async (
    organizationId: string,
    groupId: string,
    paymentId: string,
  ): Promise<FinancialGroup | null> => {
    setLoading(true);
    setError(null);
    setPendingSync(false);
    try {
      if (!online) {
        const cacheKey = `${FINANCE_CONFIG.CACHE_KEY_PREFIX}${organizationId}`;
        enqueueSync({
          module: FINANCE_CONFIG.SYNC_MODULE,
          action: "validate_payment",
          payload: { organizationId, groupId, paymentId },
        });

        const cached = readCache<FinancialGroup[]>(cacheKey) ?? [];
        const updated = cached.map((g) => {
          if (g.id !== groupId) return g;
          const target = g.payments?.find((p) => p.id === paymentId);
          const pendingAmount =
            target && target.status === GroupPaymentStatus.PENDING
              ? target.amount
              : 0;
          return {
            ...g,
            raised_amount: g.raised_amount + pendingAmount,
            payments: g.payments?.map((p) =>
              p.id === paymentId
                ? {
                    ...p,
                    status: GroupPaymentStatus.CONFIRMED,
                    paid_at: new Date(),
                  }
                : p,
            ),
          };
        });
        writeCache(cacheKey, updated, FINANCE_CONFIG.CACHE_TTL_MS);
        setPendingSync(true);
        return null;
      }

      return await financialGroupsService.validatePayment(
        organizationId,
        groupId,
        paymentId,
      );
    } catch (err: unknown) {
      const message =
        (err as ApiError).response?.data?.message ||
        FINANCE_LABELS.VALIDATE_ERROR;
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return { validatePayment, loading, error, pendingSync };
}
