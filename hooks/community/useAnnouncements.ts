"use client";

import { useCallback, useEffect, useState } from "react";
import { announcementsService } from "@/services/community/announcements";
import { Announcement } from "@/types/modules/community";
import { ANNOUNCEMENT_CONFIG, ANNOUNCEMENT_LABELS } from "@/utils/constants";
import { readCache, useNetworkStatus, writeCache } from "@/lib/offline";

function parseAnnouncements(data: Announcement[]): Announcement[] {
  return data.map((a) => ({
    ...a,
    created_at: a.created_at ? new Date(a.created_at) : null,
  }));
}

export function useAnnouncements(organizationId: string, search = "") {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const online = useNetworkStatus();

  const cacheKey = `${ANNOUNCEMENT_CONFIG.CACHE_KEY_PREFIX}${organizationId}`;

  const fetchRemote = useCallback(async (): Promise<Announcement[]> => {
    const data = await announcementsService.getAnnouncements(organizationId, {
      search: search || undefined,
    });
    return parseAnnouncements(data);
  }, [organizationId, search]);

  const load = useCallback(async () => {
    const cached = readCache<Announcement[]>(cacheKey);
    if (cached) {
      setAnnouncements(parseAnnouncements(cached));
      setFromCache(true);
      setLoading(false);
    }

    if (online) {
      try {
        const fresh = await fetchRemote();
        setAnnouncements(fresh);
        setFromCache(false);
        writeCache(cacheKey, fresh, ANNOUNCEMENT_CONFIG.CACHE_TTL_MS);
      } catch (err) {
        console.error(ANNOUNCEMENT_LABELS.LOAD_ERROR, err);
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

  return { announcements, loading, error, fromCache, online, refetch };
}
