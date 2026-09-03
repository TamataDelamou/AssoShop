"use client";

import { useCallback, useState } from "react";
import { sharedMembershipsService } from "@/services/community/sharedMemberships";
import { affiliationsService } from "@/services/community/affiliations";
import { organizationsService } from "@/services/community/organizations";
import {
  Affiliation,
  CreateSharedMembershipPayload,
  Organization,
  SharedMembershipRequest,
} from "@/types/modules/community";
import { SHARED_MEMBERSHIP_CONFIG } from "@/utils/constants";
import { declareOffline, useOfflineQuery } from "@/lib/offline";

declareOffline({
  module: "shared-memberships",
  cacheableReads: [SHARED_MEMBERSHIP_CONFIG.CACHE_KEY_PREFIX],
  deferredMutations: [],
});

function parseSharedMembership(
  s: SharedMembershipRequest,
): SharedMembershipRequest {
  return {
    ...s,
    requested_at: s.requested_at ? new Date(s.requested_at) : null,
  };
}

interface SharedMembershipsBundle {
  requests: SharedMembershipRequest[];
  affiliations: Affiliation[];
  organizations: Organization[];
}

export function useSharedMemberships(organizationId: string) {
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<Error | null>(null);
  const { data, loading, error: loadError, refresh } =
    useOfflineQuery<SharedMembershipsBundle>(
      `${SHARED_MEMBERSHIP_CONFIG.CACHE_KEY_PREFIX}${organizationId}`,
      async () => {
        const [requests, affiliations, organizations] = await Promise.all([
          sharedMembershipsService.getSharedMemberships(organizationId),
          affiliationsService.getAffiliations(organizationId),
          organizationsService.getOrganizations(),
        ]);
        return { requests, affiliations, organizations };
      },
      {
        ttlMs: SHARED_MEMBERSHIP_CONFIG.CACHE_TTL_MS,
        parse: (bundle) => {
          const orgNameById = new Map(
            bundle.organizations.map((o) => [o.id, o.name] as const),
          );
          const affiliateIdByAffiliationId = new Map(
            bundle.affiliations.map((a) => [a.id, a.affiliate_id] as const),
          );
          return {
            requests: bundle.requests.map((s) => {
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
            affiliations: bundle.affiliations.map((a) => ({
              ...a,
              linked_at: a.linked_at ? new Date(a.linked_at) : null,
              affiliate_name: orgNameById.get(a.affiliate_id),
            })),
            organizations: bundle.organizations,
          };
        },
      },
    );

  const error = actionError ?? loadError;

  const createSharedMembership = useCallback(
    async (payload: CreateSharedMembershipPayload) => {
      setCreating(true);
      setActionError(null);
      try {
        await sharedMembershipsService.createSharedMembership(
          organizationId,
          payload,
        );
        await refresh();
      } catch (err) {
        setActionError(err as Error);
        throw err;
      } finally {
        setCreating(false);
      }
    },
    [organizationId, refresh],
  );

  const approve = useCallback(
    async (sharedMembershipId: string) => {
      setBusyId(sharedMembershipId);
      setActionError(null);
      try {
        await sharedMembershipsService.approveSharedMembership(
          organizationId,
          sharedMembershipId,
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

  const reject = useCallback(
    async (sharedMembershipId: string) => {
      setBusyId(sharedMembershipId);
      setActionError(null);
      try {
        await sharedMembershipsService.rejectSharedMembership(
          organizationId,
          sharedMembershipId,
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

  return {
    requests: data?.requests ?? [],
    affiliations: data?.affiliations ?? [],
    loading,
    creating,
    busyId,
    error,
    createSharedMembership,
    approve,
    reject,
  };
}
