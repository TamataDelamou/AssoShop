import { base44Client } from "@/lib/base44";
import {
  CommunityService,
  CreateCommunityServicePayload,
  CreateServiceReviewPayload,
  ServiceReview,
} from "@/types/modules/market";
import { MARKET_MESSAGES } from "@/utils/constants";

export const communityServicesService = {
  async getServices(): Promise<CommunityService[]> {
    const response = await base44Client.get("/market/services");
    return response.data;
  },

  async createService(
    payload: CreateCommunityServicePayload,
  ): Promise<CommunityService> {
    const response = await base44Client.post("/market/services", payload);
    if (!response.data) {
      throw new Error(MARKET_MESSAGES.SERVICE_CREATE_ERROR);
    }
    return response.data;
  },

  async addReview(
    serviceId: string,
    payload: CreateServiceReviewPayload,
  ): Promise<ServiceReview> {
    const response = await base44Client.post(
      `/market/services/${serviceId}/reviews`,
      payload,
    );
    if (!response.data) {
      throw new Error(MARKET_MESSAGES.REVIEW_CREATE_ERROR);
    }
    return response.data;
  },
};
