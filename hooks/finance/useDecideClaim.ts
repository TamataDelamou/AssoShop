"use client";

import { useState } from "react";
import { solidarityService } from "@/services/finance/solidarity";
import {
  ClaimStatus,
  InsuranceClaim,
  SolidarityBundle,
} from "@/types/modules/finance";
import { INSURANCE_CONFIG, INSURANCE_LABELS } from "@/utils/constants";
import {
  enqueueSync,
  readCache,
  useNetworkStatus,
  writeCache,
} from "@/lib/offline";

type ApiError = { response?: { data?: { message?: string } } };

export function useDecideClaim() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingSync, setPendingSync] = useState(false);
  const online = useNetworkStatus();

  const decideClaim = async (
    organizationId: string,
    claimId: string,
    approved: boolean,
  ): Promise<InsuranceClaim | null> => {
    setLoading(true);
    setError(null);
    setPendingSync(false);
    try {
      if (!online) {
        const cacheKey = `${INSURANCE_CONFIG.CACHE_KEY_PREFIX}${organizationId}`;
        enqueueSync({
          module: INSURANCE_CONFIG.SYNC_MODULE,
          action: "decide_claim",
          payload: { organizationId, claimId, approved },
        });

        const cached = readCache<SolidarityBundle>(cacheKey);
        const target = cached?.claims.find((c) => c.id === claimId);
        const canDecide =
          target &&
          (target.status === ClaimStatus.SUBMITTED ||
            target.status === ClaimStatus.UNDER_REVIEW);
        const deductible =
          approved && canDecide ? (target?.amount ?? 0) : 0;

        const updated: SolidarityBundle = {
          fund: cached?.fund
            ? {
                ...cached.fund,
                balance: cached.fund.balance - deductible,
                total_used: cached.fund.total_used + deductible,
              }
            : {
                balance: 0,
                levy_rate: 0,
                cap_amount: 0,
                total_collected: 0,
                total_used: 0,
              },
          enrollments: cached?.enrollments ?? [],
          claims: (cached?.claims ?? []).map((c) =>
            c.id !== claimId || !canDecide
              ? c
              : {
                  ...c,
                  status: approved
                    ? ClaimStatus.APPROVED
                    : ClaimStatus.REJECTED,
                  indemnity: approved ? c.amount : 0,
                  decided_at: new Date(),
                },
          ),
        };
        writeCache(cacheKey, updated, INSURANCE_CONFIG.CACHE_TTL_MS);
        setPendingSync(true);
        return null;
      }

      return await solidarityService.decideClaim(
        organizationId,
        claimId,
        approved,
      );
    } catch (err: unknown) {
      const message =
        (err as ApiError).response?.data?.message ||
        INSURANCE_LABELS.DECIDE_ERROR;
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return { decideClaim, loading, error, pendingSync };
}
