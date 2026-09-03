"use client";

import { useCallback, useState } from "react";
import { assetsService } from "@/services/community/assets";
import {
  Asset,
  AssetStatus,
  CreateAssetPayload,
} from "@/types/modules/community";
import { ASSET_CONFIG } from "@/utils/constants";
import { declareOffline, useOfflineQuery } from "@/lib/offline";

declareOffline({
  module: "assets",
  cacheableReads: [ASSET_CONFIG.CACHE_KEY_PREFIX],
  deferredMutations: [],
});

function parseAsset(asset: Asset): Asset {
  return {
    ...asset,
    acquisition_date: asset.acquisition_date
      ? new Date(asset.acquisition_date)
      : null,
  };
}

export function useAssets(organizationId: string) {
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<Error | null>(null);
  const { data, loading, error: loadError, refresh } = useOfflineQuery<
    Asset[]
  >(
    `${ASSET_CONFIG.CACHE_KEY_PREFIX}${organizationId}`,
    () => assetsService.getAssets(organizationId),
    { ttlMs: ASSET_CONFIG.CACHE_TTL_MS, parse: (list) => list.map(parseAsset) },
  );

  const error = actionError ?? loadError;
  const assets = data ?? [];

  const createAsset = useCallback(
    async (payload: CreateAssetPayload) => {
      setCreating(true);
      setActionError(null);
      try {
        await assetsService.createAsset(organizationId, payload);
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

  const updateStatus = useCallback(
    async (assetId: string, status: AssetStatus) => {
      setBusyId(assetId);
      setActionError(null);
      try {
        await assetsService.updateAssetStatus(organizationId, assetId, status);
        await refresh();
      } catch (err) {
        setActionError(err as Error);
        throw err;
      } finally {
        setBusyId(null);
      }
    },
    [organizationId, refresh],
  );

  const totalValue = assets.reduce(
    (sum, a) => sum + a.acquisition_value * a.quantity,
    0,
  );

  return {
    assets,
    loading,
    creating,
    busyId,
    error,
    totalValue,
    createAsset,
    updateStatus,
  };
}
