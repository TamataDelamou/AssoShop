import { base44Client } from "@/lib/base44";
import {
  CheckInAttendeePayload,
  Meeting,
  PlanMeetingPayload,
  SaveMinutesPayload,
} from "@/types/modules/community";

interface GetMeetingsParams {
  search?: string;
  status?: string;
}

export const meetingsService = {
  async getMeetings(
    organizationId: string,
    params: GetMeetingsParams = {},
  ): Promise<Meeting[]> {
    const response = await base44Client.get(
      `/organizations/${organizationId}/meetings`,
      { params },
    );
    return response.data;
  },

  async planMeeting(
    organizationId: string,
    payload: PlanMeetingPayload,
  ): Promise<Meeting> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/meetings`,
      payload,
    );
    return response.data;
  },

  async saveMinutes(
    organizationId: string,
    meetingId: string,
    payload: SaveMinutesPayload,
  ): Promise<Meeting> {
    const response = await base44Client.patch(
      `/organizations/${organizationId}/meetings/${meetingId}`,
      { action: "save-minutes", minutes: payload.minutes },
    );
    return response.data;
  },

  async checkInAttendee(
    organizationId: string,
    meetingId: string,
    payload: CheckInAttendeePayload,
  ): Promise<Meeting> {
    const response = await base44Client.patch(
      `/organizations/${organizationId}/meetings/${meetingId}/attendees/${payload.attendee_id}`,
      { status: payload.status },
    );
    return response.data;
  },
};
