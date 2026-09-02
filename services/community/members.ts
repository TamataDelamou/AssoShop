// services/community/members.ts
import { base44Client } from "@/lib/base44";
import {
  Member,
  CreateMemberPayload,
  SubmitAdhesionPayload,
} from "@/types/modules/community";

export const membersService = {
  async getMembers(organizationId: string, search?: string): Promise<Member[]> {
    const params: { search?: string } = {};
    if (search) params.search = search;
    const response = await base44Client.get(
      `/organizations/${organizationId}/members`,
      { params },
    );
    return response.data;
  },

  async addMember(
    organizationId: string,
    payload: CreateMemberPayload,
  ): Promise<Member> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/members`,
      payload,
    );
    return response.data;
  },

  async updateMember(
    organizationId: string,
    memberId: string,
    payload: { status?: string; role?: string },
  ): Promise<Member> {
    const response = await base44Client.patch(
      `/organizations/${organizationId}/members/${memberId}`,
      payload,
    );
    return response.data;
  },

  async removeMember(organizationId: string, memberId: string): Promise<void> {
    await base44Client.delete(
      `/organizations/${organizationId}/members/${memberId}`,
    );
  },

  async getAdhesionRequests(organizationId: string): Promise<Member[]> {
    const response = await base44Client.get(
      `/organizations/${organizationId}/adhesions`,
    );
    return response.data;
  },

  async submitAdhesionRequest(
    organizationId: string,
    payload: SubmitAdhesionPayload,
  ): Promise<Member> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/adhesions`,
      payload,
    );
    return response.data;
  },
};
