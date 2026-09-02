"use client";

import { useState, useEffect, useCallback } from "react";
import { antennasService } from "@/services/community/antennas";
import { organizationsService } from "@/services/community/organizations";
import {
  Antenna,
  CreateAntennaPayload,
  Organization,
} from "@/types/modules/community";

function parseAntenna(a: Antenna): Antenna {
  return { ...a, created_at: a.created_at ? new Date(a.created_at) : null };
}

export function useAntennas(organizationId: string) {
  const [antennas, setAntennas] = useState<Antenna[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    const [antennasData, orgData] = await Promise.all([
      antennasService.getAntennas(organizationId),
      organizationsService.getOrganization(organizationId),
    ]);
    return { antennas: antennasData.map(parseAntenna), organization: orgData };
  }, [organizationId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await load();
        if (!cancelled) {
          setAntennas(data.antennas);
          setOrganization(data.organization);
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
  }, [load]);

  const refetch = useCallback(async () => {
    try {
      const data = await load();
      setAntennas(data.antennas);
      setOrganization(data.organization);
    } catch (err) {
      setError(err as Error);
    }
  }, [load]);

  const createAntenna = useCallback(
    async (payload: CreateAntennaPayload) => {
      setCreating(true);
      setError(null);
      try {
        await antennasService.createAntenna(organizationId, payload);
        await refetch();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setCreating(false);
      }
    },
    [organizationId, refetch],
  );

  return {
    antennas,
    organization,
    loading,
    creating,
    error,
    createAntenna,
  };
}
