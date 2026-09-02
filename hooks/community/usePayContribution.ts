"use client";

import { useState } from "react";
import { contributionsService } from "@/services/community/contributions";
import {
  Contribution,
  PayContributionPayload,
} from "@/types/modules/community";
import { CONTRIBUTION_LABELS } from "@/utils/constants";

type ApiError = { response?: { data?: { message?: string } } };

export function usePayContribution() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const payContribution = async (
    organizationId: string,
    payload: PayContributionPayload,
  ): Promise<Contribution> => {
    setLoading(true);
    setError(null);
    try {
      return await contributionsService.payContribution(organizationId, payload);
    } catch (err: unknown) {
      const message =
        (err as ApiError).response?.data?.message || CONTRIBUTION_LABELS.PAY_ERROR;
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return { payContribution, loading, error };
}
