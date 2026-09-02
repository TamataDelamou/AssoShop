"use client";

import { useCallback, useEffect, useState } from "react";
import { documentsService } from "@/services/community/documents";
import { AssociationDocument } from "@/types/modules/community";
import { DOCUMENT_CONFIG, DOCUMENT_LABELS } from "@/utils/constants";
import { readCache, useNetworkStatus, writeCache } from "@/lib/offline";

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
  const [documents, setDocuments] = useState<AssociationDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const online = useNetworkStatus();

  const cacheKey = `${DOCUMENT_CONFIG.CACHE_KEY_PREFIX}${organizationId}`;

  const fetchRemote = useCallback(async (): Promise<AssociationDocument[]> => {
    const data = await documentsService.getDocuments(organizationId, {
      search: search || undefined,
      category: category || undefined,
    });
    return parseDocuments(data);
  }, [organizationId, search, category]);

  const load = useCallback(async () => {
    const cached = readCache<AssociationDocument[]>(cacheKey);
    if (cached) {
      setDocuments(parseDocuments(cached));
      setFromCache(true);
      setLoading(false);
    }

    if (online) {
      try {
        const fresh = await fetchRemote();
        setDocuments(fresh);
        setFromCache(false);
        writeCache(cacheKey, fresh, DOCUMENT_CONFIG.CACHE_TTL_MS);
      } catch (err) {
        console.error(DOCUMENT_LABELS.LOAD_ERROR, err);
        if (!cached) {
          setError(err as Error);
        }
      }
    }
  }, [cacheKey, online, fetchRemote]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await load();
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [load]);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    await load();
    setLoading(false);
  }, [load]);

  return { documents, loading, error, fromCache, online, refetch };
}
