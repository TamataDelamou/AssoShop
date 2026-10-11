"use client";

import { useCallback, useMemo, useState } from "react";
import { auditService } from "@/services/community/audit";
import { membersService } from "@/services/community/members";
import { parseAuditEvent, periodToSince } from "@/lib/audit";
import { declareOffline, useOfflineQuery } from "@/lib/offline";
import {
  AuditEvent,
  AuditEventType,
  AuditEventsPage,
  AuditPeriod,
} from "@/types/modules/audit";
import { Member } from "@/types/modules/community";
import { AUDIT_CONFIG } from "@/utils/constants";

// Lecture seule : consultable hors-ligne depuis le cache, aucune mutation différée.
declareOffline({
  module: AUDIT_CONFIG.SYNC_MODULE,
  cacheableReads: [AUDIT_CONFIG.CACHE_KEY_PREFIX],
  deferredMutations: [],
});

interface AuditBundle {
  page: AuditEventsPage;
  members: Member[];
}

// Joint le nom de l'auteur depuis l'annuaire des membres (actor_id = user_id).
function withActorNames(events: AuditEvent[], members: Member[]): AuditEvent[] {
  const names = new Map(
    members.map((member) => [member.user_id, member.user?.name]),
  );
  return events.map((event) => ({
    ...parseAuditEvent(event),
    actor_name: event.actor_id ? names.get(event.actor_id) : undefined,
  }));
}

export function useAuditEvents(organizationId: string) {
  const [eventType, setEventType] = useState<AuditEventType | null>(null);
  const [period, setPeriod] = useState<AuditPeriod>(AUDIT_CONFIG.DEFAULT_PERIOD);
  // Pages suivantes, rattachées au jeu de filtres qui les a chargées.
  const [extra, setExtra] = useState<{
    key: string;
    events: AuditEvent[];
    next_before: string | null;
    has_more: boolean;
  } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<Error | null>(null);

  const cacheKey = `${AUDIT_CONFIG.CACHE_KEY_PREFIX}${organizationId}:${eventType ?? AUDIT_CONFIG.ALL_EVENT_TYPES}:${period}`;

  const {
    data,
    loading,
    error: loadError,
    fromCache,
    online,
    refetch,
  } = useOfflineQuery<AuditBundle>(
    cacheKey,
    async () => {
      const [page, members] = await Promise.all([
        auditService.getAuditEvents(organizationId, {
          event_type: eventType,
          since: periodToSince(period),
          limit: AUDIT_CONFIG.PAGE_SIZE,
        }),
        membersService.getMembers(organizationId),
      ]);
      return { page, members };
    },
    {
      ttlMs: AUDIT_CONFIG.CACHE_TTL_MS,
      parse: (bundle) => ({
        page: {
          ...bundle.page,
          events: withActorNames(bundle.page.events, bundle.members),
        },
        members: bundle.members,
      }),
    },
  );

  const more = extra?.key === cacheKey ? extra : null;
  const members = data?.members;
  const firstPage = data?.page;

  const events = useMemo(
    () => [...(firstPage?.events ?? []), ...(more?.events ?? [])],
    [firstPage, more],
  );
  const hasMore = more ? more.has_more : (firstPage?.has_more ?? false);
  const nextBefore = more ? more.next_before : (firstPage?.next_before ?? null);

  const loadMore = useCallback(async () => {
    if (!nextBefore) return;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const page = await auditService.getAuditEvents(organizationId, {
        event_type: eventType,
        since: periodToSince(period),
        before: nextBefore,
        limit: AUDIT_CONFIG.PAGE_SIZE,
      });
      setExtra((current) => ({
        key: cacheKey,
        events: [
          ...(current?.key === cacheKey ? current.events : []),
          ...withActorNames(page.events, members ?? []),
        ],
        next_before: page.next_before,
        has_more: page.has_more,
      }));
    } catch (err) {
      setMoreError(err as Error);
    } finally {
      setLoadingMore(false);
    }
  }, [cacheKey, eventType, members, nextBefore, organizationId, period]);

  const refresh = useCallback(async () => {
    setExtra(null);
    setMoreError(null);
    await refetch();
  }, [refetch]);

  return {
    events,
    eventType,
    period,
    setEventType,
    setPeriod,
    hasMore,
    loading,
    loadingMore,
    error: moreError ?? loadError,
    fromCache,
    online,
    loadMore,
    refetch: refresh,
  };
}
