"use client";

import { useCallback, useState } from "react";
import { eventsService } from "@/services/community/events";
import {
  CommunityEvent,
  CreateEventPayload,
} from "@/types/modules/community";
import { EVENT_CONFIG } from "@/utils/constants";
import { declareOffline, useOfflineQuery } from "@/lib/offline";

declareOffline({
  module: "events",
  cacheableReads: [EVENT_CONFIG.CACHE_KEY_PREFIX],
  deferredMutations: [],
});

function parseEvents(data: CommunityEvent[]): CommunityEvent[] {
  return data.map((e) => ({
    ...e,
    start_at: e.start_at ? new Date(e.start_at) : null,
    end_at: e.end_at ? new Date(e.end_at) : null,
    created_at: e.created_at ? new Date(e.created_at) : null,
  }));
}

export function useEvents(organizationId: string) {
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<Error | null>(null);
  const { data, loading, error: loadError, refetch, refresh } =
    useOfflineQuery<CommunityEvent[]>(
      `${EVENT_CONFIG.CACHE_KEY_PREFIX}${organizationId}`,
      () => eventsService.getEvents(organizationId),
      { ttlMs: EVENT_CONFIG.CACHE_TTL_MS, parse: parseEvents },
    );

  const error = actionError ?? loadError;

  const createEvent = useCallback(
    async (payload: CreateEventPayload) => {
      setCreating(true);
      setActionError(null);
      try {
        const created = await eventsService.createEvent(
          organizationId,
          payload,
        );
        await refresh();
        return created;
      } catch (err) {
        setActionError(err as Error);
        throw err;
      } finally {
        setCreating(false);
      }
    },
    [organizationId, refresh],
  );

  return { events: data ?? [], loading, error, creating, createEvent, refetch };
}
