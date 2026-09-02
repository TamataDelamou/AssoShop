// services/community/hr.ts
import { base44Client } from "@/lib/base44";
import {
  AttendanceRecord,
  CreateLeavePayload,
  CreateStaffEvaluationPayload,
  CreateStaffPayload,
  LeaveRequest,
  LeaveStatus,
  StaffEvaluation,
  StaffMember,
  StaffStatus,
} from "@/types/modules/community";

export const hrService = {
  async getStaff(organizationId: string): Promise<StaffMember[]> {
    const response = await base44Client.get(
      `/organizations/${organizationId}/staff`,
    );
    return response.data;
  },

  async createStaff(
    organizationId: string,
    payload: CreateStaffPayload,
  ): Promise<StaffMember> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/staff`,
      payload,
    );
    return response.data;
  },

  async updateStaffStatus(
    organizationId: string,
    staffId: string,
    status: StaffStatus,
  ): Promise<StaffMember> {
    const response = await base44Client.patch(
      `/organizations/${organizationId}/staff/${staffId}`,
      { status },
    );
    return response.data;
  },

  async getLeaves(organizationId: string): Promise<LeaveRequest[]> {
    const response = await base44Client.get(
      `/organizations/${organizationId}/leaves`,
    );
    return response.data;
  },

  async createLeave(
    organizationId: string,
    payload: CreateLeavePayload,
  ): Promise<LeaveRequest> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/leaves`,
      payload,
    );
    return response.data;
  },

  async updateLeaveStatus(
    organizationId: string,
    leaveId: string,
    status: LeaveStatus,
  ): Promise<LeaveRequest> {
    const response = await base44Client.patch(
      `/organizations/${organizationId}/leaves/${leaveId}`,
      { status },
    );
    return response.data;
  },

  async getAttendance(
    organizationId: string,
    date?: string,
  ): Promise<AttendanceRecord[]> {
    const response = await base44Client.get(
      `/organizations/${organizationId}/attendance`,
      { params: date ? { date } : {} },
    );
    return response.data;
  },

  async updateAttendance(
    organizationId: string,
    attendanceId: string,
    present: boolean,
  ): Promise<AttendanceRecord> {
    const response = await base44Client.patch(
      `/organizations/${organizationId}/attendance/${attendanceId}`,
      { present },
    );
    return response.data;
  },

  async getEvaluations(organizationId: string): Promise<StaffEvaluation[]> {
    const response = await base44Client.get(
      `/organizations/${organizationId}/staff-evaluations`,
    );
    return response.data;
  },

  async createEvaluation(
    organizationId: string,
    payload: CreateStaffEvaluationPayload,
  ): Promise<StaffEvaluation> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/staff-evaluations`,
      payload,
    );
    return response.data;
  },
};
