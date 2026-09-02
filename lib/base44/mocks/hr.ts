import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  AttendanceRecord,
  ContractType,
  CreateLeavePayload,
  CreateStaffEvaluationPayload,
  CreateStaffPayload,
  LeaveRequest,
  LeaveStatus,
  StaffEvaluation,
  StaffMember,
  StaffStatus,
  StaffType,
} from "@/types/modules/community";

// Représentations sérialisables (dates en chaînes ISO) renvoyées par le mock.
type StaffDTO = Omit<StaffMember, "hire_date"> & { hire_date: string | null };
type LeaveDTO = Omit<LeaveRequest, "start_date" | "end_date" | "staff_name"> & {
  start_date: string | null;
  end_date: string | null;
};
type AttendanceDTO = Omit<AttendanceRecord, "date" | "staff_name"> & {
  date: string | null;
};
type EvaluationDTO = Omit<StaffEvaluation, "evaluated_at" | "staff_name"> & {
  evaluated_at: string | null;
};

const DAY_MS = 86_400_000;

function at(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * DAY_MS).toISOString();
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const staffStore: StaffDTO[] = [
  {
    id: "s-1",
    organization_id: "org-1",
    first_name: "Aïssatou",
    last_name: "Diallo",
    type: StaffType.EMPLOYEE,
    position: "Secrétaire administrative",
    contract_type: ContractType.CDI,
    status: StaffStatus.ACTIVE,
    monthly_salary: 1200000,
    hire_date: at(-500),
  },
  {
    id: "s-2",
    organization_id: "org-1",
    first_name: "Ousmane",
    last_name: "Camara",
    type: StaffType.EMPLOYEE,
    position: "Comptable",
    contract_type: ContractType.CDI,
    status: StaffStatus.ACTIVE,
    monthly_salary: 1500000,
    hire_date: at(-700),
  },
  {
    id: "s-3",
    organization_id: "org-1",
    first_name: "Mariama",
    last_name: "Barry",
    type: StaffType.VOLUNTEER,
    position: "Animatrice communautaire",
    contract_type: ContractType.VOLUNTEERING,
    status: StaffStatus.ACTIVE,
    monthly_salary: 0,
    hire_date: at(-300),
  },
  {
    id: "s-4",
    organization_id: "org-1",
    first_name: "Ibrahima",
    last_name: "Touré",
    type: StaffType.CONSULTANT,
    position: "Formateur en agriculture",
    contract_type: ContractType.CONSULTING,
    status: StaffStatus.ACTIVE,
    monthly_salary: 900000,
    hire_date: at(-120),
  },
  {
    id: "s-5",
    organization_id: "org-1",
    first_name: "Fatoumata",
    last_name: "Sow",
    type: StaffType.EMPLOYEE,
    position: "Chargée de projet",
    contract_type: ContractType.CDD,
    status: StaffStatus.ON_LEAVE,
    monthly_salary: 1000000,
    hire_date: at(-200),
  },
];

const leavesStore: LeaveDTO[] = [
  {
    id: "l-1",
    organization_id: "org-1",
    staff_id: "s-1",
    reason: "Congé annuel",
    start_date: at(10),
    end_date: at(20),
    status: LeaveStatus.PENDING,
  },
  {
    id: "l-2",
    organization_id: "org-1",
    staff_id: "s-5",
    reason: "Congé maternité",
    start_date: at(-15),
    end_date: at(75),
    status: LeaveStatus.APPROVED,
  },
  {
    id: "l-3",
    organization_id: "org-1",
    staff_id: "s-3",
    reason: "Maladie",
    start_date: at(-5),
    end_date: at(-2),
    status: LeaveStatus.REJECTED,
  },
];

const attendanceStore = new Map<string, AttendanceDTO[]>();
// Présences pré-remplies pour aujourd'hui.
const todayKey = dateKey(new Date());
attendanceStore.set(todayKey, [
  {
    id: `att-s-1-${todayKey}`,
    organization_id: "org-1",
    staff_id: "s-1",
    date: new Date(todayKey).toISOString(),
    present: true,
  },
  {
    id: `att-s-2-${todayKey}`,
    organization_id: "org-1",
    staff_id: "s-2",
    date: new Date(todayKey).toISOString(),
    present: true,
  },
  {
    id: `att-s-3-${todayKey}`,
    organization_id: "org-1",
    staff_id: "s-3",
    date: new Date(todayKey).toISOString(),
    present: false,
  },
  {
    id: `att-s-4-${todayKey}`,
    organization_id: "org-1",
    staff_id: "s-4",
    date: new Date(todayKey).toISOString(),
    present: false,
  },
  {
    id: `att-s-5-${todayKey}`,
    organization_id: "org-1",
    staff_id: "s-5",
    date: new Date(todayKey).toISOString(),
    present: false,
  },
]);

