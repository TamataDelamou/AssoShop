// Cache local hors-ligne (localStorage + expiration).
// Sûr côté SSR : toutes les fonctions sont no-op sans `window`.

const PREFIX = "assoshop:cache:";

interface CacheRecord<T> {
  value: T;
  expiresAt: number | null;
}

export function readCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const record = JSON.parse(raw) as CacheRecord<T>;
    if (record.expiresAt && Date.now() > record.expiresAt) {
      window.localStorage.removeItem(PREFIX + key);
      return null;
    }
    return record.value;
  } catch {
    return null;
  }
}

export function writeCache<T>(
  key: string,
  value: T,
  ttlMs?: number,
): void {
  if (typeof window === "undefined") return;
  try {
    const record: CacheRecord<T> = {
      value,
      expiresAt: ttlMs ? Date.now() + ttlMs : null,
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
