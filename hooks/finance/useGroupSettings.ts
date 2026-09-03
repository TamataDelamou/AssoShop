"use client";

import { useCallback, useState } from "react";
import { financialGroupsService } from "@/services/finance/financialGroups";
import {
  GroupSettings,
  UpdateGroupSettingsPayload,
} from "@/types/modules/finance";
import { FINANCE_CONFIG } from "@/utils/constants";
import { useOfflineQuery } from "@/lib/offline";

export function useGroupSettings(
  organizationId: string,
  groupId: string | null,
) {
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<Error | null>(null);
  const { data, loading, error: loadError, refresh } =
    useOfflineQuery<GroupSettings>(
      `${FINANCE_CONFIG.CACHE_KEY_PREFIX}${organizationId}:${groupId ?? "null"}:settings`,
      () =>
        financialGroupsService.getGroupSettings(
          organizationId,
          groupId as string,
        ),
      { ttlMs: FINANCE_CONFIG.CACHE_TTL_MS, enabled: groupId !== null },
    );

  const error = actionError ?? loadError;

  const update = useCallback(
    async (payload: UpdateGroupSettingsPayload) => {
      if (!groupId) throw new Error("Groupe requis.");
      setSaving(true);
      setActionError(null);
      try {
        const result = await financialGroupsService.updateGroupSettings(
          organizationId,
          groupId,
          payload,
        );
        await refresh();
        return result;
      } catch (err) {
        setActionError(err as Error);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [organizationId, groupId, refresh],
  );

  return { settings: data, loading, saving, error, update };
}
