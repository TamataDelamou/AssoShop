"use client";

import { useState } from "react";
import { meetingsService } from "@/services/community/meetings";
import { AttendanceStatus, Meeting } from "@/types/modules/community";
import { MEETING_LABELS } from "@/utils/constants";

type ApiError = { response?: { data?: { message?: string } } };

export function useCheckInAttendee() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkIn = async (
    organizationId: string,
    meetingId: string,
    attendeeId: string,
    status: AttendanceStatus,
  ): Promise<Meeting> => {
    setLoading(true);
    setError(null);
    try {
      return await meetingsService.checkInAttendee(organizationId, meetingId, {
        attendee_id: attendeeId,
        status,
      });
    } catch (err: unknown) {
      const message =
        (err as ApiError).response?.data?.message ||
        MEETING_LABELS.CHECK_IN_ERROR;
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return { checkIn, loading, error };
}
