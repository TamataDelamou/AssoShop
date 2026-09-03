// Cache local hors-ligne (localStorage + expiration).
// Sémantique stale-while-revalidate : l'entrée périmée reste servable
// (readCache avec allowStale) et la fraîcheur est mesurée via fetchedAt.
// Sûr côté SSR : toutes les fonctions sont no-op sans `window`.

const PREFIX = "assoshop:cache:";

interface CacheRecord<T> {
  value: T;
  expiresAt: number | null;
  fetchedAt: number;
}

export interface CacheEntry<T> {
  value: T;
  fetchedAt: number;
  expiresAt: number | null;
}

function parseRecord<T>(raw: string): CacheRecord<T> | null {
  try {
    const record = JSON.parse(raw) as Partial<CacheRecord<T>>;
    if (record && typeof record === "object" && "value" in record) {
      return {
        value: record.value as T,
        expiresAt:
          typeof record.expiresAt === "number" ? record.expiresAt : null,
        // Rétrocompat : les entrées écrites avant l'ajout de fetchedAt.
        fetchedAt:
          typeof record.fetchedAt === "number" ? record.fetchedAt : Date.now(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function readCache<T>(
  key: string,
  options?: { allowStale?: boolean },
): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const record = parseRecord<T>(raw);
    if (!record) return null;
    const expired = record.expiresAt !== null && Date.now() > record.expiresAt;
    if (expired && !options?.allowStale) {
      window.localStorage.removeItem(PREFIX + key);
      return null;
    }
    return record.value;
  } catch {
    return null;
  }
}

// Retourne l'entrée complète (valeur + horodatage) sans purger l'expirée.
export function readCacheEntry<T>(key: string): CacheEntry<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const record = parseRecord<T>(raw);
    if (!record) return null;
    return {
      value: record.value,
      fetchedAt: record.fetchedAt,
      expiresAt: record.expiresAt,
    };
  } catch {
    return null;
  }
}

// Vrai si l'entrée existe et a été écrite il y a moins de ttlMs.
export function isCacheFresh(key: string, ttlMs: number): boolean {
  const entry = readCacheEntry<unknown>(key);
  if (!entry) return false;
  return Date.now() - entry.fetchedAt < ttlMs;
}

export function writeCache<T>(key: string, value: T, ttlMs?: number): void {
  if (typeof window === "undefined") return;
  try {
    const record: CacheRecord<T> = {
      value,
      expiresAt: ttlMs ? Date.now() + ttlMs : null,
      fetchedAt: Date.now(),
    };
    window.localStorage.setItem(PREFIX + key, JSON.stringify(record));
  } catch {
    // Stockage indisponible (quota, mode privé) : ignoré silencieusement.
  }
}

export function clearCache(key?: string): void {
  if (typeof window === "undefined") return;
  try {
    if (key) {
      window.localStorage.removeItem(PREFIX + key);
    } else {
      Object.keys(window.localStorage)
        .filter((k) => k.startsWith(PREFIX))
        .forEach((k) => window.localStorage.removeItem(k));
    }
  } catch {
    // Ignoré silencieusement.
  }
}

// Liste des entrées actuellement en cache (clés sans le préfixe interne).
export function getCachedKeys(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return Object.keys(window.localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .map((k) => k.slice(PREFIX.length));
  } catch {
    return [];
  }
}
