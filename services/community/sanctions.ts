// services/community/sanctions.ts
import { base44Client } from "@/lib/base44";
import { ApplySanctionPayload, Sanction } from "@/types/modules/community";

export const sanctionsService = {
  async getSanctions(organizationId: string): Promise<Sanction[]> {
    const response = await base44Client.get(
      `/organizations/${organizationId}/sanctions`,
    );
    return response.data;
  },

  async applySanction(
    organizationId: string,
    payload: ApplySanctionPayload,
  ): Promise<Sanction> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/sanctions`,
      payload,
    );
    return response.data;
  },

  async liftSanction(
    organizationId: string,
    sanctionId: string,
  ): Promise<Sanction> {
    const response = await base44Client.patch(
      `/organizations/${organizationId}/sanctions/${sanctionId}`,
      { action: "lift" },
    );
    return response.data;
  },
};
