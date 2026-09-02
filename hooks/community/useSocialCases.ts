"use client";

import { useState, useEffect, useCallback } from "react";
import { socialCasesService } from "@/services/community/socialCases";
import { SocialCase } from "@/types/modules/community";
import { SOCIAL_CASE_LABELS } from "@/utils/constants";

export function useSocialCases(
  organizationId: string,
  search = "",
  status = "",
) {
  const [socialCases, setSocialCases] = useState<SocialCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadSocialCases = useCallback(async (): Promise<SocialCase[]> => {
    const data = await socialCasesService.getSocialCases(organizationId, {
      search: search || undefined,
      status: status || undefined,
    });
    return data.map((c) => ({
      ...c,
      created_at: c.created_at ? new Date(c.created_at) : null,
      disbursed_at: c.disbursed_at ? new Date(c.disbursed_at) : null,
      contributors: c.contributors?.map((contributor) => ({
        ...contributor,
        contributed_at: contributor.contributed_at
          ? new Date(contributor.contributed_at)
          : null,
      })),
    }));
  }, [organizationId, search, status]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const parsed = await loadSocialCases();
        if (!cancelled) {
          setSocialCases(parsed);
        }
      } catch (err) {
        if (!cancelled) {
          console.error(SOCIAL_CASE_LABELS.LOAD_ERROR, err);
          setError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadSocialCases]);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const parsed = await loadSocialCases();
      setSocialCases(parsed);
    } catch (err) {
      console.error(SOCIAL_CASE_LABELS.LOAD_ERROR, err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [loadSocialCases]);

  return { socialCases, loading, error, refetch };
}
