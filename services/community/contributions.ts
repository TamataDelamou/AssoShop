import { base44Client } from "@/lib/base44";
import {
  Contribution,
  PayContributionPayload,
  ValidateContributionPayload,
} from "@/types/modules/community";

interface GetContributionsParams {
  search?: string;
  status?: string;
}

export const contributionsService = {
  async getContributions(
    organizationId: string,
    params: GetContributionsParams = {},
  ): Promise<Contribution[]> {
    const response = await base44Client.get(
      `/organizations/${organizationId}/contributions`,
      { params },
    );
    return response.data;
  },

  async payContribution(
    organizationId: string,
    payload: PayContributionPayload,
  ): Promise<Contribution> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/contributions`,
      payload,
    );
    return response.data;
  },

  async validateContribution(
    organizationId: string,
    contributionId: string,
    payload: ValidateContributionPayload,
  ): Promise<Contribution> {
    const response = await base44Client.patch(
      `/organizations/${organizationId}/contributions/${contributionId}`,
      payload,
    );
    return response.data;
  },
};
