"use client";

import { useState, useEffect, useCallback } from "react";
import { membersService } from "@/services/community/members";
import { Member } from "@/types/modules/community";
import { MEMBER_LABELS } from "@/utils/constants";

export function useMembers(organizationId: string, search = "") {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadMembers = useCallback(async (): Promise<Member[]> => {
    const data = await membersService.getMembers(organizationId, search);
    return data.map((m) => ({
      ...m,
      joined_at: m.joined_at ? new Date(m.joined_at) : null,
    }));
  }, [organizationId, search]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const parsed = await loadMembers();
        if (!cancelled) {
          setMembers(parsed);
        }
      } catch (err) {
        if (!cancelled) {
          console.error(MEMBER_LABELS.ERROR_UPDATE, err);
          setError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadMembers]);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const parsed = await loadMembers();
      setMembers(parsed);
    } catch (err) {
      console.error(MEMBER_LABELS.ERROR_UPDATE, err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [loadMembers]);

  return { members, loading, error, refetch };
}
