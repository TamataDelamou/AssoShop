"use client";

import { useCallback, useState } from "react";
import { sponsorshipService } from "@/services/finance/sponsorship";
import {
  CreateSponsorshipRequestPayload,
  SponsorshipBundle,
} from "@/types/modules/finance";
import { SPONSORSHIP_CONFIG } from "@/utils/constants";
import { declareOffline, useOfflineQuery } from "@/lib/offline";

declareOffline({
  module: "sponsorship",
  cacheableReads: [SPONSORSHIP_CONFIG.CACHE_KEY_PREFIX],
  deferredMutations: [],
});

function parseBundle(data: SponsorshipBundle): SponsorshipBundle {
  return {
    requests: data.requests.map((r) => ({
      ...r,
      created_at: r.created_at ? new Date(r.created_at) : null,
    })),
    open_groups: data.open_groups.map((g) => ({
      ...g,
      start_date: g.start_date ? new Date(g.start_date) : null,
      created_at: g.created_at ? new Date(g.created_at) : null,
      members: g.members?.map((m) => ({
        ...m,
        joined_at: m.joined_at ? new Date(m.joined_at) : null,
        last_payment_at: m.last_payment_at
          ? new Date(m.last_payment_at)
          : null,
      })),
      payments: g.payments?.map((p) => ({
        ...p,
        paid_at: p.paid_at ? new Date(p.paid_at) : null,
      })),
      turns: g.turns?.map((t) => ({
        ...t,
        expected_date: t.expected_date ? new Date(t.expected_date) : null,
        received_at: t.received_at ? new Date(t.received_at) : null,
      })),
    })),
  };
}

export function useSponsorship(organizationId: string) {
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<Error | null>(null);
  const { data, loading, error: loadError, refresh } =
    useOfflineQuery<SponsorshipBundle>(
      `${SPONSORSHIP_CONFIG.CACHE_KEY_PREFIX}${organizationId}`,
      () => sponsorshipService.getSponsorship(organizationId),
      { ttlMs: SPONSORSHIP_CONFIG.CACHE_TTL_MS, parse: parseBundle },
    );

  const error = actionError ?? loadError;

  const create = useCallback(
    async (payload: CreateSponsorshipRequestPayload) => {
      setBusy(true);
      setActionError(null);
      try {
        await sponsorshipService.createRequest(organizationId, payload);
        await refresh();
      } catch (err) {
        setActionError(err as Error);
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [organizationId, refresh],
  );

  const respond = useCallback(
    async (requestId: string, decision: "accept" | "decline") => {
      setBusy(true);
      setActionError(null);
      try {
        await sponsorshipService.respond(organizationId, requestId, {
          decision,
        });
        await refresh();
      } catch (err) {
        setActionError(err as Error);
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [organizationId, refresh],
  );

  const confirm = useCallback(
    async (requestId: string) => {
      setBusy(true);
      setActionError(null);
      try {
        await sponsorshipService.confirm(organizationId, requestId);
        await refresh();
      } catch (err) {
        setActionError(err as Error);
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [organizationId, refresh],
  );

  return { bundle: data, loading, busy, error, create, respond, confirm };
}
