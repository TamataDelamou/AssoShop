"use client";

import { useCallback, useEffect, useState } from "react";
import { financialGroupsService } from "@/services/finance/financialGroups";
import {
  GroupSettings,
  UpdateGroupSettingsPayload,
} from "@/types/modules/finance";

export function useGroupSettings(
  organizationId: string,
  groupId: string | null,
) {
  const [settings, setSettings] = useState<GroupSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!groupId) return;
    let cancelled = false;

    (async () => {
      try {
        const data = await financialGroupsService.getGroupSettings(
          organizationId,
          groupId,
        );
        if (!cancelled) setSettings(data);
      } catch (err) {
        if (!cancelled) setError(err as Error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [organizationId, groupId]);

  const update = useCallback(
    async (payload: UpdateGroupSettingsPayload) => {
      if (!groupId) throw new Error("Groupe requis.");
      setSaving(true);
      setError(null);
      try {
        const result = await financialGroupsService.updateGroupSettings(
          organizationId,
          groupId,
          payload,
        );
        setSettings(result);
        return result;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [organizationId, groupId],
  );

  return { settings, loading, saving, error, update };
}
