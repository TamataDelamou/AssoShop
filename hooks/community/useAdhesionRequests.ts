"use client";

import { useCallback, useState } from "react";
import { membersService } from "@/services/community/members";
import { Member, MemberStatus } from "@/types/modules/community";
import { MEMBER_CONFIG } from "@/utils/constants";
import { declareOffline, useOfflineQuery } from "@/lib/offline";

declareOffline({
  module: "members",
  cacheableReads: [MEMBER_CONFIG.CACHE_KEY_PREFIX],
  deferredMutations: [],
});

function parseRequests(data: Member[]): Member[] {
  return data.map((m) => ({
    ...m,
    joined_at: m.joined_at ? new Date(m.joined_at) : null,
  }));
}

export function useAdhesionRequests(organizationId: string) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<Error | null>(null);
  const { data, loading, error: loadError, refetch, refresh } =
    useOfflineQuery<Member[]>(
      `${MEMBER_CONFIG.CACHE_KEY_PREFIX}${organizationId}:adhesion-requests`,
      () => membersService.getAdhesionRequests(organizationId),
      { ttlMs: MEMBER_CONFIG.CACHE_TTL_MS, parse: parseRequests },
    );

  const error = actionError ?? loadError;

  const approve = useCallback(
    async (memberId: string) => {
      setProcessingId(memberId);
      setActionError(null);
      try {
        await membersService.updateMember(organizationId, memberId, {
          status: MemberStatus.ACTIVE,
        });
        await refresh();
      } catch (err) {
        setActionError(err as Error);
      } finally {
        setProcessingId(null);
      }
    },
    [organizationId, refresh],
  );

  const reject = useCallback(
    async (memberId: string) => {
      setProcessingId(memberId);
      setActionError(null);
      try {
        await membersService.removeMember(organizationId, memberId);
        await refresh();
      } catch (err) {
        setActionError(err as Error);
      } finally {
        setProcessingId(null);
      }
    },
    [organizationId, refresh],
  );

  return {
    requests: data ?? [],
    loading,
    error,
    processingId,
    approve,
    reject,
    refetch,
  };
}
