// services/community/governance.ts
import { base44Client } from "@/lib/base44";
import {
  CastVotePayload,
  DeclareCandidacyPayload,
  Election,
  Mandate,
} from "@/types/modules/community";

export const governanceService = {
  async getElections(organizationId: string): Promise<Election[]> {
    const response = await base44Client.get(
      `/organizations/${organizationId}/elections`,
    );
    return response.data;
  },

  async declareCandidacy(
    organizationId: string,
    electionId: string,
    payload: DeclareCandidacyPayload,
  ): Promise<Election> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/elections/${electionId}/candidates`,
      payload,
    );
    return response.data;
  },

  async castVote(
    organizationId: string,
    electionId: string,
    payload: CastVotePayload,
  ): Promise<Election> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/elections/${electionId}/votes`,
      payload,
    );
    return response.data;
  },

  async closeElection(
    organizationId: string,
    electionId: string,
  ): Promise<Election> {
    const response = await base44Client.patch(
      `/organizations/${organizationId}/elections/${electionId}`,
      { action: "close" },
    );
    return response.data;
  },

  async getMandates(organizationId: string): Promise<Mandate[]> {
    const response = await base44Client.get(
      `/organizations/${organizationId}/mandates`,
    );
    return response.data;
  },
};
