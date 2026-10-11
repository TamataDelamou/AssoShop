"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import {
  clearSyncQueue,
  getServerSyncQueueSnapshot,
  getSyncQueueSnapshot,
  OfflineOperation,
  processSyncQueue,
  subscribeSyncQueue,
  SyncResult,
} from "@/lib/offline";

export type ReplayHandler = (payload: unknown) => Promise<unknown>;

export function useSyncQueue() {
  // File lue après le montage seulement : le serveur rend une file vide, ce
  // qui évite tout écart d'hydratation.
  const queue: OfflineOperation[] = useSyncExternalStore(
    subscribeSyncQueue,
    getSyncQueueSnapshot,
    getServerSyncQueueSnapshot,
  );
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<SyncResult[] | null>(null);

  const process = useCallback(
    async (handlers: Record<string, ReplayHandler>) => {
      setProcessing(true);
      setResults(null);
      try {
        const res = await processSyncQueue(handlers);
        setResults(res);
        return res;
      } finally {
        setProcessing(false);
      }
    },
    [],
  );

  const clear = useCallback(() => {
    clearSyncQueue();
    setResults(null);
  }, []);

  return { queue, processing, results, process, clear };
}
