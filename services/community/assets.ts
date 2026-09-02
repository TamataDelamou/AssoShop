// services/community/assets.ts
import { base44Client } from "@/lib/base44";
import {
  Asset,
  AssetStatus,
  CreateAssetPayload,
} from "@/types/modules/community";

export const assetsService = {
  async getAssets(organizationId: string): Promise<Asset[]> {
    const response = await base44Client.get(
      `/organizations/${organizationId}/assets`,
    );
    return response.data;
  },

  async createAsset(
    organizationId: string,
    payload: CreateAssetPayload,
  ): Promise<Asset> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/assets`,
      payload,
    );
    return response.data;
  },

  async updateAssetStatus(
    organizationId: string,
    assetId: string,
    status: AssetStatus,
  ): Promise<Asset> {
    const response = await base44Client.patch(
      `/organizations/${organizationId}/assets/${assetId}`,
      { status },
    );
    return response.data;
  },
};
