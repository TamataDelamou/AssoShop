"use client";

import { useState, useEffect, useCallback } from "react";
import { relocationsService } from "@/services/community/relocations";
import { membersService } from "@/services/community/members";
import {
  CreateRelocationPayload,
  Member,
  MemberRelocation,
} from "@/types/modules/community";

function parseRelocation(r: MemberRelocation): MemberRelocation {
  return {
    ...r,
    requested_at: r.requested_at ? new Date(r.requested_at) : null,
    confirmed_at: r.confirmed_at ? new Date(r.confirmed_at) : null,
  };
}

export function useRelocations(organizationId: string) {
  const [relocations, setRelocations] = useState<MemberRelocation[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    const [relocationsData, membersData] = await Promise.all([
      relocationsService.getRelocations(organizationId),
      membersService.getMembers(organizationId),
    ]);

    const nameById = new Map(
      membersData.map((m) => [m.id, m.user?.name ?? ""] as const),
    );
    return {
      relocations: relocationsData.map((r) => ({
        ...parseRelocation(r),
        member_name: nameById.get(r.member_id) ?? r.member_name,
      })),
      members: membersData,
    };
  }, [organizationId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await load();
        if (!cancelled) {
          setRelocations(data.relocations);
          setMembers(data.members);
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
      setRelocations(data.relocations);
      setMembers(data.members);
    } catch (err) {
      setError(err as Error);
    }
  }, [load]);

  const createRelocation = useCallback(
    async (payload: CreateRelocationPayload) => {
      setCreating(true);
      setError(null);
      try {
        await relocationsService.createRelocation(organizationId, payload);
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

  const confirmRelocation = useCallback(
    async (relocationId: string) => {
      setBusyId(relocationId);
      setError(null);
      try {
        await relocationsService.confirmRelocation(organizationId, relocationId);
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
    relocations,
    members,
    loading,
    creating,
    busyId,
    error,
    createRelocation,
    confirmRelocation,
  };
}
