"use client";

import { useCallback, useEffect, useState } from "react";
import { meetingsService } from "@/services/community/meetings";
import { Meeting } from "@/types/modules/community";
import { MEETING_CONFIG, MEETING_LABELS } from "@/utils/constants";
import { readCache, useNetworkStatus, writeCache } from "@/lib/offline";

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
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const online = useNetworkStatus();

  const cacheKey = `${MEETING_CONFIG.CACHE_KEY_PREFIX}${organizationId}`;

  const fetchRemote = useCallback(async (): Promise<Meeting[]> => {
    const data = await meetingsService.getMeetings(organizationId, {
      search: search || undefined,
      status: status || undefined,
    });
    return parseMeetings(data);
  }, [organizationId, search, status]);

  const load = useCallback(async () => {
    const cached = readCache<Meeting[]>(cacheKey);
    if (cached) {
      setMeetings(parseMeetings(cached));
      setFromCache(true);
      setLoading(false);
    }

    if (online) {
      try {
        const fresh = await fetchRemote();
        setMeetings(fresh);
        setFromCache(false);
        writeCache(cacheKey, fresh, MEETING_CONFIG.CACHE_TTL_MS);
      } catch (err) {
        console.error(MEETING_LABELS.LOAD_ERROR, err);
        if (!cached) {
          setError(err as Error);
        }
      }
    }
  }, [cacheKey, online, fetchRemote]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await load();
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [load]);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    await load();
    setLoading(false);
  }, [load]);

  return { meetings, loading, error, fromCache, online, refetch };
}
