"use client";

import { useState, useEffect, useCallback } from "react";
import { contributionsService } from "@/services/community/contributions";
import { Contribution } from "@/types/modules/community";
import { CONTRIBUTION_LABELS } from "@/utils/constants";

export function useContributions(
  organizationId: string,
  search = "",
  status = "",
) {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadContributions = useCallback(async (): Promise<Contribution[]> => {
    const data = await contributionsService.getContributions(organizationId, {
      search: search || undefined,
      status: status || undefined,
    });
    return data.map((c) => ({
      ...c,
      due_date: c.due_date ? new Date(c.due_date) : null,
      paid_at: c.paid_at ? new Date(c.paid_at) : null,
    }));
  }, [organizationId, search, status]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const parsed = await loadContributions();
        if (!cancelled) {
          setContributions(parsed);
        }
      } catch (err) {
        if (!cancelled) {
          console.error(CONTRIBUTION_LABELS.LOAD_ERROR, err);
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
  }, [loadContributions]);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const parsed = await loadContributions();
      setContributions(parsed);
    } catch (err) {
      console.error(CONTRIBUTION_LABELS.LOAD_ERROR, err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [loadContributions]);

  return { contributions, loading, error, refetch };
}
