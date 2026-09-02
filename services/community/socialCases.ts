import { base44Client } from "@/lib/base44";
import {
  ContributeSocialCasePayload,
  CreateSocialCasePayload,
  SocialCase,
  ValidateSocialCasePayload,
} from "@/types/modules/community";

interface GetSocialCasesParams {
  search?: string;
  status?: string;
}

export const socialCasesService = {
  async getSocialCases(
    organizationId: string,
    params: GetSocialCasesParams = {},
  ): Promise<SocialCase[]> {
    const response = await base44Client.get(
      `/organizations/${organizationId}/social-cases`,
      { params },
    );
    return response.data;
  },

  async createSocialCase(
    organizationId: string,
    payload: CreateSocialCasePayload,
  ): Promise<SocialCase> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/social-cases`,
      payload,
    );
    return response.data;
  },

  async validateSocialCase(
    organizationId: string,
    socialCaseId: string,
    payload: ValidateSocialCasePayload,
  ): Promise<SocialCase> {
    const response = await base44Client.patch(
      `/organizations/${organizationId}/social-cases/${socialCaseId}`,
      { action: payload.decision, committee_note: payload.committee_note },
    );
    return response.data;
  },

  async disburseSocialCase(
    organizationId: string,
    socialCaseId: string,
  ): Promise<SocialCase> {
    const response = await base44Client.patch(
      `/organizations/${organizationId}/social-cases/${socialCaseId}`,
      { action: "disburse" },
    );
    return response.data;
  },

  async contributeSocialCase(
    organizationId: string,
    socialCaseId: string,
    payload: ContributeSocialCasePayload,
  ): Promise<SocialCase> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/social-cases/${socialCaseId}/contributions`,
      payload,
    );
    return response.data;
  },
};
