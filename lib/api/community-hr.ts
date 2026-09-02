import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AttendanceRecord,
  LeaveRequest,
  StaffEvaluation,
  StaffMember,
} from "@/types/modules/community";

interface StaffRow {
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  type: string;
  position: string;
  contract_type: string;
  status: string;
  monthly_salary: number | string;
  hire_date: string | null;
}

interface LeaveRow {
  id: string;
  organization_id: string;
  staff_id: string;
  reason: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
}

interface AttendanceRow {
  id: string;
  organization_id: string;
  staff_id: string;
  date: string | null;
  present: boolean;
}

interface EvaluationRow {
  id: string;
  organization_id: string;
  staff_id: string;
  period: string;
  rating: number | string;
  comments: string;
  evaluated_at: string | null;
}

const STAFF_COLUMNS = [
  "id",
  "organization_id",
  "first_name",
  "last_name",
  "type",
  "position",
  "contract_type",
  "status",
  "monthly_salary",
  "hire_date",
].join(", ");

const LEAVE_COLUMNS = [
  "id",
  "organization_id",
  "staff_id",
  "reason",
  "start_date",
  "end_date",
  "status",
].join(", ");

const ATTENDANCE_COLUMNS = [
  "id",
  "organization_id",
  "staff_id",
  "date",
  "present",
].join(", ");

const EVALUATION_COLUMNS = [
  "id",
  "organization_id",
  "staff_id",
  "period",
  "rating",
  "comments",
  "evaluated_at",
].join(", ");

export function serializeStaff(row: StaffRow): StaffMember {
  return {
    id: row.id,
    organization_id: row.organization_id,
    first_name: row.first_name,
    last_name: row.last_name,
    type: row.type as StaffMember["type"],
    position: row.position,
    contract_type: row.contract_type as StaffMember["contract_type"],
    status: row.status as StaffMember["status"],
    monthly_salary: Number(row.monthly_salary),
    hire_date: row.hire_date ? new Date(row.hire_date) : null,
  };
}

function serializeLeave(row: LeaveRow): LeaveRequest {
  return {
    id: row.id,
    organization_id: row.organization_id,
    staff_id: row.staff_id,
    reason: row.reason,
    start_date: row.start_date ? new Date(row.start_date) : null,
    end_date: row.end_date ? new Date(row.end_date) : null,
    status: row.status as LeaveRequest["status"],
  };
}

function serializeAttendance(row: AttendanceRow): AttendanceRecord {
  return {
    id: row.id,
    organization_id: row.organization_id,
    staff_id: row.staff_id,
    date: row.date ? new Date(row.date) : null,
    present: row.present,
  };
}

function serializeEvaluation(row: EvaluationRow): StaffEvaluation {
  return {
    id: row.id,
    organization_id: row.organization_id,
    staff_id: row.staff_id,
    period: row.period,
    rating: Number(row.rating),
    comments: row.comments,
    evaluated_at: row.evaluated_at ? new Date(row.evaluated_at) : null,
  };
}

export async function listStaff(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<StaffMember[]> {
  const { data, error } = await supabase
    .from("staff")
    .select(STAFF_COLUMNS)
    .eq("organization_id", organizationId)
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as unknown as StaffRow[]).map(serializeStaff);
}

