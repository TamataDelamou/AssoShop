"use client";

import { useEffect, useRef, useState } from "react";
import { hasPendingSync, processSyncQueue } from "./syncQueue";
import type { SyncResult } from "./syncQueue";
import { useNetworkStatus } from "./useNetworkStatus";

// Rejoue automatiquement la file de mutations différées à la reconnexion,
// via les gestionnaires enregistrés (registerReplayHandler). Rejoue aussi
// au montage si des opérations en attente subsistent d'une session passée.
export function useAutoSync() {
  const online = useNetworkStatus();
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<SyncResult[] | null>(null);
  const wasOffline = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setProcessing(true);
      try {
        const res = await processSyncQueue();
        if (!cancelled) setResults(res);
      } finally {
        if (!cancelled) setProcessing(false);
      }
    };

    if (!online) {
      wasOffline.current = true;
      return;
    }

    if (wasOffline.current || hasPendingSync()) {
      wasOffline.current = false;
      void run();
    }

    return () => {
      cancelled = true;
    };
  }, [online]);

  return { processing, results, online };
}
