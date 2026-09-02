"use client";

import { useState, useEffect, useCallback } from "react";
import { membersService } from "@/services/community/members";
import { Member, MemberStatus } from "@/types/modules/community";

export function useAdhesionRequests(organizationId: string) {
  const [requests, setRequests] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const load = useCallback(async (): Promise<Member[]> => {
    const data = await membersService.getAdhesionRequests(organizationId);
    return data.map((m) => ({
      ...m,
      joined_at: m.joined_at ? new Date(m.joined_at) : null,
    }));
  }, [organizationId]);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRequests(await load());
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const parsed = await load();
        if (!cancelled) setRequests(parsed);
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

  const approve = useCallback(
    async (memberId: string) => {
      setProcessingId(memberId);
      setError(null);
      try {
        await membersService.updateMember(organizationId, memberId, {
          status: MemberStatus.ACTIVE,
        });
        await refetch();
      } catch (err) {
        setError(err as Error);
      } finally {
        setProcessingId(null);
      }
    },
    [organizationId, refetch],
  );

  const reject = useCallback(
    async (memberId: string) => {
      setProcessingId(memberId);
      setError(null);
      try {
        await membersService.removeMember(organizationId, memberId);
        await refetch();
      } catch (err) {
        setError(err as Error);
      } finally {
        setProcessingId(null);
      }
    },
    [organizationId, refetch],
  );

  return { requests, loading, error, processingId, approve, reject, refetch };
}
