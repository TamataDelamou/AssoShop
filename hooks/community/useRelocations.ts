"use client";

import { useCallback, useState } from "react";
import { relocationsService } from "@/services/community/relocations";
import { membersService } from "@/services/community/members";
import {
  CreateRelocationPayload,
  Member,
  MemberRelocation,
} from "@/types/modules/community";
import { RELOCATION_CONFIG } from "@/utils/constants";
import { declareOffline, useOfflineQuery } from "@/lib/offline";

declareOffline({
  module: "relocations",
  cacheableReads: [RELOCATION_CONFIG.CACHE_KEY_PREFIX],
  deferredMutations: [],
});

function parseRelocation(r: MemberRelocation): MemberRelocation {
  return {
    ...r,
    requested_at: r.requested_at ? new Date(r.requested_at) : null,
    confirmed_at: r.confirmed_at ? new Date(r.confirmed_at) : null,
  };
}

interface RelocationsBundle {
  relocations: MemberRelocation[];
  members: Member[];
}

export function useRelocations(organizationId: string) {
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<Error | null>(null);
  const { data, loading, error: loadError, refresh } =
    useOfflineQuery<RelocationsBundle>(
      `${RELOCATION_CONFIG.CACHE_KEY_PREFIX}${organizationId}`,
      async () => {
        const [relocations, members] = await Promise.all([
          relocationsService.getRelocations(organizationId),
          membersService.getMembers(organizationId),
        ]);
        return { relocations, members };
      },
      {
        ttlMs: RELOCATION_CONFIG.CACHE_TTL_MS,
        parse: (bundle) => {
          const nameById = new Map(
            bundle.members.map((m) => [m.id, m.user?.name ?? ""] as const),
          );
          return {
            relocations: bundle.relocations.map((r) => ({
              ...parseRelocation(r),
              member_name: nameById.get(r.member_id) ?? r.member_name,
            })),
            members: bundle.members,
          };
        },
      },
    );

  const error = actionError ?? loadError;

  const createRelocation = useCallback(
    async (payload: CreateRelocationPayload) => {
      setCreating(true);
      setActionError(null);
      try {
        await relocationsService.createRelocation(organizationId, payload);
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

  const confirmRelocation = useCallback(
    async (relocationId: string) => {
      setBusyId(relocationId);
      setActionError(null);
      try {
        await relocationsService.confirmRelocation(
          organizationId,
          relocationId,
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
    relocations: data?.relocations ?? [],
    members: data?.members ?? [],
    loading,
    creating,
    busyId,
    error,
    createRelocation,
    confirmRelocation,
  };
}
