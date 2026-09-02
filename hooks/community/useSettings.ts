"use client";

import { useState, useEffect, useCallback } from "react";
import { settingsService } from "@/services/community/settings";
import { membersService } from "@/services/community/members";
import {
  Member,
  MemberRole,
  OrganizationSettings,
} from "@/types/modules/community";

export function useSettings(organizationId: string) {
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [draft, setDraft] = useState<OrganizationSettings | null>(null);
  const [officeHolders, setOfficeHolders] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [settingsData, membersData] = await Promise.all([
          settingsService.getSettings(organizationId),
          membersService.getMembers(organizationId),
        ]);
        if (!cancelled) {
          setSettings(settingsData);
          setDraft(settingsData);
          setOfficeHolders(
            membersData.filter((m) => m.role !== MemberRole.MEMBER),
          );
        }
      } catch (err) {
        if (!cancelled) setError(err as Error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  const save = useCallback(async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await settingsService.updateSettings(organizationId, {
        confidentiality: draft.confidentiality,
        membership: draft.membership,
      });
      setSettings(updated);
      setDraft(updated);
    } catch (err) {
      setError(err as Error);
    } finally {
      setSaving(false);
    }
  }, [organizationId, draft]);

  return {
    settings,
    draft,
    setDraft,
    officeHolders,
    loading,
    saving,
    error,
    save,
  };
}
