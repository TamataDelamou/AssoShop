// services/community/sharedMemberships.ts
import { base44Client } from "@/lib/base44";
import {
  CreateSharedMembershipPayload,
  SharedMembershipRequest,
} from "@/types/modules/community";

export const sharedMembershipsService = {
  async getSharedMemberships(
    organizationId: string,
  ): Promise<SharedMembershipRequest[]> {
    const response = await base44Client.get(
      `/organizations/${organizationId}/shared-memberships`,
    );
    return response.data;
  },

  async createSharedMembership(
    organizationId: string,
    payload: CreateSharedMembershipPayload,
  ): Promise<SharedMembershipRequest> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/shared-memberships`,
      payload,
    );
    return response.data;
  },

  async approveSharedMembership(
    organizationId: string,
    sharedMembershipId: string,
  ): Promise<SharedMembershipRequest> {
    const response = await base44Client.patch(
      `/organizations/${organizationId}/shared-memberships/${sharedMembershipId}/approve`,
      {},
    );
    return response.data;
  },

  async rejectSharedMembership(
    organizationId: string,
    sharedMembershipId: string,
  ): Promise<SharedMembershipRequest> {
    const response = await base44Client.patch(
      `/organizations/${organizationId}/shared-memberships/${sharedMembershipId}/reject`,
      {},
    );
    return response.data;
  },
};
