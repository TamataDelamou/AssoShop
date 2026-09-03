"use client";

import { adminService } from "@/services/admin/admin";
import { AdminBundle } from "@/types/modules/admin";
import { ADMIN_CONFIG } from "@/utils/constants";
import { declareOffline, useOfflineQuery } from "@/lib/offline";

declareOffline({
  module: "admin",
  cacheableReads: [`${ADMIN_CONFIG.CACHE_KEY_PREFIX}bundle`],
  deferredMutations: [],
});

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
  const { data, loading, error, fromCache, online, refetch } =
    useOfflineQuery<AdminBundle>(
      `${ADMIN_CONFIG.CACHE_KEY_PREFIX}bundle`,
      () => adminService.getBundle(),
      { ttlMs: ADMIN_CONFIG.CACHE_TTL_MS, parse: parseBundle },
    );

  return { bundle: data, loading, error, fromCache, online, refetch };
}
