"use client";

import { membersService } from "@/services/community/members";
import { Member } from "@/types/modules/community";
import { MEMBER_CONFIG } from "@/utils/constants";
import { declareOffline, useOfflineQuery } from "@/lib/offline";

declareOffline({
  module: "members",
  cacheableReads: [MEMBER_CONFIG.CACHE_KEY_PREFIX],
  deferredMutations: [],
});

function parseMembers(data: Member[]): Member[] {
  return data.map((m) => ({
    ...m,
    joined_at: m.joined_at ? new Date(m.joined_at) : null,
  }));
}

export function useMembers(organizationId: string, search = "") {
  const cacheKey = `${MEMBER_CONFIG.CACHE_KEY_PREFIX}${organizationId}:${search || "_"}`;
  const { data, loading, error, refetch } = useOfflineQuery<Member[]>(
    cacheKey,
    () => membersService.getMembers(organizationId, search),
    { ttlMs: MEMBER_CONFIG.CACHE_TTL_MS, parse: parseMembers },
  );

  return { members: data ?? [], loading, error, refetch };
}
