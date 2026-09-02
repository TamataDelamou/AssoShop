// services/community/antennas.ts
import { base44Client } from "@/lib/base44";
import { Antenna, CreateAntennaPayload } from "@/types/modules/community";

export const antennasService = {
  async getAntennas(organizationId: string): Promise<Antenna[]> {
    const response = await base44Client.get(
      `/organizations/${organizationId}/antennas`,
    );
    return response.data;
  },

  async createAntenna(
    organizationId: string,
    payload: CreateAntennaPayload,
  ): Promise<Antenna> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/antennas`,
      payload,
    );
    return response.data;
  },
};
