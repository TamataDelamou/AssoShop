"use client";

import { useState } from "react";
import { socialCasesService } from "@/services/community/socialCases";
import { SocialCase } from "@/types/modules/community";
import { SOCIAL_CASE_LABELS } from "@/utils/constants";

type ApiError = { response?: { data?: { message?: string } } };

export function useValidateSocialCase() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateSocialCase = async (
    organizationId: string,
    socialCaseId: string,
    decision: "approve" | "reject",
    committeeNote: string,
  ): Promise<SocialCase> => {
    setLoading(true);
    setError(null);
    try {
      return await socialCasesService.validateSocialCase(
        organizationId,
        socialCaseId,
        { decision, committee_note: committeeNote },
      );
    } catch (err: unknown) {
      const message =
        (err as ApiError).response?.data?.message ||
        (decision === "approve"
          ? SOCIAL_CASE_LABELS.VALIDATE_ERROR
          : SOCIAL_CASE_LABELS.REJECT_ERROR);
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return { validateSocialCase, loading, error };
}
