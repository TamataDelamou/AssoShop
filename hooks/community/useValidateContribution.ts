"use client";

import { useState } from "react";
import { contributionsService } from "@/services/community/contributions";
import { Contribution } from "@/types/modules/community";
import { CONTRIBUTION_LABELS } from "@/utils/constants";

type ApiError = { response?: { data?: { message?: string } } };

export function useValidateContribution() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateContribution = async (
    organizationId: string,
    contributionId: string,
    decision: "approve" | "reject",
    validatorName: string,
  ): Promise<Contribution> => {
    setLoading(true);
    setError(null);
    try {
      return await contributionsService.validateContribution(
        organizationId,
        contributionId,
        { decision, validator_name: validatorName },
      );
    } catch (err: unknown) {
      const message =
        (err as ApiError).response?.data?.message ||
        (decision === "approve"
          ? CONTRIBUTION_LABELS.VALIDATE_ERROR
          : CONTRIBUTION_LABELS.REJECT_ERROR);
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return { validateContribution, loading, error };
}
