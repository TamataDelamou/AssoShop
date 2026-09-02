import { base44Client } from "@/lib/base44";
import {
  CreateSponsorshipRequestPayload,
  RespondSponsorshipPayload,
  SponsorshipBundle,
  SponsorshipRequest,
} from "@/types/modules/finance";

export const sponsorshipService = {
  async getSponsorship(organizationId: string): Promise<SponsorshipBundle> {
    const response = await base44Client.get(
      `/organizations/${organizationId}/sponsorship`,
    );
    return response.data;
  },

  async createRequest(
    organizationId: string,
    payload: CreateSponsorshipRequestPayload,
  ): Promise<SponsorshipRequest> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/sponsorship/requests`,
      payload,
    );
    return response.data;
  },

  async respond(
    organizationId: string,
    requestId: string,
    payload: RespondSponsorshipPayload,
  ): Promise<SponsorshipRequest> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/sponsorship/requests/${requestId}/respond`,
      payload,
    );
    return response.data;
  },

  async confirm(
    organizationId: string,
    requestId: string,
  ): Promise<SponsorshipRequest> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/sponsorship/requests/${requestId}/confirm`,
    );
    return response.data;
  },
};
