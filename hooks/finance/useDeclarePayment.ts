"use client";

import { useEffect, useState } from "react";
import { financialGroupsService } from "@/services/finance/financialGroups";
import {
  DeclarePaymentPayload,
  FinancialGroup,
  GroupPayment,
  GroupPaymentMethod,
  GroupPaymentStatus,
} from "@/types/modules/finance";
import { FINANCE_CONFIG, FINANCE_LABELS } from "@/utils/constants";
import {
  enqueueSync,
  readCache,
  registerReplayHandler,
  useNetworkStatus,
  writeCache,
} from "@/lib/offline";

type ApiError = { response?: { data?: { message?: string } } };

function memberName(group: FinancialGroup, memberId: string): string {
  return group.members?.find((m) => m.id === memberId)?.name ?? "Membre";
}

export function useDeclarePayment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingSync, setPendingSync] = useState(false);
  const online = useNetworkStatus();

  // Gestionnaire de rejeu pour la resynchronisation automatique.
  useEffect(() => {
    return registerReplayHandler(
      FINANCE_CONFIG.SYNC_MODULE,
      "declare_payment",
      async (op) => {
        const { organizationId, groupId, ...payload } = op as {
          organizationId: string;
          groupId: string;
        } & DeclarePaymentPayload;
        return financialGroupsService.declarePayment(
          organizationId,
          groupId,
          payload,
        );
      },
    );
  }, []);

  const declarePayment = async (
    organizationId: string,
    groupId: string,
    payload: DeclarePaymentPayload,
  ): Promise<FinancialGroup | null> => {
    setLoading(true);
    setError(null);
    setPendingSync(false);
    try {
      if (!online) {
        const cacheKey = `${FINANCE_CONFIG.CACHE_KEY_PREFIX}${organizationId}`;
        enqueueSync({
          module: FINANCE_CONFIG.SYNC_MODULE,
          action: "declare_payment",
          payload: { organizationId, groupId, ...payload },
        });

        const cached = readCache<FinancialGroup[]>(cacheKey) ?? [];
        const updated = cached.map((g) => {
          if (g.id !== groupId) return g;
          const confirmed = payload.method === GroupPaymentMethod.MOBILE;
          const payment: GroupPayment = {
            id: `local-${Date.now()}`,
            member_id: payload.member_id,
            member_name: memberName(g, payload.member_id),
            method: payload.method,
            amount: payload.amount,
            paid_for_member_name: payload.paid_for_member_id
              ? memberName(g, payload.paid_for_member_id)
              : null,
            status: confirmed
              ? GroupPaymentStatus.CONFIRMED
              : GroupPaymentStatus.PENDING,
            paid_at: confirmed ? new Date() : null,
          };
          return {
            ...g,
            payments: [...(g.payments ?? []), payment],
            raised_amount: confirmed
              ? g.raised_amount + payload.amount
              : g.raised_amount,
          };
        });
        writeCache(cacheKey, updated, FINANCE_CONFIG.CACHE_TTL_MS);
        setPendingSync(true);
        return null;
      }

      return await financialGroupsService.declarePayment(
        organizationId,
        groupId,
        payload,
      );
    } catch (err: unknown) {
      const message =
        (err as ApiError).response?.data?.message ||
        FINANCE_LABELS.DECLARE_ERROR;
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return { declarePayment, loading, error, pendingSync };
}
