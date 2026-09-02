// services/community/memberProfiles.ts
import { base44Client } from "@/lib/base44";
import { MemberProfile } from "@/types/modules/community";

export const memberProfilesService = {
  async getProfile(
    organizationId: string,
    memberId: string,
  ): Promise<MemberProfile> {
    const response = await base44Client.get(
      `/organizations/${organizationId}/members/${memberId}/profile`,
    );
    return response.data;
  },
};
