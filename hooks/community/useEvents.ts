"use client";

import { useState, useEffect, useCallback } from "react";
import { eventsService } from "@/services/community/events";
import { CommunityEvent, CreateEventPayload } from "@/types/modules/community";

export function useEvents(organizationId: string) {
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async (): Promise<CommunityEvent[]> => {
    const data = await eventsService.getEvents(organizationId);
    return data.map((e) => ({
      ...e,
      start_at: e.start_at ? new Date(e.start_at) : null,
      end_at: e.end_at ? new Date(e.end_at) : null,
      created_at: e.created_at ? new Date(e.created_at) : null,
    }));
  }, [organizationId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const parsed = await load();
        if (!cancelled) setEvents(parsed);
      } catch (err) {
        if (!cancelled) setError(err as Error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [load]);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEvents(await load());
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [load]);

  const createEvent = useCallback(
    async (payload: CreateEventPayload) => {
      setCreating(true);
      setError(null);
      try {
        const created = await eventsService.createEvent(organizationId, payload);
        await refetch();
        return created;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setCreating(false);
      }
    },
    [organizationId, refetch],
  );

  return { events, loading, error, creating, createEvent, refetch };
}
