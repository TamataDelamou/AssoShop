"use client";

import { useState } from "react";
import { accountingService } from "@/services/accounting/accounting";
import { AccountingEntry } from "@/types/modules/accounting";
import { ACCOUNTING_CONFIG, ACCOUNTING_LABELS } from "@/utils/constants";
import { enqueueSync, useNetworkStatus } from "@/lib/offline";

type ApiError = { response?: { data?: { message?: string } } };

export function useConsolidate() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingSync, setPendingSync] = useState(false);
  const online = useNetworkStatus();

  const consolidate = async (
    organizationId: string,
    movementIds: string[],
  ): Promise<AccountingEntry[] | null> => {
    setLoading(true);
    setError(null);
    setPendingSync(false);
    try {
      if (!online) {
        enqueueSync({
          module: ACCOUNTING_CONFIG.SYNC_MODULE,
          action: "consolidate",
          payload: { organizationId, movementIds },
        });
        setPendingSync(true);
        return null;
      }

      return await accountingService.consolidate(organizationId, movementIds);
    } catch (err: unknown) {
      const message =
        (err as ApiError).response?.data?.message ||
        ACCOUNTING_LABELS.CONSOLIDATE_ERROR;
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return { consolidate, loading, error, pendingSync };
}
