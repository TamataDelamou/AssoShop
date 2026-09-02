"use client";

import { useCallback, useEffect, useState } from "react";
import { adminService } from "@/services/admin/admin";
import { AdminBundle } from "@/types/modules/admin";
import { ADMIN_CONFIG } from "@/utils/constants";
import { readCache, useNetworkStatus, writeCache } from "@/lib/offline";

function parseBundle(data: AdminBundle): AdminBundle {
  return {
    dashboard: data.dashboard,
    reports: data.reports,
    national: data.national,
    audit_logs: data.audit_logs.map((l) => ({
      ...l,
      created_at: new Date(l.created_at),
    })),
    security_audit: data.security_audit.map((s) => ({
      ...s,
      created_at: new Date(s.created_at),
    })),
    users: data.users.map((u) => ({
      ...u,
      created_at: new Date(u.created_at),
    })),
    kyc: data.kyc.map((k) => ({
      ...k,
      submitted_at: new Date(k.submitted_at),
    })),
    roles: data.roles,
    disputes: data.disputes.map((d) => ({
      ...d,
      opened_at: new Date(d.opened_at),
    })),
    associations: data.associations,
    groups: data.groups,
    hierarchy: data.hierarchy,
    solidarity: data.solidarity,
    insurance: data.insurance.map((i) => ({
      ...i,
      active_since: new Date(i.active_since),
    })),
    resellers: data.resellers.map((r) => ({
      ...r,
      submitted_at: new Date(r.submitted_at),
    })),
    categories: data.categories,
    moderation: data.moderation.map((m) => ({
      ...m,
      reported_at: new Date(m.reported_at),
    })),
    investments: data.investments,
    commissions: data.commissions,
    plans: data.plans,
    invoices: data.invoices.map((i) => ({
      ...i,
      due_at: new Date(i.due_at),
    })),
    config: data.config,
    countries: data.countries,
    operators: data.operators,
    integrations: data.integrations,
  };
}

export function useAdmin() {
  const [bundle, setBundle] = useState<AdminBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const online = useNetworkStatus();

  const cacheKey = `${ADMIN_CONFIG.CACHE_KEY_PREFIX}bundle`;

  const fetchRemote = useCallback(async (): Promise<AdminBundle> => {
    const data = await adminService.getBundle();
    return parseBundle(data);
  }, []);

  const load = useCallback(async () => {
    const cached = readCache<AdminBundle>(cacheKey);
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
        writeCache(cacheKey, fresh, ADMIN_CONFIG.CACHE_TTL_MS);
      } catch (err) {
        console.error("Impossible de charger le back-office.", err);
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
