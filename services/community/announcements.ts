import { base44Client } from "@/lib/base44";
import {
  Announcement,
  PublishAnnouncementPayload,
} from "@/types/modules/community";

interface GetAnnouncementsParams {
  search?: string;
}

export const announcementsService = {
  async getAnnouncements(
    organizationId: string,
    params: GetAnnouncementsParams = {},
  ): Promise<Announcement[]> {
    const response = await base44Client.get(
      `/organizations/${organizationId}/announcements`,
      { params },
    );
    return response.data;
  },

  async publishAnnouncement(
    organizationId: string,
    payload: PublishAnnouncementPayload,
  ): Promise<Announcement> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/announcements`,
      payload,
    );
    return response.data;
  },
};
