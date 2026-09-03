"use client";

import { useCallback, useMemo, useState } from "react";
import { affiliationsService } from "@/services/community/affiliations";
import { organizationsService } from "@/services/community/organizations";
import {
  Affiliation,
  LinkAffiliationPayload,
  Organization,
  UpdateAffiliationPayload,
} from "@/types/modules/community";
import { AFFILIATION_CONFIG } from "@/utils/constants";
import { declareOffline, useOfflineQuery } from "@/lib/offline";

declareOffline({
  module: "affiliations",
  cacheableReads: [AFFILIATION_CONFIG.CACHE_KEY_PREFIX],
  deferredMutations: [],
});

function parseAffiliation(a: Affiliation): Affiliation {
  return { ...a, linked_at: a.linked_at ? new Date(a.linked_at) : null };
}

interface AffiliationsBundle {
  affiliations: Affiliation[];
  organizations: Organization[];
}

export function useAffiliations(organizationId: string) {
  const [linking, setLinking] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<Error | null>(null);
  const { data, loading, error: loadError, refresh } =
    useOfflineQuery<AffiliationsBundle>(
      `${AFFILIATION_CONFIG.CACHE_KEY_PREFIX}${organizationId}`,
      async () => {
        const [affiliations, organizations] = await Promise.all([
          affiliationsService.getAffiliations(organizationId),
          organizationsService.getOrganizations(),
        ]);
        return { affiliations, organizations };
      },
      {
        ttlMs: AFFILIATION_CONFIG.CACHE_TTL_MS,
        parse: (bundle) => {
          const nameById = new Map(
            bundle.organizations.map((o) => [o.id, o.name] as const),
          );
          return {
            affiliations: bundle.affiliations.map((a) => ({
              ...parseAffiliation(a),
              affiliate_name: nameById.get(a.affiliate_id) ?? a.affiliate_name,
            })),
            organizations: bundle.organizations,
          };
        },
      },
    );

  const error = actionError ?? loadError;
  const affiliations = data?.affiliations ?? [];

  const linkAffiliation = useCallback(
    async (payload: LinkAffiliationPayload) => {
      setLinking(true);
      setActionError(null);
      try {
        await affiliationsService.linkAffiliation(organizationId, payload);
        await refresh();
      } catch (err) {
        setActionError(err as Error);
        throw err;
      } finally {
        setLinking(false);
      }
    },
    [organizationId, refresh],
  );

  const updateAffiliation = useCallback(
    async (affiliationId: string, payload: UpdateAffiliationPayload) => {
      setBusyId(affiliationId);
      setActionError(null);
      try {
        await affiliationsService.updateAffiliation(
          organizationId,
          affiliationId,
          payload,
        );
        await refresh();
      } catch (err) {
        setActionError(err as Error);
        throw err;
      } finally {
        setBusyId(null);
      }
    },
    [organizationId, refresh],
  );

  const unlinkAffiliation = useCallback(
    async (affiliationId: string) => {
      setBusyId(affiliationId);
      setActionError(null);
      try {
        await affiliationsService.unlinkAffiliation(
          organizationId,
          affiliationId,
        );
        await refresh();
      } catch (err) {
        setActionError(err as Error);
        throw err;
      } finally {
        setBusyId(null);
      }
    },
    [organizationId, refresh],
  );

  const availableOrganizations = useMemo(() => {
    const affs = data?.affiliations ?? [];
    const orgs = data?.organizations ?? [];
    const linkedIds = new Set(affs.map((a) => a.affiliate_id));
    return orgs.filter(
      (o) => o.id !== organizationId && !linkedIds.has(o.id),
    );
  }, [data?.affiliations, data?.organizations, organizationId]);

  return {
    affiliations,
    availableOrganizations,
    loading,
    linking,
    busyId,
    error,
    linkAffiliation,
    updateAffiliation,
    unlinkAffiliation,
  };
}
