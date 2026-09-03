"use client";

import { announcementsService } from "@/services/community/announcements";
import { Announcement } from "@/types/modules/community";
import { ANNOUNCEMENT_CONFIG } from "@/utils/constants";
import { declareOffline, useOfflineQuery } from "@/lib/offline";

declareOffline({
  module: "announcements",
  cacheableReads: [ANNOUNCEMENT_CONFIG.CACHE_KEY_PREFIX],
  deferredMutations: [],
});

function parseAnnouncements(data: Announcement[]): Announcement[] {
  return data.map((a) => ({
    ...a,
    created_at: a.created_at ? new Date(a.created_at) : null,
  }));
}

export function useAnnouncements(organizationId: string, search = "") {
  const cacheKey = `${ANNOUNCEMENT_CONFIG.CACHE_KEY_PREFIX}${organizationId}:${search || "_"}`;
  const { data, loading, error, fromCache, online, refetch } =
    useOfflineQuery<Announcement[]>(
      cacheKey,
      () =>
        announcementsService.getAnnouncements(organizationId, {
          search: search || undefined,
        }),
      { ttlMs: ANNOUNCEMENT_CONFIG.CACHE_TTL_MS, parse: parseAnnouncements },
    );

  return {
    announcements: data ?? [],
    loading,
    error,
    fromCache,
    online,
    refetch,
  };
}
