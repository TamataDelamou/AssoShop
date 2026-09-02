"use client";

import { useState } from "react";
import { solidarityService } from "@/services/finance/solidarity";
import {
  EnrollInsurancePayload,
  InsuranceEnrollment,
  InsuranceEnrollmentStatus,
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

export function useEnrollInsurance() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingSync, setPendingSync] = useState(false);
  const online = useNetworkStatus();

  const enrollInsurance = async (
    organizationId: string,
    payload: EnrollInsurancePayload,
  ): Promise<InsuranceEnrollment | null> => {
    setLoading(true);
    setError(null);
    setPendingSync(false);
    try {
      if (!online) {
        const cacheKey = `${INSURANCE_CONFIG.CACHE_KEY_PREFIX}${organizationId}`;
        enqueueSync({
          module: INSURANCE_CONFIG.SYNC_MODULE,
          action: "enroll_insurance",
          payload: { organizationId, ...payload },
        });

        const cached = readCache<SolidarityBundle>(cacheKey);
        const optimistic: InsuranceEnrollment = {
          id: `local-${Date.now()}`,
          member_id: payload.member_id,
          member_name: payload.member_name,
          status: InsuranceEnrollmentStatus.ACTIVE,
          joined_at: new Date(),
        };
        const updated: SolidarityBundle = {
          fund: cached?.fund ?? EMPTY_FUND,
          enrollments: [
            optimistic,
            ...(cached?.enrollments ?? []),
          ],
          claims: cached?.claims ?? [],
        };
        writeCache(cacheKey, updated, INSURANCE_CONFIG.CACHE_TTL_MS);
        setPendingSync(true);
        return null;
      }

      return await solidarityService.enrollInsurance(organizationId, payload);
    } catch (err: unknown) {
      const message =
        (err as ApiError).response?.data?.message ||
        INSURANCE_LABELS.ENROLL_ERROR;
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return { enrollInsurance, loading, error, pendingSync };
}
