// File d'attente des mutations effectuées hors-ligne.
// À la reconnexion, ces opérations sont rejouées puis purgées.

const QUEUE_KEY = "assoshop:sync-queue";

export interface OfflineOperation {
  id: string;
  module: string;
  action: string;
  payload: unknown;
  createdAt: string;
}

export type NewOfflineOperation = Omit<OfflineOperation, "id" | "createdAt">;

function readQueue(): OfflineOperation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as OfflineOperation[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: OfflineOperation[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Stockage indisponible : ignoré silencieusement.
  }
}

export function enqueueSync(operation: NewOfflineOperation): OfflineOperation {
  const record: OfflineOperation = {
    ...operation,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  const queue = readQueue();
  queue.push(record);
  writeQueue(queue);
  emitSyncChanged();
  return record;
}

export function getSyncQueue(): OfflineOperation[] {
  return readQueue();
}

export function hasPendingSync(module?: string): boolean {
  const queue = readQueue();
  return module
    ? queue.some((op) => op.module === module)
    : queue.length > 0;
}

export function clearSyncQueue(module?: string): void {
  if (module) {
    writeQueue(readQueue().filter((op) => op.module !== module));
  } else {
    writeQueue([]);
  }
  emitSyncChanged();
}

// ============================================
// ABONNEMENT AUX CHANGEMENTS & REJEU (HUB-36)
// ============================================
const SYNC_CHANGED_EVENT = "assoshop:sync-changed";

function emitSyncChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SYNC_CHANGED_EVENT));
}

export function subscribeSyncQueue(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => listener();
  window.addEventListener(SYNC_CHANGED_EVENT, handler);
  return () => window.removeEventListener(SYNC_CHANGED_EVENT, handler);
}

export interface SyncResult {
  id: string;
  module: string;
  action: string;
  ok: boolean;
  error?: string;
}

export async function processSyncQueue(
  handlers: Record<string, (payload: unknown) => Promise<unknown>>,
): Promise<SyncResult[]> {
  const queue = readQueue();
  const results: SyncResult[] = [];
  const remaining: OfflineOperation[] = [];

  for (const op of queue) {
    const handler = handlers[`${op.module}:${op.action}`];
    if (!handler) {
      results.push({
        id: op.id,
        module: op.module,
        action: op.action,
        ok: false,
        error: "Opération non rejouable (gestionnaire manquant)",
      });
      remaining.push(op);
      continue;
    }
    try {
      await handler(op.payload);
      results.push({ id: op.id, module: op.module, action: op.action, ok: true });
    } catch (err) {
      results.push({
        id: op.id,
        module: op.module,
        action: op.action,
        ok: false,
        error: err instanceof Error ? err.message : "Erreur inconnue",
      });
      remaining.push(op);
    }
  }

  writeQueue(remaining);
  emitSyncChanged();
  return results;
}
