import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  CreateSharedMembershipPayload,
  SharedMembershipRequest,
  SharedMembershipStatus,
} from "@/types/modules/community";

// Représentation sérialisable (dates en chaînes ISO) renvoyée par le mock.
type SharedMembershipDTO = Omit<
  SharedMembershipRequest,
  "requested_at" | "source_organization_name"
> & { requested_at: string | null };

function at(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * 86_400_000).toISOString();
}

const store: SharedMembershipDTO[] = [
  {
    id: "sm-1",
    organization_id: "org-1",
    member_name: "Amadou Touré",
    email: "amadou.toure@example.com",
    phone: "+224 620 11 22 33",
    source_affiliation_id: "aff-1",
    fee_exempt: true,
    status: SharedMembershipStatus.PENDING,
    requested_at: at(-2),
  },
  {
    id: "sm-2",
    organization_id: "org-1",
    member_name: "Kadiatou Sow",
    email: "kadiatou.sow@example.com",
    source_affiliation_id: "aff-2",
    fee_exempt: true,
    status: SharedMembershipStatus.APPROVED,
    requested_at: at(-9),
  },
  {
    id: "sm-3",
    organization_id: "org-1",
    member_name: "Moussa Sylla",
    phone: "+224 621 44 55 66",
    source_affiliation_id: "aff-3",
    fee_exempt: false,
    status: SharedMembershipStatus.PENDING,
    requested_at: at(-1),
  },
];

const LIST_URL = /^\/organizations\/[^/]+\/shared-memberships$/;
const APPROVE_URL =
  /^\/organizations\/([^/]+)\/shared-memberships\/([^/]+)\/approve$/;
const REJECT_URL =
  /^\/organizations\/([^/]+)\/shared-memberships\/([^/]+)\/reject$/;

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

function listSharedMemberships(
  config: InternalAxiosRequestConfig,
): SharedMembershipDTO[] {
  const orgId = extractOrgId(config.url ?? "");
  return clone(
    store
      .filter((s) => s.organization_id === orgId)
      .sort((a, b) => (b.requested_at ?? "").localeCompare(a.requested_at ?? "")),
  );
}

function createSharedMembership(
  config: InternalAxiosRequestConfig,
): SharedMembershipDTO {
  const payload = (config.data ?? {}) as CreateSharedMembershipPayload;
  const orgId = extractOrgId(config.url ?? "") ?? "";

  const record: SharedMembershipDTO = {
    id: `sm-${Date.now()}`,
    organization_id: orgId,
    member_name: payload.member_name,
    email: payload.email,
    phone: payload.phone,
    source_affiliation_id: payload.source_affiliation_id,
    fee_exempt: payload.fee_exempt,
    status: SharedMembershipStatus.PENDING,
    requested_at: new Date().toISOString(),
  };
  store.push(record);
  return clone(record);
}

function setStatus(
  config: InternalAxiosRequestConfig,
  status: SharedMembershipStatus,
): SharedMembershipDTO {
  const url = config.url ?? "";
  const match = (status === SharedMembershipStatus.APPROVED
    ? APPROVE_URL
    : REJECT_URL
  ).exec(url);
  const [, , sharedId] = match ?? [];

  const record = store.find((s) => s.id === sharedId);
  if (!record) throw new Error("Demande d'adhésion partagée introuvable");
  if (record.status !== SharedMembershipStatus.PENDING) {
    throw new Error("Cette demande a déjà été traitée");
  }
  record.status = status;
  return clone(record);
}

export function sharedMembershipsMockAdapter(
  config: InternalAxiosRequestConfig,
): AxiosAdapter | null {
  const method = (config.method ?? "get").toLowerCase();
  const url = config.url ?? "";

  if (method === "get" && LIST_URL.test(url)) {
    return async (cfg) => toResponse(listSharedMemberships(cfg));
  }
  if (method === "post" && LIST_URL.test(url)) {
    return async (cfg) => toResponse(createSharedMembership(cfg));
  }
  if (method === "patch" && APPROVE_URL.test(url)) {
    return async (cfg) =>
      toResponse(setStatus(cfg, SharedMembershipStatus.APPROVED));
  }
  if (method === "patch" && REJECT_URL.test(url)) {
    return async (cfg) =>
      toResponse(setStatus(cfg, SharedMembershipStatus.REJECTED));
  }

  return null;
}
