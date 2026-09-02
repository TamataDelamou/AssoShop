// services/community/beneficiaries.ts
import { base44Client } from "@/lib/base44";
import {
  Beneficiary,
  BeneficiaryStatus,
  CreateBeneficiaryPayload,
  CreateEvaluationPayload,
  ProjectEvaluation,
} from "@/types/modules/community";

export const beneficiariesService = {
  async getBeneficiaries(organizationId: string): Promise<Beneficiary[]> {
    const response = await base44Client.get(
      `/organizations/${organizationId}/beneficiaries`,
    );
    return response.data;
  },

  async createBeneficiary(
    organizationId: string,
    payload: CreateBeneficiaryPayload,
  ): Promise<Beneficiary> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/beneficiaries`,
      payload,
    );
    return response.data;
  },

  async updateBeneficiaryStatus(
    organizationId: string,
    beneficiaryId: string,
    status: BeneficiaryStatus,
  ): Promise<Beneficiary> {
    const response = await base44Client.patch(
      `/organizations/${organizationId}/beneficiaries/${beneficiaryId}`,
      { status },
    );
    return response.data;
  },

  async getEvaluations(organizationId: string): Promise<ProjectEvaluation[]> {
    const response = await base44Client.get(
      `/organizations/${organizationId}/evaluations`,
    );
    return response.data;
  },

  async createEvaluation(
    organizationId: string,
    payload: CreateEvaluationPayload,
  ): Promise<ProjectEvaluation> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/evaluations`,
      payload,
    );
    return response.data;
  },
};
