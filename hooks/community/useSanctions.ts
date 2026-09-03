"use client";

import { useCallback, useState } from "react";
import { sanctionsService } from "@/services/community/sanctions";
import { membersService } from "@/services/community/members";
import {
  ApplySanctionPayload,
  Member,
  Sanction,
} from "@/types/modules/community";
import { SANCTION_CONFIG } from "@/utils/constants";
import { declareOffline, useOfflineQuery } from "@/lib/offline";

declareOffline({
  module: "sanctions",
  cacheableReads: [SANCTION_CONFIG.CACHE_KEY_PREFIX],
  deferredMutations: [],
});

function parseSanction(sanction: Sanction): Sanction {
  return {
    ...sanction,
    start_date: sanction.start_date ? new Date(sanction.start_date) : null,
    end_date: sanction.end_date ? new Date(sanction.end_date) : null,
    created_at: sanction.created_at ? new Date(sanction.created_at) : null,
  };
}

interface SanctionsBundle {
  sanctions: Sanction[];
  members: Member[];
}

export function useSanctions(organizationId: string) {
  const [applying, setApplying] = useState(false);
  const [liftingId, setLiftingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<Error | null>(null);
  const { data, loading, error: loadError, refresh } =
    useOfflineQuery<SanctionsBundle>(
      `${SANCTION_CONFIG.CACHE_KEY_PREFIX}${organizationId}`,
      async () => {
        const [sanctions, members] = await Promise.all([
          sanctionsService.getSanctions(organizationId),
          membersService.getMembers(organizationId),
        ]);
        return { sanctions, members };
      },
      {
        ttlMs: SANCTION_CONFIG.CACHE_TTL_MS,
        parse: (bundle) => ({
          sanctions: bundle.sanctions.map((sanction) => {
            const member = bundle.members.find(
              (m) => m.id === sanction.member_id,
            );
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
          }),
          members: bundle.members,
        }),
      },
    );

  const error = actionError ?? loadError;

  const applySanction = useCallback(
    async (payload: ApplySanctionPayload) => {
      setApplying(true);
      setActionError(null);
      try {
        await sanctionsService.applySanction(organizationId, payload);
        await refresh();
      } catch (err) {
        setActionError(err as Error);
        throw err;
      } finally {
        setApplying(false);
      }
    },
    [organizationId, refresh],
  );

  const liftSanction = useCallback(
    async (sanctionId: string) => {
      setLiftingId(sanctionId);
      setActionError(null);
      try {
        await sanctionsService.liftSanction(organizationId, sanctionId);
        await refresh();
      } catch (err) {
        setActionError(err as Error);
        throw err;
      } finally {
        setLiftingId(null);
      }
    },
    [organizationId, refresh],
  );

  return {
    sanctions: data?.sanctions ?? [],
    members: data?.members ?? [],
    loading,
    applying,
    liftingId,
    error,
    applySanction,
    liftSanction,
  };
}
