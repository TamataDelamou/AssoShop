"use client";

import { useState } from "react";
import { meetingsService } from "@/services/community/meetings";
import {
  Meeting,
  MeetingStatus,
  PlanMeetingPayload,
} from "@/types/modules/community";
import { MEETING_CONFIG, MEETING_LABELS } from "@/utils/constants";
import {
  enqueueSync,
  readCache,
  useNetworkStatus,
  writeCache,
} from "@/lib/offline";

type ApiError = { response?: { data?: { message?: string } } };

export function usePlanMeeting() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingSync, setPendingSync] = useState(false);
  const online = useNetworkStatus();

  const planMeeting = async (
    organizationId: string,
    payload: PlanMeetingPayload,
  ): Promise<Meeting | null> => {
    setLoading(true);
    setError(null);
    setPendingSync(false);
    try {
      if (!online) {
        const cacheKey = `${MEETING_CONFIG.CACHE_KEY_PREFIX}${organizationId}`;
        enqueueSync({
          module: MEETING_CONFIG.SYNC_MODULE,
          action: "plan",
          payload: { organizationId, ...payload },
        });

        // Ajout optimiste dans le cache local : la réunion apparaît aussitôt,
        // même sans connexion, et sera reprise à la synchronisation.
        const cached = readCache<Meeting[]>(cacheKey) ?? [];
        const optimistic: Meeting = {
          id: `local-${Date.now()}`,
          organization_id: organizationId,
          title: payload.title,
          date: new Date(payload.date),
          location: payload.location,
          agenda: payload.agenda,
          status: MeetingStatus.PLANNED,
          minutes: null,
          reminder_enabled: payload.reminder_enabled,
          created_at: new Date(),
          attendees: [],
        };
        writeCache(
          cacheKey,
          [optimistic, ...cached],
          MEETING_CONFIG.CACHE_TTL_MS,
        );
        setPendingSync(true);
        return null;
      }

      return await meetingsService.planMeeting(organizationId, payload);
    } catch (err: unknown) {
      const message =
        (err as ApiError).response?.data?.message || MEETING_LABELS.PLAN_ERROR;
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return { planMeeting, loading, error, pendingSync };
}
