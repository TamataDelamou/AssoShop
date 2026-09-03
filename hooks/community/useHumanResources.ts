"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { HR_CONFIG } from "@/utils/constants";
import { declareOffline, useOfflineQuery } from "@/lib/offline";

declareOffline({
  module: "hr",
  cacheableReads: [HR_CONFIG.CACHE_KEY_PREFIX],
  deferredMutations: [],
});

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

interface HrBase {
  staff: StaffMember[];
  leaves: LeaveRequest[];
  evaluations: StaffEvaluation[];
}

export function useHumanResources(organizationId: string) {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [attendanceDate, setAttendanceDate] = useState(todayISO());
  const [creatingStaff, setCreatingStaff] = useState(false);
  const [creatingLeave, setCreatingLeave] = useState(false);
  const [creatingEvaluation, setCreatingEvaluation] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<Error | null>(null);
  const { data, loading, error: loadError, refresh } =
    useOfflineQuery<HrBase>(
      `${HR_CONFIG.CACHE_KEY_PREFIX}${organizationId}`,
      async () => {
        const [staffData, leavesData, evaluationsData] = await Promise.all([
          hrService.getStaff(organizationId),
          hrService.getLeaves(organizationId),
          hrService.getEvaluations(organizationId),
        ]);
        return {
          staff: staffData,
          leaves: leavesData,
          evaluations: evaluationsData,
        };
      },
      {
        ttlMs: HR_CONFIG.CACHE_TTL_MS,
        parse: (bundle) => {
          const staffName = (id: string) => {
            const s = bundle.staff.find((m) => m.id === id);
            return s ? `${s.first_name} ${s.last_name}` : undefined;
          };
          return {
            staff: bundle.staff.map(parseStaff),
            leaves: bundle.leaves.map((l) => ({
              ...parseLeave(l),
              staff_name: staffName(l.staff_id) ?? l.staff_name,
            })),
            evaluations: bundle.evaluations.map((e) => ({
              ...parseEvaluation(e),
              staff_name: staffName(e.staff_id) ?? e.staff_name,
            })),
          };
        },
      },
    );

  const staff = useMemo(() => data?.staff ?? [], [data?.staff]);
  const error = actionError ?? loadError;

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
        const data = await loadAttendance(attendanceDate);
        if (!cancelled) setAttendance(data);
      } catch (err) {
        if (!cancelled) setActionError(err as Error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadAttendance, attendanceDate]);

  const refetch = useCallback(async () => {
    await refresh();
    try {
      setAttendance(await loadAttendance(attendanceDate));
    } catch (err) {
      setActionError(err as Error);
    }
  }, [refresh, loadAttendance, attendanceDate]);

  const createStaff = useCallback(
    async (payload: CreateStaffPayload) => {
      setCreatingStaff(true);
      setActionError(null);
      try {
        await hrService.createStaff(organizationId, payload);
        await refetch();
      } catch (err) {
        setActionError(err as Error);
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
      setActionError(null);
      try {
        await hrService.updateStaffStatus(organizationId, staffId, status);
        await refetch();
      } catch (err) {
        setActionError(err as Error);
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
      setActionError(null);
      try {
        await hrService.createLeave(organizationId, payload);
        await refetch();
      } catch (err) {
        setActionError(err as Error);
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
      setActionError(null);
      try {
        await hrService.updateLeaveStatus(organizationId, leaveId, status);
        await refetch();
      } catch (err) {
        setActionError(err as Error);
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
      setActionError(null);
      try {
        await hrService.updateAttendance(
          organizationId,
          record.id,
          !record.present,
        );
        setAttendance(await loadAttendance(attendanceDate));
      } catch (err) {
        setActionError(err as Error);
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
      setActionError(null);
      try {
        await hrService.createEvaluation(organizationId, payload);
        await refetch();
      } catch (err) {
        setActionError(err as Error);
        throw err;
      } finally {
        setCreatingEvaluation(false);
      }
    },
    [organizationId, refetch],
  );

  return {
    staff,
    leaves: data?.leaves ?? [],
    evaluations: data?.evaluations ?? [],
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
