// services/community/organizations.ts
import { base44Client } from "@/lib/base44";
import { Organization } from "@/types/modules/community";

export const organizationsService = {
  async getOrganizations(): Promise<Organization[]> {
    const response = await base44Client.get("/organizations");
    return response.data;
  },

  async getOrganization(id: string): Promise<Organization> {
    const response = await base44Client.get(`/organizations/${id}`);
    return response.data;
  },
};
