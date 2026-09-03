"use client";

import { memberProfilesService } from "@/services/community/memberProfiles";
import { MemberProfile } from "@/types/modules/community";
import { MEMBER_CONFIG } from "@/utils/constants";
import { useOfflineQuery } from "@/lib/offline";

export function useMemberProfile(
  organizationId: string,
  memberId: string | null,
) {
  const { data, loading, error } = useOfflineQuery<MemberProfile>(
    `${MEMBER_CONFIG.CACHE_KEY_PREFIX}${organizationId}:${memberId ?? "null"}:profile`,
    () =>
      memberProfilesService.getProfile(organizationId, memberId as string),
    {
      ttlMs: MEMBER_CONFIG.CACHE_TTL_MS,
      enabled: memberId !== null,
    },
  );

  return { profile: data, loading, error };
}
