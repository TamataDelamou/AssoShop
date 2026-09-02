"use client";

import { useState } from "react";
import { loansService } from "@/services/finance/loans";
import {
  GroupLoan,
  LoanStatus,
  RequestLoanPayload,
} from "@/types/modules/finance";
import { LOAN_CONFIG, LOAN_LABELS } from "@/utils/constants";
import {
  enqueueSync,
  readCache,
  useNetworkStatus,
  writeCache,
} from "@/lib/offline";

type ApiError = { response?: { data?: { message?: string } } };

interface LoanContext {
  group_name: string;
  member_name: string;
  sponsor_name: string;
  interest_rate: number;
}

export function useRequestLoan() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingSync, setPendingSync] = useState(false);
  const online = useNetworkStatus();

  const requestLoan = async (
    organizationId: string,
    groupId: string,
    payload: RequestLoanPayload,
    context: LoanContext,
  ): Promise<GroupLoan | null> => {
    setLoading(true);
    setError(null);
    setPendingSync(false);
    try {
      if (!online) {
        const cacheKey = `${LOAN_CONFIG.CACHE_KEY_PREFIX}${organizationId}`;
        enqueueSync({
          module: LOAN_CONFIG.SYNC_MODULE,
          action: "request_loan",
          payload: { organizationId, groupId, ...payload },
        });

        const cached = readCache<GroupLoan[]>(cacheKey) ?? [];
        const optimistic: GroupLoan = {
          id: `local-${Date.now()}`,
          group_id: groupId,
          group_name: context.group_name,
          member_id: payload.member_id,
          member_name: context.member_name,
          sponsor_name: context.sponsor_name,
          amount: payload.amount,
          suggested_amount: Math.round((payload.amount * 0.75) / 1000) * 1000,
          interest_rate: context.interest_rate,
          total_due: 0,
          repaid_amount: 0,
          status: LoanStatus.REQUESTED,
          requested_at: new Date(),
          sponsor_confirmed_at: null,
          decision_at: null,
          installments: [],
        };
        writeCache(
          cacheKey,
          [optimistic, ...cached],
          LOAN_CONFIG.CACHE_TTL_MS,
        );
        setPendingSync(true);
        return null;
      }

      return await loansService.requestLoan(organizationId, groupId, payload);
    } catch (err: unknown) {
      const message =
        (err as ApiError).response?.data?.message ||
        LOAN_LABELS.REQUEST_ERROR;
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return { requestLoan, loading, error, pendingSync };
}
