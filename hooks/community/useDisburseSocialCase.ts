"use client";

import { useState } from "react";
import { socialCasesService } from "@/services/community/socialCases";
import { SocialCase } from "@/types/modules/community";
import { SOCIAL_CASE_LABELS } from "@/utils/constants";

type ApiError = { response?: { data?: { message?: string } } };

export function useDisburseSocialCase() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disburse = async (
    organizationId: string,
    socialCaseId: string,
  ): Promise<SocialCase> => {
    setLoading(true);
    setError(null);
    try {
      return await socialCasesService.disburseSocialCase(
        organizationId,
        socialCaseId,
      );
    } catch (err: unknown) {
      const message =
        (err as ApiError).response?.data?.message ||
        SOCIAL_CASE_LABELS.DISBURSE_ERROR;
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return { disburse, loading, error };
}