const evaluationsStore: EvaluationDTO[] = [
  {
    id: "sev-1",
    organization_id: "org-1",
    staff_id: "s-2",
    period: "2025 S2",
    rating: 4,
    comments: "Rigueur et précision dans la tenue des comptes.",
    evaluated_at: at(-60),
  },
  {
    id: "sev-2",
    organization_id: "org-1",
    staff_id: "s-4",
    period: "2026 S1",
    rating: 5,
    comments: "Excellente animation des formations agricoles.",
    evaluated_at: at(-20),
  },
];

const STAFF_URL = /^\/organizations\/[^/]+\/staff$/;
const STAFF_ITEM_URL = /^\/organizations\/([^/]+)\/staff\/([^/]+)$/;
const LEAVES_URL = /^\/organizations\/[^/]+\/leaves$/;
const LEAVE_ITEM_URL = /^\/organizations\/([^/]+)\/leaves\/([^/]+)$/;
const ATTENDANCE_URL = /^\/organizations\/[^/]+\/attendance$/;
const ATTENDANCE_ITEM_URL =
  /^\/organizations\/([^/]+)\/attendance\/([^/]+)$/;
const EVALUATIONS_URL = /^\/organizations\/[^/]+\/staff-evaluations$/;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function toResponse(data: unknown): AxiosResponse {
  return {
    data,
    status: 200,
    statusText: "OK",
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  };
}

