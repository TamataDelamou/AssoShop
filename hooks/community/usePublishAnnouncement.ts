"use client";

import { useState } from "react";
import { announcementsService } from "@/services/community/announcements";
import {
  Announcement,
  PublishAnnouncementPayload,
} from "@/types/modules/community";
import { ANNOUNCEMENT_CONFIG, ANNOUNCEMENT_LABELS } from "@/utils/constants";
import {
  enqueueSync,
  readCache,
  useNetworkStatus,
  writeCache,
} from "@/lib/offline";

type ApiError = { response?: { data?: { message?: string } } };

export function usePublishAnnouncement() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingSync, setPendingSync] = useState(false);
  const online = useNetworkStatus();

  const publish = async (
    organizationId: string,
    payload: PublishAnnouncementPayload,
  ): Promise<Announcement | null> => {
    setLoading(true);
    setError(null);
    setPendingSync(false);
    try {
      if (!online) {
        const cacheKey = `${ANNOUNCEMENT_CONFIG.CACHE_KEY_PREFIX}${organizationId}`;
        enqueueSync({
          module: ANNOUNCEMENT_CONFIG.SYNC_MODULE,
          action: "publish",
          payload: { organizationId, ...payload },
        });

        const cached = readCache<Announcement[]>(cacheKey) ?? [];
        const optimistic: Announcement = {
          id: `local-${Date.now()}`,
          organization_id: organizationId,
          author_name: ANNOUNCEMENT_CONFIG.DEFAULT_AUTHOR,
          title: payload.title,
          content: payload.content,
          audience: payload.audience,
          pinned: payload.pinned,
          relayed_from: null,
          created_at: new Date(),
        };
        writeCache(
          cacheKey,
          [optimistic, ...cached],
          ANNOUNCEMENT_CONFIG.CACHE_TTL_MS,
        );
        setPendingSync(true);
        return null;
      }

      return await announcementsService.publishAnnouncement(
        organizationId,
        payload,
      );
    } catch (err: unknown) {
      const message =
        (err as ApiError).response?.data?.message ||
        ANNOUNCEMENT_LABELS.PUBLISH_ERROR;
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return { publish, loading, error, pendingSync };
}
