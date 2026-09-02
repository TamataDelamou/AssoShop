"use client";

import { useState } from "react";
import { accountingService } from "@/services/accounting/accounting";
import {
  AccountingBundle,
  AccountingEntry,
  AccountingEntryStatus,
  ValidateAccountingEntryPayload,
} from "@/types/modules/accounting";
import { ACCOUNTING_CONFIG, ACCOUNTING_LABELS } from "@/utils/constants";
import {
  enqueueSync,
  readCache,
  useNetworkStatus,
  writeCache,
} from "@/lib/offline";

type ApiError = { response?: { data?: { message?: string } } };

export function useValidateAccountingEntry() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingSync, setPendingSync] = useState(false);
  const online = useNetworkStatus();

  const validateEntry = async (
    organizationId: string,
    entryId: string,
    payload: ValidateAccountingEntryPayload,
  ): Promise<AccountingEntry | null> => {
    setLoading(true);
    setError(null);
    setPendingSync(false);
    try {
      if (!online) {
        const cacheKey = `${ACCOUNTING_CONFIG.CACHE_KEY_PREFIX}${organizationId}`;
        enqueueSync({
          module: ACCOUNTING_CONFIG.SYNC_MODULE,
          action: "validate_entry",
          payload: { organizationId, entryId, ...payload },
        });

        const cached = readCache<AccountingBundle>(cacheKey);
        if (cached) {
          const updated: AccountingBundle = {
            accounts: cached.accounts,
            entries: cached.entries.map((e) => {
              if (e.id !== entryId) return e;
              if (payload.decision === "reject") {
                return {
                  ...e,
                  status: AccountingEntryStatus.REJECTED,
                  validated_by: e.validated_by ?? payload.validator_name,
                  validated_at: new Date(),
                };
              }
              if (e.requires_double_validation && !e.validated_by) {
                return { ...e, validated_by: payload.validator_name };
              }
              return {
                ...e,
                status: AccountingEntryStatus.CONFIRMED,
                validated_by: e.requires_double_validation
                  ? e.validated_by
                  : payload.validator_name,
                second_validated_by: e.requires_double_validation
                  ? payload.validator_name
                  : e.second_validated_by,
                validated_at: new Date(),
              };
            }),
          };
          writeCache(cacheKey, updated, ACCOUNTING_CONFIG.CACHE_TTL_MS);
        }
        setPendingSync(true);
        return null;
      }

      return await accountingService.validateEntry(
        organizationId,
        entryId,
        payload,
      );
    } catch (err: unknown) {
      const message =
        (err as ApiError).response?.data?.message ||
        ACCOUNTING_LABELS.VALIDATE_ERROR;
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return { validateEntry, loading, error, pendingSync };
}
