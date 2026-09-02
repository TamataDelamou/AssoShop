"use client";

import { useState } from "react";
import { accountingService } from "@/services/accounting/accounting";
import { ReconciliationLine } from "@/types/modules/accounting";
import { ACCOUNTING_CONFIG, ACCOUNTING_LABELS } from "@/utils/constants";
import {
  enqueueSync,
  readCache,
  useNetworkStatus,
  writeCache,
} from "@/lib/offline";

type ApiError = { response?: { data?: { message?: string } } };

export function useReconcileLine() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingSync, setPendingSync] = useState(false);
  const online = useNetworkStatus();

  const reconcileLine = async (
    organizationId: string,
    lineId: string,
    entryId: string,
  ): Promise<ReconciliationLine | null> => {
    setLoading(true);
    setError(null);
    setPendingSync(false);
    try {
      if (!online) {
        const cacheKey = `${ACCOUNTING_CONFIG.CACHE_KEY_PREFIX}${organizationId}:reconciliation`;
        enqueueSync({
          module: ACCOUNTING_CONFIG.SYNC_MODULE,
          action: "reconcile_line",
          payload: { organizationId, lineId, entryId },
        });

        const cached = readCache<ReconciliationLine[]>(cacheKey);
        if (cached) {
          writeCache(
            cacheKey,
            cached.map((l) =>
              l.id === lineId ? { ...l, matched_entry_id: entryId } : l,
            ),
            ACCOUNTING_CONFIG.CACHE_TTL_MS,
          );
        }
        setPendingSync(true);
        return null;
      }

      return await accountingService.reconcileLine(
        organizationId,
        lineId,
        entryId,
      );
    } catch (err: unknown) {
      const message =
        (err as ApiError).response?.data?.message ||
        ACCOUNTING_LABELS.RECONCILE_ERROR;
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return { reconcileLine, loading, error, pendingSync };
}
