"use client";

import { useState } from "react";
import { solidarityService } from "@/services/finance/solidarity";
import {
  ClaimStatus,
  DeclareClaimPayload,
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

const EMPTY_FUND = {
  balance: 0,
  levy_rate: 0,
  cap_amount: 0,
  total_collected: 0,
  total_used: 0,
};

export function useDeclareClaim() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingSync, setPendingSync] = useState(false);
  const online = useNetworkStatus();

  const declareClaim = async (
    organizationId: string,
    payload: DeclareClaimPayload,
  ): Promise<InsuranceClaim | null> => {
    setLoading(true);
    setError(null);
    setPendingSync(false);
    try {
      if (!online) {
        const cacheKey = `${INSURANCE_CONFIG.CACHE_KEY_PREFIX}${organizationId}`;
        enqueueSync({
          module: INSURANCE_CONFIG.SYNC_MODULE,
          action: "declare_claim",
          payload: { organizationId, ...payload },
        });

        const cached = readCache<SolidarityBundle>(cacheKey);
        const optimistic: InsuranceClaim = {
          id: `local-${Date.now()}`,
          member_id: payload.member_id,
          member_name: payload.member_name,
          description: payload.description,
          amount: payload.amount,
          indemnity: 0,
          status: ClaimStatus.SUBMITTED,
          submitted_at: new Date(),
          decided_at: null,
        };
        const updated: SolidarityBundle = {
          fund: cached?.fund ?? EMPTY_FUND,
          enrollments: cached?.enrollments ?? [],
          claims: [optimistic, ...(cached?.claims ?? [])],
        };
        writeCache(cacheKey, updated, INSURANCE_CONFIG.CACHE_TTL_MS);
        setPendingSync(true);
        return null;
      }

      return await solidarityService.declareClaim(organizationId, payload);
    } catch (err: unknown) {
      const message =
        (err as ApiError).response?.data?.message ||
        INSURANCE_LABELS.CLAIM_ERROR;
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return { declareClaim, loading, error, pendingSync };
}
