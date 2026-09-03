"use client";

import { meetingsService } from "@/services/community/meetings";
import { Meeting } from "@/types/modules/community";
import { MEETING_CONFIG } from "@/utils/constants";
import { declareOffline, useOfflineQuery } from "@/lib/offline";

declareOffline({
  module: "meetings",
  cacheableReads: [MEETING_CONFIG.CACHE_KEY_PREFIX],
  deferredMutations: [],
});

function parseMeetings(data: Meeting[]): Meeting[] {
  return data.map((m) => ({
    ...m,
    date: m.date ? new Date(m.date) : null,
    created_at: m.created_at ? new Date(m.created_at) : null,
    attendees: m.attendees?.map((a) => ({
      ...a,
      checked_in_at: a.checked_in_at ? new Date(a.checked_in_at) : null,
    })),
  }));
}

export function useMeetings(
  organizationId: string,
  search = "",
  status = "",
) {
  const cacheKey = `${MEETING_CONFIG.CACHE_KEY_PREFIX}${organizationId}:${search || "_"}:${status || "_"}`;
  const { data, loading, error, fromCache, online, refetch } =
    useOfflineQuery<Meeting[]>(
      cacheKey,
      () =>
        meetingsService.getMeetings(organizationId, {
          search: search || undefined,
          status: status || undefined,
        }),
      { ttlMs: MEETING_CONFIG.CACHE_TTL_MS, parse: parseMeetings },
    );

  return { meetings: data ?? [], loading, error, fromCache, online, refetch };
}
