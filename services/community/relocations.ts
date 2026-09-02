// services/community/relocations.ts
import { base44Client } from "@/lib/base44";
import {
  CreateRelocationPayload,
  MemberRelocation,
} from "@/types/modules/community";

export const relocationsService = {
  async getRelocations(organizationId: string): Promise<MemberRelocation[]> {
    const response = await base44Client.get(
      `/organizations/${organizationId}/relocations`,
    );
    return response.data;
  },

  async createRelocation(
    organizationId: string,
    payload: CreateRelocationPayload,
  ): Promise<MemberRelocation> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/relocations`,
      payload,
    );
    return response.data;
  },

  async confirmRelocation(
    organizationId: string,
    relocationId: string,
  ): Promise<MemberRelocation> {
    const response = await base44Client.patch(
      `/organizations/${organizationId}/relocations/${relocationId}/confirm`,
      {},
    );
    return response.data;
  },
};
