import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  CreateRelocationPayload,
  MemberRelocation,
  RelocationStatus,
} from "@/types/modules/community";

// Représentation sérialisable (dates en chaînes ISO) renvoyée par le mock.
type RelocationDTO = Omit<
  MemberRelocation,
  "requested_at" | "confirmed_at" | "member_name"
> & {
  requested_at: string | null;
  confirmed_at: string | null;
};

function at(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * 86_400_000).toISOString();
}

const store: RelocationDTO[] = [
  {
    id: "rel-1",
    organization_id: "org-1",
    member_id: "m-2",
    old_address: "Quartier Kipé, Conakry",
    new_address: "Quartier Matoto, Conakry",
    new_city: "Conakry",
    reason: "Mutation professionnelle",
    status: RelocationStatus.PENDING,
    requested_at: at(-3),
    confirmed_at: null,
  },
  {
    id: "rel-2",
    organization_id: "org-1",
    member_id: "m-4",
    old_address: "Kindia centre",
    new_address: "Quartier Madina Oula, Kindia",
    new_city: "Kindia",
    status: RelocationStatus.CONFIRMED,
    requested_at: at(-10),
    confirmed_at: at(-8),
  },
  {
    id: "rel-3",
    organization_id: "org-1",
    member_id: "m-6",
    old_address: "Labé, centre-ville",
    new_address: "Quartier Lambanyi, Conakry",
    new_city: "Conakry",
    reason: "Rapprochement familial",
    status: RelocationStatus.PENDING,
    requested_at: at(-1),
    confirmed_at: null,
  },
];

const LIST_URL = /^\/organizations\/[^/]+\/relocations$/;
const CONFIRM_URL = /^\/organizations\/([^/]+)\/relocations\/([^/]+)\/confirm$/;

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

function listRelocations(config: InternalAxiosRequestConfig): RelocationDTO[] {
  const orgId = extractOrgId(config.url ?? "");
  return clone(
    store
      .filter((r) => r.organization_id === orgId)
      .sort((a, b) => (b.requested_at ?? "").localeCompare(a.requested_at ?? "")),
  );
}

function createRelocation(config: InternalAxiosRequestConfig): RelocationDTO {
  const payload = (config.data ?? {}) as CreateRelocationPayload;
  const orgId = extractOrgId(config.url ?? "") ?? "";

  const record: RelocationDTO = {
    id: `rel-${Date.now()}`,
    organization_id: orgId,
    member_id: payload.member_id,
    old_address: payload.old_address,
    new_address: payload.new_address,
    new_city: payload.new_city,
    reason: payload.reason,
    status: RelocationStatus.PENDING,
    requested_at: new Date().toISOString(),
    confirmed_at: null,
  };
  store.push(record);
  return clone(record);
}

function confirmRelocation(config: InternalAxiosRequestConfig): RelocationDTO {
  const match = CONFIRM_URL.exec(config.url ?? "");
  const [, , relocationId] = match ?? [];

  const record = store.find((r) => r.id === relocationId);
  if (!record) throw new Error("Déclaration de déménagement introuvable");
  if (record.status !== RelocationStatus.PENDING) {
    throw new Error("Cette déclaration a déjà été confirmée");
  }
  record.status = RelocationStatus.CONFIRMED;
  record.confirmed_at = new Date().toISOString();
  return clone(record);
}

export function relocationsMockAdapter(
  config: InternalAxiosRequestConfig,
): AxiosAdapter | null {
  const method = (config.method ?? "get").toLowerCase();
  const url = config.url ?? "";

  if (method === "get" && LIST_URL.test(url)) {
    return async (cfg) => toResponse(listRelocations(cfg));
  }
  if (method === "post" && LIST_URL.test(url)) {
    return async (cfg) => toResponse(createRelocation(cfg));
  }
  if (method === "patch" && CONFIRM_URL.test(url)) {
    return async (cfg) => toResponse(confirmRelocation(cfg));
  }

  return null;
}
