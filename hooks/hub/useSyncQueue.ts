"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clearSyncQueue,
  getSyncQueue,
  OfflineOperation,
  processSyncQueue,
  subscribeSyncQueue,
  SyncResult,
} from "@/lib/offline";

export type ReplayHandler = (payload: unknown) => Promise<unknown>;

export function useSyncQueue() {
  const [queue, setQueue] = useState<OfflineOperation[]>(() => getSyncQueue());
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<SyncResult[] | null>(null);

  const refresh = useCallback(() => {
    setQueue(getSyncQueue());
  }, []);

  useEffect(() => {
    return subscribeSyncQueue(refresh);
  }, [refresh]);

  const process = useCallback(
    async (handlers: Record<string, ReplayHandler>) => {
      setProcessing(true);
      setResults(null);
      try {
        const res = await processSyncQueue(handlers);
        setResults(res);
        setQueue(getSyncQueue());
        return res;
      } finally {
        setProcessing(false);
      }
    },
    [],
  );

  const clear = useCallback(() => {
    clearSyncQueue();
    setQueue([]);
    setResults(null);
  }, []);

  return { queue, processing, results, process, clear, refresh };
}