export async function createStaff(
  supabase: SupabaseClient,
  organizationId: string,
  payload: {
    first_name: string;
    last_name: string;
    type: string;
    position: string;
    contract_type: string;
    monthly_salary: number;
    hire_date?: string;
  },
): Promise<StaffMember> {
  const { data, error } = await supabase
    .from("staff")
    .insert({
      organization_id: organizationId,
      first_name: payload.first_name,
      last_name: payload.last_name,
      type: payload.type,
      position: payload.position,
      contract_type: payload.contract_type,
      status: "active",
      monthly_salary: payload.monthly_salary,
      hire_date: payload.hire_date
        ? new Date(`${payload.hire_date}T00:00:00.000Z`).toISOString()
        : null,
    })
    .select(STAFF_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return serializeStaff(data as unknown as StaffRow);
}

export async function updateStaffStatus(
  supabase: SupabaseClient,
  staffId: string,
  status: string,
): Promise<StaffMember | null> {
  const { data, error } = await supabase
    .from("staff")
    .update({ status })
    .eq("id", staffId)
    .select(STAFF_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? serializeStaff(data as unknown as StaffRow) : null;
}

export async function listLeaves(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<LeaveRequest[]> {
  const { data, error } = await supabase
    .from("leaves")
    .select(LEAVE_COLUMNS)
    .eq("organization_id", organizationId)
    .order("start_date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as unknown as LeaveRow[]).map(serializeLeave);
}

export async function createLeave(
  supabase: SupabaseClient,
  organizationId: string,
  payload: {
    staff_id: string;
    reason: string;
    start_date: string;
    end_date: string;
  },
): Promise<LeaveRequest> {
  const { data, error } = await supabase
    .from("leaves")
    .insert({
      organization_id: organizationId,
      staff_id: payload.staff_id,
      reason: payload.reason,
      start_date: new Date(payload.start_date).toISOString(),
      end_date: new Date(payload.end_date).toISOString(),
      status: "pending",
    })
    .select(LEAVE_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return serializeLeave(data as unknown as LeaveRow);
}

export async function updateLeaveStatus(
  supabase: SupabaseClient,
  leaveId: string,
  status: string,
): Promise<LeaveRequest | null> {
  const { data, error } = await supabase
    .from("leaves")
    .update({ status })
    .eq("id", leaveId)
    .select(LEAVE_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? serializeLeave(data as unknown as LeaveRow) : null;
}

export async function getAttendance(
  supabase: SupabaseClient,
  organizationId: string,
  dateParam: string | null,
): Promise<AttendanceRecord[]> {
  const dayStart = dateParam
    ? new Date(`${dateParam}T00:00:00.000Z`)
    : new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);

  const { data: existing, error } = await supabase
    .from("attendance")
    .select(ATTENDANCE_COLUMNS)
    .eq("organization_id", organizationId)
    .gte("date", dayStart.toISOString())
    .lt("date", dayEnd.toISOString());
  if (error) throw new Error(error.message);

  if ((existing as unknown as AttendanceRow[]).length === 0) {
    const { data: staff } = await supabase
      .from("staff")
      .select("id")
      .eq("organization_id", organizationId);
    if (staff && staff.length > 0) {
      const rows = (staff as { id: string }[]).map((s) => ({
        organization_id: organizationId,
        staff_id: s.id,
        date: dayStart.toISOString(),
        present: false,
      }));
      const { error: insertError } = await supabase
        .from("attendance")
        .insert(rows);
      if (insertError) throw new Error(insertError.message);

      const { data: fresh, error: refreshError } = await supabase
        .from("attendance")
        .select(ATTENDANCE_COLUMNS)
        .eq("organization_id", organizationId)
        .gte("date", dayStart.toISOString())
        .lt("date", dayEnd.toISOString());
      if (refreshError) throw new Error(refreshError.message);
      return (fresh as unknown as AttendanceRow[]).map(serializeAttendance);
    }
  }

  return (existing as unknown as AttendanceRow[]).map(serializeAttendance);
}

export async function updateAttendance(
  supabase: SupabaseClient,
  attendanceId: string,
  present: boolean,
): Promise<AttendanceRecord | null> {
  const { data, error } = await supabase
    .from("attendance")
    .update({ present })
    .eq("id", attendanceId)
    .select(ATTENDANCE_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? serializeAttendance(data as unknown as AttendanceRow) : null;
}

export async function listEvaluations(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<StaffEvaluation[]> {
  const { data, error } = await supabase
    .from("staff_evaluations")
    .select(EVALUATION_COLUMNS)
    .eq("organization_id", organizationId)
    .order("evaluated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as unknown as EvaluationRow[]).map(serializeEvaluation);
}

export async function createEvaluation(
  supabase: SupabaseClient,
  organizationId: string,
  payload: {
    staff_id: string;
    period: string;
    rating: number;
    comments: string;
  },
): Promise<StaffEvaluation> {
  const { data, error } = await supabase
    .from("staff_evaluations")
    .insert({
      organization_id: organizationId,
      staff_id: payload.staff_id,
      period: payload.period,
      rating: payload.rating,
      comments: payload.comments,
      evaluated_at: new Date().toISOString(),
    })
    .select(EVALUATION_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return serializeEvaluation(data as unknown as EvaluationRow);
}
