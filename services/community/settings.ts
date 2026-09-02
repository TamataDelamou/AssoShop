// services/community/settings.ts
import { base44Client } from "@/lib/base44";
import {
  OrganizationSettings,
  UpdateOrganizationSettingsPayload,
} from "@/types/modules/community";

export const settingsService = {
  async getSettings(organizationId: string): Promise<OrganizationSettings> {
    const response = await base44Client.get(
      `/organizations/${organizationId}/settings`,
    );
    return response.data;
  },

  async updateSettings(
    organizationId: string,
    payload: UpdateOrganizationSettingsPayload,
  ): Promise<OrganizationSettings> {
    const response = await base44Client.patch(
      `/organizations/${organizationId}/settings`,
      payload,
    );
    return response.data;
  },
};
