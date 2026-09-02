"use client";

import { useCallback, useEffect, useState } from "react";
import { sponsorshipService } from "@/services/finance/sponsorship";
import {
  CreateSponsorshipRequestPayload,
  SponsorshipBundle,
} from "@/types/modules/finance";

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
  const [bundle, setBundle] = useState<SponsorshipBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    const data = await sponsorshipService.getSponsorship(organizationId);
    setBundle(parseBundle(data));
  }, [organizationId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await load();
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

  const create = useCallback(
    async (payload: CreateSponsorshipRequestPayload) => {
      setBusy(true);
      setError(null);
      try {
        await sponsorshipService.createRequest(organizationId, payload);
        await load();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [organizationId, load],
  );

  const respond = useCallback(
    async (requestId: string, decision: "accept" | "decline") => {
      setBusy(true);
      setError(null);
      try {
        await sponsorshipService.respond(organizationId, requestId, {
          decision,
        });
        await load();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [organizationId, load],
  );

  const confirm = useCallback(
    async (requestId: string) => {
      setBusy(true);
      setError(null);
      try {
        await sponsorshipService.confirm(organizationId, requestId);
        await load();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [organizationId, load],
  );

  return { bundle, loading, busy, error, create, respond, confirm };
}
