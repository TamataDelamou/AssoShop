"use client";

import { useState, useEffect, useCallback } from "react";
import { sanctionsService } from "@/services/community/sanctions";
import { membersService } from "@/services/community/members";
import {
  ApplySanctionPayload,
  Member,
  Sanction,
} from "@/types/modules/community";

function parseSanction(sanction: Sanction): Sanction {
  return {
    ...sanction,
    start_date: sanction.start_date ? new Date(sanction.start_date) : null,
    end_date: sanction.end_date ? new Date(sanction.end_date) : null,
    created_at: sanction.created_at ? new Date(sanction.created_at) : null,
  };
}

export function useSanctions(organizationId: string) {
  const [sanctions, setSanctions] = useState<Sanction[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [liftingId, setLiftingId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    const [sanctionsData, membersData] = await Promise.all([
      sanctionsService.getSanctions(organizationId),
      membersService.getMembers(organizationId),
    ]);

    const joined = sanctionsData.map((sanction) => {
      const member = membersData.find((m) => m.id === sanction.member_id);
      return {
        ...parseSanction(sanction),
        member: member
          ? {
              id: member.id,
              name: member.user?.name ?? "Utilisateur",
              email: member.user?.email,
              phone: member.user?.phone,
            }
          : sanction.member,
      };
    });

    return { sanctions: joined, members: membersData };
  }, [organizationId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await load();
        if (!cancelled) {
          setSanctions(data.sanctions);
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
      setSanctions(data.sanctions);
      setMembers(data.members);
    } catch (err) {
      setError(err as Error);
    }
  }, [load]);

  const applySanction = useCallback(
    async (payload: ApplySanctionPayload) => {
      setApplying(true);
      setError(null);
      try {
        await sanctionsService.applySanction(organizationId, payload);
        await refetch();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setApplying(false);
      }
    },
    [organizationId, refetch],
  );

  const liftSanction = useCallback(
    async (sanctionId: string) => {
      setLiftingId(sanctionId);
      setError(null);
      try {
        await sanctionsService.liftSanction(organizationId, sanctionId);
        await refetch();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLiftingId(null);
      }
    },
    [organizationId, refetch],
  );

  return {
    sanctions,
    members,
    loading,
    applying,
    liftingId,
    error,
    applySanction,
    liftSanction,
  };
}
