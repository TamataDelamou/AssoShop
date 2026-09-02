import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  Affiliation,
  AffiliationStatus,
  LinkAffiliationPayload,
  UpdateAffiliationPayload,
} from "@/types/modules/community";

// Représentation sérialisable (dates en chaînes ISO) renvoyée par le mock.
type AffiliationDTO = Omit<Affiliation, "linked_at" | "affiliate_name"> & {
  linked_at: string | null;
};

function at(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * 86_400_000).toISOString();
}

const store: AffiliationDTO[] = [
  {
    id: "aff-1",
    organization_id: "org-1",
    affiliate_id: "org-2",
    status: AffiliationStatus.ACTIVE,
    share_members: true,
    share_finances: false,
    shared_member_count: 18,
    linked_at: at(-120),
  },
  {
    id: "aff-2",
    organization_id: "org-1",
    affiliate_id: "org-3",
    status: AffiliationStatus.ACTIVE,
    share_members: true,
    share_finances: true,
    shared_member_count: 34,
    linked_at: at(-60),
  },
  {
    id: "aff-3",
    organization_id: "org-1",
    affiliate_id: "org-4",
    status: AffiliationStatus.PENDING,
    share_members: false,
    share_finances: false,
    shared_member_count: 0,
    linked_at: at(-5),
  },
];

const LIST_URL = /^\/organizations\/[^/]+\/affiliations$/;
const ITEM_URL = /^\/organizations\/([^/]+)\/affiliations\/([^/]+)$/;

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

function listAffiliations(config: InternalAxiosRequestConfig): AffiliationDTO[] {
  const orgId = extractOrgId(config.url ?? "");
  return clone(
    store
      .filter((a) => a.organization_id === orgId)
      .sort((a, b) => (b.linked_at ?? "").localeCompare(a.linked_at ?? "")),
  );
}

function linkAffiliation(config: InternalAxiosRequestConfig): AffiliationDTO {
  const payload = (config.data ?? {}) as LinkAffiliationPayload;
  const orgId = extractOrgId(config.url ?? "") ?? "";

  if (payload.affiliate_id === orgId) {
    throw new Error("Impossible de s'affilier à soi-même.");
  }
  if (
    store.some(
      (a) =>
        a.organization_id === orgId && a.affiliate_id === payload.affiliate_id,
    )
  ) {
    throw new Error("Cette association est déjà affiliée.");
  }

  const record: AffiliationDTO = {
    id: `aff-${Date.now()}`,
    organization_id: orgId,
    affiliate_id: payload.affiliate_id,
    status: AffiliationStatus.PENDING,
    share_members: payload.share_members,
    share_finances: payload.share_finances,
    shared_member_count: 0,
    linked_at: new Date().toISOString(),
  };
  store.push(record);
  return clone(record);
}

function updateAffiliation(config: InternalAxiosRequestConfig): AffiliationDTO {
  const match = ITEM_URL.exec(config.url ?? "");
  const [, , affiliationId] = match ?? [];
  const payload = (config.data ?? {}) as UpdateAffiliationPayload;

  const record = store.find((a) => a.id === affiliationId);
  if (!record) throw new Error("Affiliation introuvable");
  if (payload.status) record.status = payload.status;
  if (typeof payload.share_members === "boolean") {
    record.share_members = payload.share_members;
  }
  if (typeof payload.share_finances === "boolean") {
    record.share_finances = payload.share_finances;
  }
  return clone(record);
}

function unlinkAffiliation(config: InternalAxiosRequestConfig): { id: string } {
  const match = ITEM_URL.exec(config.url ?? "");
  const [, , affiliationId] = match ?? [];

  const index = store.findIndex((a) => a.id === affiliationId);
  if (index === -1) throw new Error("Affiliation introuvable");
  store.splice(index, 1);
  return { id: affiliationId };
}

export function affiliationsMockAdapter(
  config: InternalAxiosRequestConfig,
): AxiosAdapter | null {
  const method = (config.method ?? "get").toLowerCase();
  const url = config.url ?? "";

  if (method === "get" && LIST_URL.test(url)) {
    return async (cfg) => toResponse(listAffiliations(cfg));
  }
  if (method === "post" && LIST_URL.test(url)) {
    return async (cfg) => toResponse(linkAffiliation(cfg));
  }
  if (method === "patch" && ITEM_URL.test(url)) {
    return async (cfg) => toResponse(updateAffiliation(cfg));
  }
  if (method === "delete" && ITEM_URL.test(url)) {
    return async (cfg) => toResponse(unlinkAffiliation(cfg));
  }

  return null;
}
