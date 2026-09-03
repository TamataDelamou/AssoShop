"use client";

import { documentsService } from "@/services/community/documents";
import { AssociationDocument } from "@/types/modules/community";
import { DOCUMENT_CONFIG } from "@/utils/constants";
import { declareOffline, useOfflineQuery } from "@/lib/offline";

declareOffline({
  module: "documents",
  cacheableReads: [DOCUMENT_CONFIG.CACHE_KEY_PREFIX],
  deferredMutations: [],
});

function parseDocuments(data: AssociationDocument[]): AssociationDocument[] {
  return data.map((d) => ({
    ...d,
    created_at: d.created_at ? new Date(d.created_at) : null,
  }));
}

export function useDocuments(
  organizationId: string,
  search = "",
  category = "",
) {
  const cacheKey = `${DOCUMENT_CONFIG.CACHE_KEY_PREFIX}${organizationId}:${search || "_"}:${category || "_"}`;
  const { data, loading, error, fromCache, online, refetch } =
    useOfflineQuery<AssociationDocument[]>(
      cacheKey,
      () =>
        documentsService.getDocuments(organizationId, {
          search: search || undefined,
          category: category || undefined,
        }),
      { ttlMs: DOCUMENT_CONFIG.CACHE_TTL_MS, parse: parseDocuments },
    );

  return {
    documents: data ?? [],
    loading,
    error,
    fromCache,
    online,
    refetch,
  };
}
