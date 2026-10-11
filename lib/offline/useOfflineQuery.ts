"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readCacheEntry, writeCache } from "./cache";
import { useNetworkStatus } from "./useNetworkStatus";

export interface UseOfflineQueryOptions<T> {
  // Fenêtre de fraîcheur : dans ce délai, on sert le cache sans refetch réseau.
  ttlMs?: number;
  // Fenêtre maximale de péremption : au-delà du TTL mais en-deçà de staleMs,
  // on sert le cache puis on revalide en arrière-plan (stale-while-revalidate).
  staleMs?: number;
  // Normalisation des données relues du cache (ex. conversion de dates).
  parse?: (data: T) => T;
  // Si false, aucun fetch n'est lancé (utile pour les ids optionnels).
  enabled?: boolean;
}

export interface UseOfflineQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  fromCache: boolean;
  online: boolean;
  refetch: () => Promise<void>;
  refresh: () => Promise<void>;
}

const DEFAULT_TTL_MS = 60_000;
const DEFAULT_STALE_MS = 7 * 24 * 60 * 60 * 1000;

export function useOfflineQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseOfflineQueryOptions<T> = {},
): UseOfflineQueryResult<T> {
  const {
    ttlMs = DEFAULT_TTL_MS,
    staleMs = DEFAULT_STALE_MS,
    parse,
    enabled = true,
  } = options;
  const online = useNetworkStatus();

  // Le cache est lu après le montage (effet ci-dessous), jamais au premier
  // rendu : serveur et client rendent ainsi le même état initial.
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const fetcherRef = useRef(fetcher);
  const parseRef = useRef(parse);

  // Synchronise les références après le rendu (règle react-hooks/refs) :
  // on garde ainsi des callbacks stables sans mettre à jour une ref au rendu.
  useEffect(() => {
    fetcherRef.current = fetcher;
    parseRef.current = parse;
  });

  const fetchFresh = useCallback(async () => {
    const value = await fetcherRef.current();
    const parsed = parseRef.current ? parseRef.current(value) : value;
    writeCache(key, value, staleMs);
    setData(parsed);
    setFromCache(false);
    setError(null);
  }, [key, staleMs]);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      await fetchFresh();
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [fetchFresh]);

  // Revalidation silencieuse (sans bascule de `loading`) : utilisée par les
  // mutations pour resynchroniser le cache après une écriture.
  const refresh = useCallback(async () => {
    try {
      await fetchFresh();
    } catch (err) {
      setError(err as Error);
    }
  }, [fetchFresh]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!enabled) {
        if (!cancelled) setLoading(false);
        return;
      }

      const entry = readCacheEntry<T>(key);

      if (entry) {
        const parsed = parseRef.current
          ? parseRef.current(entry.value)
          : entry.value;
        if (cancelled) return;
        setData(parsed);
        setFromCache(true);
        setLoading(false);

        // Stale-while-revalidate : on sert le cache, et on revalide en
        // arrière-plan seulement si l'entrée dépasse la fenêtre de fraîcheur.
        const age = Date.now() - entry.fetchedAt;
        if (online && age >= ttlMs) {
          try {
            await fetchFresh();
          } catch (err) {
            if (!cancelled) setError(err as Error);
          }
        }
        return;
      }

      if (online) {
        try {
          await fetchFresh();
        } catch (err) {
          if (!cancelled) setError(err as Error);
        } finally {
          if (!cancelled) setLoading(false);
        }
      } else {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [key, online, ttlMs, fetchFresh, enabled]);

  return { data, loading, error, fromCache, online, refetch, refresh };
}
