"use client";

import { useState } from "react";
import { socialCasesService } from "@/services/community/socialCases";
import { CreateSocialCasePayload, SocialCase } from "@/types/modules/community";
import { SOCIAL_CASE_LABELS } from "@/utils/constants";

type ApiError = { response?: { data?: { message?: string } } };

export function useCreateSocialCase() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSocialCase = async (
    organizationId: string,
    payload: CreateSocialCasePayload,
  ): Promise<SocialCase> => {
    setLoading(true);
    setError(null);
    try {
      return await socialCasesService.createSocialCase(organizationId, payload);
    } catch (err: unknown) {
      const message =
        (err as ApiError).response?.data?.message ||
        SOCIAL_CASE_LABELS.DECLARE_ERROR;
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return { createSocialCase, loading, error };
}
