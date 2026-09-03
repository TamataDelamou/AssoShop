"use client";

import { useCallback, useState } from "react";
import { antennasService } from "@/services/community/antennas";
import { organizationsService } from "@/services/community/organizations";
import {
  Antenna,
  CreateAntennaPayload,
  Organization,
} from "@/types/modules/community";
import { ANTENNA_CONFIG } from "@/utils/constants";
import { declareOffline, useOfflineQuery } from "@/lib/offline";

declareOffline({
  module: "antennas",
  cacheableReads: [ANTENNA_CONFIG.CACHE_KEY_PREFIX],
  deferredMutations: [],
});

function parseAntenna(a: Antenna): Antenna {
  return { ...a, created_at: a.created_at ? new Date(a.created_at) : null };
}

interface AntennasBundle {
  antennas: Antenna[];
  organization: Organization;
}

export function useAntennas(organizationId: string) {
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<Error | null>(null);
  const { data, loading, error: loadError, refresh } =
    useOfflineQuery<AntennasBundle>(
      `${ANTENNA_CONFIG.CACHE_KEY_PREFIX}${organizationId}`,
      async () => {
        const [antennas, organization] = await Promise.all([
          antennasService.getAntennas(organizationId),
          organizationsService.getOrganization(organizationId),
        ]);
        return { antennas, organization };
      },
      {
        ttlMs: ANTENNA_CONFIG.CACHE_TTL_MS,
        parse: (bundle) => ({
          antennas: bundle.antennas.map(parseAntenna),
          organization: bundle.organization,
        }),
      },
    );

  const error = actionError ?? loadError;

  const createAntenna = useCallback(
    async (payload: CreateAntennaPayload) => {
      setCreating(true);
      setActionError(null);
      try {
        await antennasService.createAntenna(organizationId, payload);
        await refresh();
      } catch (err) {
        setActionError(err as Error);
        throw err;
      } finally {
        setCreating(false);
      }
    },
    [organizationId, refresh],
  );

  return {
    antennas: data?.antennas ?? [],
    organization: data?.organization ?? null,
    loading,
    creating,
    error,
    createAntenna,
  };
}
