"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { affiliationsService } from "@/services/community/affiliations";
import { organizationsService } from "@/services/community/organizations";
import {
  Affiliation,
  LinkAffiliationPayload,
  Organization,
  UpdateAffiliationPayload,
} from "@/types/modules/community";

function parseAffiliation(a: Affiliation): Affiliation {
  return { ...a, linked_at: a.linked_at ? new Date(a.linked_at) : null };
}

export function useAffiliations(organizationId: string) {
  const [affiliations, setAffiliations] = useState<Affiliation[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    const [affiliationsData, organizationsData] = await Promise.all([
      affiliationsService.getAffiliations(organizationId),
      organizationsService.getOrganizations(),
    ]);

    const nameById = new Map(
      organizationsData.map((o) => [o.id, o.name] as const),
    );
    return {
      affiliations: affiliationsData.map((a) => ({
        ...parseAffiliation(a),
        affiliate_name: nameById.get(a.affiliate_id) ?? a.affiliate_name,
      })),
      organizations: organizationsData,
    };
  }, [organizationId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await load();
        if (!cancelled) {
          setAffiliations(data.affiliations);
          setOrganizations(data.organizations);
        }
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
    try {
      const data = await load();
      setAffiliations(data.affiliations);
      setOrganizations(data.organizations);
    } catch (err) {
      setError(err as Error);
    }
  }, [load]);

  const linkAffiliation = useCallback(
    async (payload: LinkAffiliationPayload) => {
      setLinking(true);
      setError(null);
      try {
        await affiliationsService.linkAffiliation(organizationId, payload);
        await refetch();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLinking(false);
      }
    },
    [organizationId, refetch],
  );

  const updateAffiliation = useCallback(
    async (affiliationId: string, payload: UpdateAffiliationPayload) => {
      setBusyId(affiliationId);
      setError(null);
      try {
        await affiliationsService.updateAffiliation(
          organizationId,
          affiliationId,
          payload,
        );
        await refetch();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setBusyId(null);
      }
    },
    [organizationId, refetch],
  );

  const unlinkAffiliation = useCallback(
    async (affiliationId: string) => {
      setBusyId(affiliationId);
      setError(null);
      try {
        await affiliationsService.unlinkAffiliation(organizationId, affiliationId);
        await refetch();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setBusyId(null);
      }
    },
    [organizationId, refetch],
  );

  const availableOrganizations = useMemo(() => {
    const linkedIds = new Set(affiliations.map((a) => a.affiliate_id));
    return organizations.filter(
      (o) => o.id !== organizationId && !linkedIds.has(o.id),
    );
  }, [organizations, affiliations, organizationId]);

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
