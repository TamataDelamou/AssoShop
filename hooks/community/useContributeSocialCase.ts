"use client";

import { useState } from "react";
import { socialCasesService } from "@/services/community/socialCases";
import {
  ContributeSocialCasePayload,
  SocialCase,
} from "@/types/modules/community";
import { SOCIAL_CASE_LABELS } from "@/utils/constants";

type ApiError = { response?: { data?: { message?: string } } };

export function useContributeSocialCase() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contribute = async (
    organizationId: string,
    socialCaseId: string,
    payload: ContributeSocialCasePayload,
  ): Promise<SocialCase> => {
    setLoading(true);
    setError(null);
    try {
      return await socialCasesService.contributeSocialCase(
        organizationId,
        socialCaseId,
        payload,
      );
    } catch (err: unknown) {
      const message =
        (err as ApiError).response?.data?.message ||
        SOCIAL_CASE_LABELS.CONTRIBUTE_ERROR;
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return { contribute, loading, error };
}
