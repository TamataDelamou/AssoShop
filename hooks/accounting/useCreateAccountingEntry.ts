"use client";

import { useState } from "react";
import { accountingService } from "@/services/accounting/accounting";
import {
  AccountingBundle,
  AccountingEntry,
  AccountingEntrySource,
  AccountingEntryStatus,
  AccountingEntryType,
  CreateAccountingEntryPayload,
  TreasuryAccountType,
} from "@/types/modules/accounting";
import { ACCOUNTING_CONFIG, ACCOUNTING_LABELS } from "@/utils/constants";
import {
  enqueueSync,
  readCache,
  useNetworkStatus,
  writeCache,
} from "@/lib/offline";

type ApiError = { response?: { data?: { message?: string } } };

const EMPTY_BUNDLE: AccountingBundle = { accounts: [], entries: [] };

export function useCreateAccountingEntry() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingSync, setPendingSync] = useState(false);
  const online = useNetworkStatus();

  const createEntry = async (
    organizationId: string,
    payload: CreateAccountingEntryPayload,
  ): Promise<AccountingEntry | null> => {
    setLoading(true);
    setError(null);
    setPendingSync(false);
    try {
      if (!online) {
        const cacheKey = `${ACCOUNTING_CONFIG.CACHE_KEY_PREFIX}${organizationId}`;
        enqueueSync({
          module: ACCOUNTING_CONFIG.SYNC_MODULE,
          action: "create_entry",
          payload: { organizationId, ...payload },
        });

        const isCash = payload.account_type === TreasuryAccountType.CASH;
        const isLargeExpense =
          payload.entry_type === AccountingEntryType.EXPENSE &&
          payload.amount > ACCOUNTING_CONFIG.DOUBLE_VALIDATION_THRESHOLD;
        const status =
          isCash || isLargeExpense
            ? AccountingEntryStatus.PENDING
            : AccountingEntryStatus.CONFIRMED;

        const cached =
          readCache<AccountingBundle>(cacheKey) ?? EMPTY_BUNDLE;
        const optimistic: AccountingEntry = {
          id: `local-${Date.now()}`,
          organization_id: organizationId,
          source: AccountingEntrySource.MANUAL,
          account_type: payload.account_type,
          entry_type: payload.entry_type,
          label: payload.label,
          amount: payload.amount,
          payer_name: payload.payer_name,
          beneficiary_name: payload.beneficiary_name,
          justification: payload.justification ?? null,
          status,
          requires_double_validation: isLargeExpense,
          validated_by: null,
          second_validated_by: null,
          created_at: new Date(),
          validated_at:
            status === AccountingEntryStatus.CONFIRMED ? new Date() : null,
        };
        writeCache(
          cacheKey,
          {
            accounts: cached.accounts,
            entries: [optimistic, ...(cached.entries ?? [])],
          },
          ACCOUNTING_CONFIG.CACHE_TTL_MS,
        );
        setPendingSync(true);
        return null;
      }

      return await accountingService.createEntry(organizationId, payload);
    } catch (err: unknown) {
      const message =
        (err as ApiError).response?.data?.message ||
        ACCOUNTING_LABELS.ENTRY_ERROR;
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return { createEntry, loading, error, pendingSync };
}
