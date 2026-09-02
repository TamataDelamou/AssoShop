"use client";

import { useState, useEffect, useCallback } from "react";
import { hrService } from "@/services/community/hr";
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

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseStaff(s: StaffMember): StaffMember {
  return { ...s, hire_date: s.hire_date ? new Date(s.hire_date) : null };
}

function parseLeave(l: LeaveRequest): LeaveRequest {
  return {
    ...l,
    start_date: l.start_date ? new Date(l.start_date) : null,
    end_date: l.end_date ? new Date(l.end_date) : null,
  };
}

function parseAttendance(a: AttendanceRecord): AttendanceRecord {
  return { ...a, date: a.date ? new Date(a.date) : null };
}

function parseEvaluation(e: StaffEvaluation): StaffEvaluation {
  return { ...e, evaluated_at: e.evaluated_at ? new Date(e.evaluated_at) : null };
}

export function useHumanResources(organizationId: string) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [evaluations, setEvaluations] = useState<StaffEvaluation[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [attendanceDate, setAttendanceDate] = useState(todayISO());
  const [loading, setLoading] = useState(true);
  const [creatingStaff, setCreatingStaff] = useState(false);
  const [creatingLeave, setCreatingLeave] = useState(false);
  const [creatingEvaluation, setCreatingEvaluation] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const loadBase = useCallback(async () => {
    const [staffData, leavesData, evaluationsData] = await Promise.all([
      hrService.getStaff(organizationId),
      hrService.getLeaves(organizationId),
      hrService.getEvaluations(organizationId),
    ]);

    const staffName = (id: string) => {
      const s = staffData.find((m) => m.id === id);
      return s ? `${s.first_name} ${s.last_name}` : undefined;
    };

    return {
      staff: staffData.map(parseStaff),
      leaves: leavesData.map((l) => ({
        ...parseLeave(l),
        staff_name: staffName(l.staff_id) ?? l.staff_name,
      })),
      evaluations: evaluationsData.map((e) => ({
        ...parseEvaluation(e),
        staff_name: staffName(e.staff_id) ?? e.staff_name,
      })),
    };
  }, [organizationId]);

  const loadAttendance = useCallback(
    async (date: string) => {
      const data = await hrService.getAttendance(organizationId, date);
      const name = (id: string) => {
        const s = staff.find((m) => m.id === id);
        return s ? `${s.first_name} ${s.last_name}` : undefined;
      };
      return data.map((a) => ({
        ...parseAttendance(a),
        staff_name: name(a.staff_id) ?? a.staff_name,
      }));
    },
    [organizationId, staff],
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const base = await loadBase();
        if (cancelled) return;
        setStaff(base.staff);
        setLeaves(base.leaves);
        setEvaluations(base.evaluations);
      } catch (err) {
        if (!cancelled) setError(err as Error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadBase]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await hrService.getAttendance(organizationId, attendanceDate);
        if (cancelled) return;
        const name = (id: string) => {
          const s = staff.find((m) => m.id === id);
          return s ? `${s.first_name} ${s.last_name}` : undefined;
        };
        setAttendance(
          data.map((a) => ({
            ...parseAttendance(a),
            staff_name: name(a.staff_id) ?? a.staff_name,
          })),
        );
      } catch (err) {
        if (!cancelled) setError(err as Error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [organizationId, attendanceDate, staff]);

  const refetch = useCallback(async () => {
    try {
      const base = await loadBase();
      setStaff(base.staff);
      setLeaves(base.leaves);
      setEvaluations(base.evaluations);
      setAttendance(await loadAttendance(attendanceDate));
    } catch (err) {
      setError(err as Error);
    }
  }, [loadBase, loadAttendance, attendanceDate]);

  const createStaff = useCallback(
    async (payload: CreateStaffPayload) => {
      setCreatingStaff(true);
      setError(null);
      try {
        await hrService.createStaff(organizationId, payload);
        await refetch();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setCreatingStaff(false);
      }
    },
    [organizationId, refetch],
  );

  const updateStaffStatus = useCallback(
    async (staffId: string, status: StaffStatus) => {
      setBusyId(staffId);
      setError(null);
      try {
        await hrService.updateStaffStatus(organizationId, staffId, status);
        await refetch();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setBusyId(null);
      }
    },
    [organizationId, refetch],
  );

  const createLeave = useCallback(
    async (payload: CreateLeavePayload) => {
      setCreatingLeave(true);
      setError(null);
      try {
        await hrService.createLeave(organizationId, payload);
        await refetch();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setCreatingLeave(false);
      }
    },
    [organizationId, refetch],
  );

  const updateLeaveStatus = useCallback(
    async (leaveId: string, status: LeaveStatus) => {
      setBusyId(leaveId);
      setError(null);
      try {
        await hrService.updateLeaveStatus(organizationId, leaveId, status);
        await refetch();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setBusyId(null);
      }
    },
    [organizationId, refetch],
  );

  const toggleAttendance = useCallback(
    async (record: AttendanceRecord) => {
      setBusyId(record.id);
      setError(null);
      try {
        await hrService.updateAttendance(
          organizationId,
          record.id,
          !record.present,
        );
        setAttendance(await loadAttendance(attendanceDate));
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setBusyId(null);
      }
    },
    [organizationId, attendanceDate, loadAttendance],
  );

  const createEvaluation = useCallback(
    async (payload: CreateStaffEvaluationPayload) => {
      setCreatingEvaluation(true);
      setError(null);
      try {
        await hrService.createEvaluation(organizationId, payload);
        await refetch();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setCreatingEvaluation(false);
      }
    },
    [organizationId, refetch],
  );

  return {
    staff,
    leaves,
    evaluations,
    attendance,
    attendanceDate,
    setAttendanceDate,
    loading,
    creatingStaff,
    creatingLeave,
    creatingEvaluation,
    busyId,
    error,
    createStaff,
    updateStaffStatus,
    createLeave,
    updateLeaveStatus,
    toggleAttendance,
    createEvaluation,
  };
}
