"use client";

import { useState } from "react";
import { meetingsService } from "@/services/community/meetings";
import { Meeting } from "@/types/modules/community";
import { MEETING_LABELS } from "@/utils/constants";

type ApiError = { response?: { data?: { message?: string } } };

export function useSaveMinutes() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveMinutes = async (
    organizationId: string,
    meetingId: string,
    minutes: string,
  ): Promise<Meeting> => {
    setLoading(true);
    setError(null);
    try {
      return await meetingsService.saveMinutes(organizationId, meetingId, {
        minutes,
      });
    } catch (err: unknown) {
      const message =
        (err as ApiError).response?.data?.message ||
        MEETING_LABELS.MINUTES_ERROR;
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return { saveMinutes, loading, error };
}
