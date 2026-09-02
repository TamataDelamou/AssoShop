import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  ApplySanctionPayload,
  Sanction,
  SanctionStatus,
  SanctionType,
} from "@/types/modules/community";

// Représentation sérialisable (dates en chaînes ISO) renvoyée par le mock.
// Le membre associé (nom, contact) est joint côté client par le hook useSanctions.
type SanctionDTO = Omit<
  Sanction,
  "start_date" | "end_date" | "created_at" | "member"
> & {
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
};

const DAY_MS = 86_400_000;

function at(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * DAY_MS).toISOString();
}

const store: SanctionDTO[] = [
  {
    id: "s-1",
    organization_id: "org-1",
    member_id: "m-4",
    type: SanctionType.WARNING,
    reason: "Absences non justifiées aux réunions du bureau",
    duration_days: null,
    start_date: at(-20),
    end_date: null,
    status: SanctionStatus.ACTIVE,
    created_at: at(-20),
  },
  {
    id: "s-2",
    organization_id: "org-1",
    member_id: "m-4",
    type: SanctionType.SUSPENSION,
    reason: "Non-respect du règlement intérieur",
    duration_days: 30,
    start_date: at(-100),
    end_date: at(-70),
    status: SanctionStatus.LIFTED,
    created_at: at(-100),
  },
  {
    id: "s-3",
    organization_id: "org-1",
    member_id: "m-2",
    type: SanctionType.WARNING,
    reason: "Retard dans la transmission du PV de réunion",
    duration_days: null,
    start_date: at(-60),
    end_date: null,
    status: SanctionStatus.LIFTED,
    created_at: at(-60),
  },
];

const LIST_URL = /^\/organizations\/[^/]+\/sanctions$/;
const SANCTION_URL = /^\/organizations\/([^/]+)\/sanctions\/([^/]+)$/;

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

function listSanctions(config: InternalAxiosRequestConfig): SanctionDTO[] {
  const orgId = extractOrgId(config.url ?? "");
  return clone(
    store
      .filter((s) => s.organization_id === orgId)
      .sort((a, b) => (b.start_date ?? "").localeCompare(a.start_date ?? "")),
  );
}

function applySanction(config: InternalAxiosRequestConfig): SanctionDTO {
  const payload = (config.data ?? {}) as ApplySanctionPayload;
  const orgId = extractOrgId(config.url ?? "") ?? "";
  const startDate = new Date().toISOString();
  const endDate =
    payload.duration_days && payload.duration_days > 0
      ? new Date(
          Date.now() + payload.duration_days * DAY_MS,
        ).toISOString()
      : null;

  const record: SanctionDTO = {
    id: `s-${Date.now()}`,
    organization_id: orgId,
    member_id: payload.member_id,
    type: payload.type,
    reason: payload.reason,
    duration_days: payload.duration_days ?? null,
    start_date: startDate,
    end_date: endDate,
    status: SanctionStatus.ACTIVE,
    created_at: startDate,
  };
  store.push(record);
  return clone(record);
}

function liftSanction(config: InternalAxiosRequestConfig): SanctionDTO {
  const match = SANCTION_URL.exec(config.url ?? "");
  const [, , sanctionId] = match ?? [];
  const record = store.find((s) => s.id === sanctionId);
  if (!record) {
    throw new Error("Sanction introuvable");
  }
  record.status = SanctionStatus.LIFTED;
  record.end_date = new Date().toISOString();
  return clone(record);
}

export function sanctionsMockAdapter(
  config: InternalAxiosRequestConfig,
): AxiosAdapter | null {
  const method = (config.method ?? "get").toLowerCase();
  const url = config.url ?? "";

  if (method === "get" && LIST_URL.test(url)) {
    return async (cfg) => toResponse(listSanctions(cfg));
  }
  if (method === "post" && LIST_URL.test(url)) {
    return async (cfg) => toResponse(applySanction(cfg));
  }
  if (method === "patch" && SANCTION_URL.test(url)) {
    return async (cfg) => toResponse(liftSanction(cfg));
  }

  return null;
}
