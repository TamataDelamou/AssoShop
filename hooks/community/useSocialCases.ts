"use client";

import { socialCasesService } from "@/services/community/socialCases";
import { SocialCase } from "@/types/modules/community";
import { SOCIAL_CASE_CONFIG } from "@/utils/constants";
import { declareOffline, useOfflineQuery } from "@/lib/offline";

declareOffline({
  module: "social-cases",
  cacheableReads: [SOCIAL_CASE_CONFIG.CACHE_KEY_PREFIX],
  deferredMutations: [],
});

function parseSocialCases(data: SocialCase[]): SocialCase[] {
  return data.map((c) => ({
    ...c,
    created_at: c.created_at ? new Date(c.created_at) : null,
    disbursed_at: c.disbursed_at ? new Date(c.disbursed_at) : null,
    contributors: c.contributors?.map((contributor) => ({
      ...contributor,
      contributed_at: contributor.contributed_at
        ? new Date(contributor.contributed_at)
        : null,
    })),
  }));
}

export function useSocialCases(
  organizationId: string,
  search = "",
  status = "",
) {
  const cacheKey = `${SOCIAL_CASE_CONFIG.CACHE_KEY_PREFIX}${organizationId}:${search || "_"}:${status || "_"}`;
  const { data, loading, error, refetch } = useOfflineQuery<SocialCase[]>(
    cacheKey,
    () =>
      socialCasesService.getSocialCases(organizationId, {
        search: search || undefined,
        status: status || undefined,
      }),
    { ttlMs: SOCIAL_CASE_CONFIG.CACHE_TTL_MS, parse: parseSocialCases },
  );

  return { socialCases: data ?? [], loading, error, refetch };
}
