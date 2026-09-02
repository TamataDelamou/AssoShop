import { base44Client } from "@/lib/base44";
import {
  DeclareClaimPayload,
  EnrollInsurancePayload,
  InsuranceClaim,
  InsuranceEnrollment,
  SolidarityBundle,
} from "@/types/modules/finance";

export const solidarityService = {
  async getSolidarity(organizationId: string): Promise<SolidarityBundle> {
    const response = await base44Client.get(
      `/organizations/${organizationId}/solidarity`,
    );
    return response.data;
  },

  async enrollInsurance(
    organizationId: string,
    payload: EnrollInsurancePayload,
  ): Promise<InsuranceEnrollment> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/solidarity/enrollments`,
      payload,
    );
    return response.data;
  },

  async declareClaim(
    organizationId: string,
    payload: DeclareClaimPayload,
  ): Promise<InsuranceClaim> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/solidarity/claims`,
      payload,
    );
    return response.data;
  },

  async decideClaim(
    organizationId: string,
    claimId: string,
    approved: boolean,
  ): Promise<InsuranceClaim> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/solidarity/claims/${claimId}/decision`,
      { approved },
    );
    return response.data;
  },
};
