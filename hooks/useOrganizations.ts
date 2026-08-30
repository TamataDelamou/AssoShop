"use client";

import { useEffect, useState, useCallback } from "react";
import { base44Client } from "@/lib/base44";
import { Organization } from "@/types/modules/community";
import { ORGANIZATION_LABELS } from "@/utils/constants";

export function useOrganizations(search = "") {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadOrganizations = useCallback(async (): Promise<Organization[]> => {
    const params: { search?: string } = {};
    if (search) params.search = search;

    const response = await base44Client.get<Organization[]>("/organizations", {
      params,
    });
    const data = response.data;

    // Transformation des dates (si présentes)
    return Array.isArray(data)
      ? data.map((org) => ({
          ...org,
          created_at: org.created_at ? new Date(org.created_at) : null,
          updated_at: org.updated_at ? new Date(org.updated_at) : null,
        }))
      : data;
  }, [search]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const parsed = await loadOrganizations();
        if (!cancelled) {
          setOrganizations(parsed);
        }
      } catch (err) {
        if (!cancelled) {
          console.error(ORGANIZATION_LABELS.CREATE_ERROR, err);
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
  }, [loadOrganizations]);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const parsed = await loadOrganizations();
      setOrganizations(parsed);
    } catch (err) {
      console.error(ORGANIZATION_LABELS.CREATE_ERROR, err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [loadOrganizations]);

  return { organizations, loading, error, refetch };
}