function extractOrgId(url: string): string | null {
  const match = url.match(/^\/organizations\/([^/]+)\//);
  return match ? match[1] : null;
}

function listStaff(config: InternalAxiosRequestConfig): StaffDTO[] {
  const orgId = extractOrgId(config.url ?? "");
  return clone(
    staffStore
      .filter((s) => s.organization_id === orgId)
      .sort((a, b) => a.last_name.localeCompare(b.last_name)),
  );
}

function createStaff(config: InternalAxiosRequestConfig): StaffDTO {
  const payload = (config.data ?? {}) as CreateStaffPayload;
  const orgId = extractOrgId(config.url ?? "") ?? "";
  const record: StaffDTO = {
    id: `s-${Date.now()}`,
    organization_id: orgId,
    first_name: payload.first_name,
    last_name: payload.last_name,
    type: payload.type,
    position: payload.position,
    contract_type: payload.contract_type,
    status: StaffStatus.ACTIVE,
    monthly_salary: payload.monthly_salary,
    hire_date: payload.hire_date
      ? new Date(payload.hire_date).toISOString()
      : new Date().toISOString(),
  };
  staffStore.push(record);
  return clone(record);
}

function updateStaff(config: InternalAxiosRequestConfig): StaffDTO {
  const match = STAFF_ITEM_URL.exec(config.url ?? "");
  const [, , staffId] = match ?? [];
  const payload = (config.data ?? {}) as { status?: StaffStatus };

  const record = staffStore.find((s) => s.id === staffId);
  if (!record) throw new Error("Membre du personnel introuvable");
  if (payload.status) record.status = payload.status;
  return clone(record);
}

function listLeaves(config: InternalAxiosRequestConfig): LeaveDTO[] {
  const orgId = extractOrgId(config.url ?? "");
  return clone(
    leavesStore
      .filter((l) => l.organization_id === orgId)
      .sort((a, b) => (b.start_date ?? "").localeCompare(a.start_date ?? "")),
  );
}

function createLeave(config: InternalAxiosRequestConfig): LeaveDTO {
  const payload = (config.data ?? {}) as CreateLeavePayload;
  const orgId = extractOrgId(config.url ?? "") ?? "";
  const record: LeaveDTO = {
    id: `l-${Date.now()}`,
    organization_id: orgId,
    staff_id: payload.staff_id,
    reason: payload.reason,
    start_date: new Date(payload.start_date).toISOString(),
    end_date: new Date(payload.end_date).toISOString(),
    status: LeaveStatus.PENDING,
  };
  leavesStore.push(record);
  return clone(record);
}

function updateLeave(config: InternalAxiosRequestConfig): LeaveDTO {
  const match = LEAVE_ITEM_URL.exec(config.url ?? "");
  const [, , leaveId] = match ?? [];
  const payload = (config.data ?? {}) as { status?: LeaveStatus };

  const record = leavesStore.find((l) => l.id === leaveId);
  if (!record) throw new Error("Demande de congé introuvable");
  if (payload.status) record.status = payload.status;
  return clone(record);
}

function listAttendance(config: InternalAxiosRequestConfig): AttendanceDTO[] {
  const orgId = extractOrgId(config.url ?? "");
  const params = (config.params ?? {}) as { date?: string };
  const key = params.date ? dateKey(new Date(params.date)) : todayKey;

  if (!attendanceStore.has(key)) {
    attendanceStore.set(
      key,
      staffStore
        .filter((s) => s.organization_id === orgId)
        .map((s) => ({
          id: `att-${s.id}-${key}`,
          organization_id: orgId ?? "",
          staff_id: s.id,
          date: new Date(key).toISOString(),
          present: false,
        })),
    );
  }

  return clone(attendanceStore.get(key) ?? []);
}

function updateAttendance(config: InternalAxiosRequestConfig): AttendanceDTO {
  const match = ATTENDANCE_ITEM_URL.exec(config.url ?? "");
  const [, , attendanceId] = match ?? [];
  const payload = (config.data ?? {}) as { present?: boolean };

  const records = Array.from(attendanceStore.values()).flat();
  const record = records.find((r) => r.id === attendanceId);
  if (!record) throw new Error("Pointage introuvable");
  if (typeof payload.present === "boolean") record.present = payload.present;
  return clone(record);
}

function listEvaluations(config: InternalAxiosRequestConfig): EvaluationDTO[] {
  const orgId = extractOrgId(config.url ?? "");
  return clone(
    evaluationsStore
      .filter((e) => e.organization_id === orgId)
      .sort((a, b) => (b.evaluated_at ?? "").localeCompare(a.evaluated_at ?? "")),
  );
}

function createEvaluation(config: InternalAxiosRequestConfig): EvaluationDTO {
  const payload = (config.data ?? {}) as CreateStaffEvaluationPayload;
  const orgId = extractOrgId(config.url ?? "") ?? "";
  const record: EvaluationDTO = {
    id: `sev-${Date.now()}`,
    organization_id: orgId,
    staff_id: payload.staff_id,
    period: payload.period,
    rating: payload.rating,
    comments: payload.comments,
    evaluated_at: new Date().toISOString(),
  };
  evaluationsStore.push(record);
  return clone(record);
}

export function hrMockAdapter(
  config: InternalAxiosRequestConfig,
): AxiosAdapter | null {
  const method = (config.method ?? "get").toLowerCase();
  const url = config.url ?? "";

  if (method === "get" && STAFF_URL.test(url)) {
    return async (cfg) => toResponse(listStaff(cfg));
  }
  if (method === "post" && STAFF_URL.test(url)) {
    return async (cfg) => toResponse(createStaff(cfg));
  }
  if (method === "patch" && STAFF_ITEM_URL.test(url)) {
    return async (cfg) => toResponse(updateStaff(cfg));
  }
  if (method === "get" && LEAVES_URL.test(url)) {
    return async (cfg) => toResponse(listLeaves(cfg));
  }
  if (method === "post" && LEAVES_URL.test(url)) {
    return async (cfg) => toResponse(createLeave(cfg));
  }
  if (method === "patch" && LEAVE_ITEM_URL.test(url)) {
    return async (cfg) => toResponse(updateLeave(cfg));
  }
  if (method === "get" && ATTENDANCE_URL.test(url)) {
    return async (cfg) => toResponse(listAttendance(cfg));
  }
  if (method === "patch" && ATTENDANCE_ITEM_URL.test(url)) {
    return async (cfg) => toResponse(updateAttendance(cfg));
  }
  if (method === "get" && EVALUATIONS_URL.test(url)) {
    return async (cfg) => toResponse(listEvaluations(cfg));
  }
  if (method === "post" && EVALUATIONS_URL.test(url)) {
    return async (cfg) => toResponse(createEvaluation(cfg));
  }

  return null;
}
