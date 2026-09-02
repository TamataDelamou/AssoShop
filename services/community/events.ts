// services/community/events.ts
import { base44Client } from "@/lib/base44";
import { CommunityEvent, CreateEventPayload } from "@/types/modules/community";

export const eventsService = {
  async getEvents(organizationId: string): Promise<CommunityEvent[]> {
    const response = await base44Client.get(
      `/organizations/${organizationId}/events`,
    );
    return response.data;
  },

  async createEvent(
    organizationId: string,
    payload: CreateEventPayload,
  ): Promise<CommunityEvent> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/events`,
      payload,
    );
    return response.data;
  },
};
