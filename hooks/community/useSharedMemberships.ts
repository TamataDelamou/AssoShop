"use client";

import { useState, useEffect, useCallback } from "react";
import { sharedMembershipsService } from "@/services/community/sharedMemberships";
import { affiliationsService } from "@/services/community/affiliations";
import { organizationsService } from "@/services/community/organizations";
import {
  Affiliation,
  CreateSharedMembershipPayload,
  SharedMembershipRequest,
} from "@/types/modules/community";

function parseSharedMembership(s: SharedMembershipRequest): SharedMembershipRequest {
  return { ...s, requested_at: s.requested_at ? new Date(s.requested_at) : null };
}

export function useSharedMemberships(organizationId: string) {
  const [requests, setRequests] = useState<SharedMembershipRequest[]>([]);
  const [affiliations, setAffiliations] = useState<Affiliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    const [sharedData, affiliationsData, orgsData] = await Promise.all([
      sharedMembershipsService.getSharedMemberships(organizationId),
      affiliationsService.getAffiliations(organizationId),
      organizationsService.getOrganizations(),
    ]);

    const orgNameById = new Map(orgsData.map((o) => [o.id, o.name] as const));
    const affiliateIdByAffiliationId = new Map(
      affiliationsData.map((a) => [a.id, a.affiliate_id] as const),
    );

    return {
      requests: sharedData.map((s) => {
        const affiliateId = affiliateIdByAffiliationId.get(
          s.source_affiliation_id,
        );
        return {
          ...parseSharedMembership(s),
          source_organization_name: affiliateId
            ? orgNameById.get(affiliateId)
            : undefined,
        };
      }),
      affiliations: affiliationsData.map((a) => ({
        ...a,
        linked_at: a.linked_at ? new Date(a.linked_at) : null,
        affiliate_name: orgNameById.get(a.affiliate_id),
      })),
    };
  }, [organizationId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await load();
        if (!cancelled) {
          setRequests(data.requests);
          setAffiliations(data.affiliations);
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
      setRequests(data.requests);
      setAffiliations(data.affiliations);
    } catch (err) {
      setError(err as Error);
    }
  }, [load]);

  const createSharedMembership = useCallback(
    async (payload: CreateSharedMembershipPayload) => {
      setCreating(true);
      setError(null);
      try {
        await sharedMembershipsService.createSharedMembership(organizationId, payload);
        await refetch();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setCreating(false);
      }
    },
    [organizationId, refetch],
  );

  const approve = useCallback(
    async (sharedMembershipId: string) => {
      setBusyId(sharedMembershipId);
      setError(null);
      try {
        await sharedMembershipsService.approveSharedMembership(
          organizationId,
          sharedMembershipId,
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

  const reject = useCallback(
    async (sharedMembershipId: string) => {
      setBusyId(sharedMembershipId);
      setError(null);
      try {
        await sharedMembershipsService.rejectSharedMembership(
          organizationId,
          sharedMembershipId,
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

  return {
    requests,
    affiliations,
    loading,
    creating,
    busyId,
    error,
    createSharedMembership,
    approve,
    reject,
  };
}
