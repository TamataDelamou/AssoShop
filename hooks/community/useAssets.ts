"use client";

import { useState, useEffect, useCallback } from "react";
import { assetsService } from "@/services/community/assets";
import {
  Asset,
  AssetStatus,
  CreateAssetPayload,
} from "@/types/modules/community";

function parseAsset(asset: Asset): Asset {
  return {
    ...asset,
    acquisition_date: asset.acquisition_date
      ? new Date(asset.acquisition_date)
      : null,
  };
}

export function useAssets(organizationId: string) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    const data = await assetsService.getAssets(organizationId);
    return data.map(parseAsset);
  }, [organizationId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await load();
        if (!cancelled) setAssets(data);
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
      setAssets(await load());
    } catch (err) {
      setError(err as Error);
    }
  }, [load]);

  const createAsset = useCallback(
    async (payload: CreateAssetPayload) => {
      setCreating(true);
      setError(null);
      try {
        await assetsService.createAsset(organizationId, payload);
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

  const updateStatus = useCallback(
    async (assetId: string, status: AssetStatus) => {
      setBusyId(assetId);
      setError(null);
      try {
        await assetsService.updateAssetStatus(organizationId, assetId, status);
        await refetch();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setBusyId(null);
      }
    },
    [organizationId, refetch],
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
