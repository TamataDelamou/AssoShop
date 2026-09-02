"use client";

import { useEffect, useState } from "react";
import { memberProfilesService } from "@/services/community/memberProfiles";
import { MemberProfile } from "@/types/modules/community";

export function useMemberProfile(
  organizationId: string,
  memberId: string | null,
) {
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!memberId) return;
    let cancelled = false;

    (async () => {
      try {
        const data = await memberProfilesService.getProfile(
          organizationId,
          memberId,
        );
        if (!cancelled) setProfile(data);
      } catch (err) {
        if (!cancelled) setError(err as Error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [organizationId, memberId]);

  return { profile, loading, error };
}
