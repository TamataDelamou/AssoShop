"use client";

import { useState } from "react";
import { financialGroupsService } from "@/services/finance/financialGroups";
import {
  CreateFinancialGroupPayload,
  EngagementLevel,
  FinancialGroup,
  FinancialGroupStatus,
  GroupMemberRole,
} from "@/types/modules/finance";
import { FINANCE_CONFIG, FINANCE_LABELS } from "@/utils/constants";
import {
  enqueueSync,
  readCache,
  useNetworkStatus,
  writeCache,
} from "@/lib/offline";

type ApiError = { response?: { data?: { message?: string } } };

export function useCreateFinancialGroup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingSync, setPendingSync] = useState(false);
  const online = useNetworkStatus();

  const createGroup = async (
    organizationId: string,
    payload: CreateFinancialGroupPayload,
  ): Promise<FinancialGroup | null> => {
    setLoading(true);
    setError(null);
    setPendingSync(false);
    try {
      if (!online) {
        const cacheKey = `${FINANCE_CONFIG.CACHE_KEY_PREFIX}${organizationId}`;
        enqueueSync({
          module: FINANCE_CONFIG.SYNC_MODULE,
          action: "create_group",
          payload: { organizationId, ...payload },
        });

        const cached = readCache<FinancialGroup[]>(cacheKey) ?? [];
        const optimistic: FinancialGroup = {
          id: `local-${Date.now()}`,
          organization_id: organizationId,
          name: payload.name,
          type: payload.type,
          status: FinancialGroupStatus.FORMING,
          amount: payload.amount,
          periodicity: payload.periodicity,
          max_members: payload.max_members,
          goal_amount: payload.goal_amount ?? null,
          interest_rate: payload.interest_rate ?? null,
          start_date: null,
          created_at: new Date(),
          raised_amount: 0,
          members: [
            {
              id: `local-member-${Date.now()}`,
              name: "Bureau de l'association",
              role: GroupMemberRole.CREATOR,
              engagement: EngagementLevel.RELIABLE,
              joined_at: new Date(),
              last_payment_at: null,
            },
          ],
          payments: [],
          turns: [],
        };
        writeCache(
          cacheKey,
          [optimistic, ...cached],
          FINANCE_CONFIG.CACHE_TTL_MS,
        );
        setPendingSync(true);
        return null;
      }

      return await financialGroupsService.createFinancialGroup(
        organizationId,
        payload,
      );
    } catch (err: unknown) {
      const message =
        (err as ApiError).response?.data?.message ||
        FINANCE_LABELS.CREATE_ERROR;
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return { createGroup, loading, error, pendingSync };
}
