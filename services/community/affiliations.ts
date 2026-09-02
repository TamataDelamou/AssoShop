// services/community/affiliations.ts
import { base44Client } from "@/lib/base44";
import {
  Affiliation,
  LinkAffiliationPayload,
  UpdateAffiliationPayload,
} from "@/types/modules/community";

export const affiliationsService = {
  async getAffiliations(organizationId: string): Promise<Affiliation[]> {
    const response = await base44Client.get(
      `/organizations/${organizationId}/affiliations`,
    );
    return response.data;
  },

  async linkAffiliation(
    organizationId: string,
    payload: LinkAffiliationPayload,
  ): Promise<Affiliation> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/affiliations`,
      payload,
    );
    return response.data;
  },

  async updateAffiliation(
    organizationId: string,
    affiliationId: string,
    payload: UpdateAffiliationPayload,
  ): Promise<Affiliation> {
    const response = await base44Client.patch(
      `/organizations/${organizationId}/affiliations/${affiliationId}`,
      payload,
    );
    return response.data;
  },

  async unlinkAffiliation(
    organizationId: string,
    affiliationId: string,
  ): Promise<void> {
    await base44Client.delete(
      `/organizations/${organizationId}/affiliations/${affiliationId}`,
    );
  },
};
