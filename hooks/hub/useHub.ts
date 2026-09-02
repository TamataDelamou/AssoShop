"use client";

import { useCallback, useEffect, useState } from "react";
import { hubService } from "@/services/hub/hub";
import { HubBundle } from "@/types/modules/hub";
import { HUB_CONFIG, HUB_MESSAGES } from "@/utils/constants";
import { readCache, useNetworkStatus, writeCache } from "@/lib/offline";

function parseBundle(data: HubBundle): HubBundle {
  return {
    profile: {
      ...data.profile,
      joined_at: new Date(data.profile.joined_at),
    },
    home: data.home,
    memberships: data.memberships,
    favorites: data.favorites.map((f) => ({
      ...f,
      created_at: new Date(f.created_at),
    })),
    vault: data.vault.map((v) => ({
      ...v,
      uploaded_at: new Date(v.uploaded_at),
    })),
    kyc: data.kyc.map((k) => ({
      ...k,
      submitted_at: new Date(k.submitted_at),
      reviewed_at: k.reviewed_at ? new Date(k.reviewed_at) : null,
    })),
    notifications: data.notifications.map((n) => ({
      ...n,
      created_at: new Date(n.created_at),
    })),
    preferences: data.preferences,
    conversations: data.conversations.map((c) => ({
      ...c,
      updated_at: new Date(c.updated_at),
    })),
    referrals: data.referrals.map((r) => ({
      ...r,
      joined_at: new Date(r.joined_at),
    })),
    sync_queue: data.sync_queue.map((s) => ({
      ...s,
      created_at: new Date(s.created_at),
    })),
  };
}

export function useHub() {
  const [bundle, setBundle] = useState<HubBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const online = useNetworkStatus();

  const cacheKey = `${HUB_CONFIG.CACHE_KEY_PREFIX}bundle`;

  const fetchRemote = useCallback(async (): Promise<HubBundle> => {
    const data = await hubService.getBundle();
    return parseBundle(data);
  }, []);

  const load = useCallback(async () => {
    const cached = readCache<HubBundle>(cacheKey);
    if (cached) {
      setBundle(parseBundle(cached));
      setFromCache(true);
      setLoading(false);
    }

    if (online) {
      try {
        const fresh = await fetchRemote();
        setBundle(fresh);
        setFromCache(false);
        writeCache(cacheKey, fresh, HUB_CONFIG.CACHE_TTL_MS);
      } catch (err) {
        console.error(HUB_MESSAGES.LOAD_ERROR, err);
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

  return { bundle, loading, error, fromCache, online, refetch };
}
