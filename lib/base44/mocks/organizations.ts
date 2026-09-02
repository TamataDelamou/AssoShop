import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  CreateOrganizationPayload,
  Organization,
} from "@/types/modules/community";

// Représentation sérialisable (dates en chaînes ISO) renvoyée par le mock.
type OrganizationDTO = Omit<Organization, "created_at" | "updated_at"> & {
  created_at: string | null;
  updated_at: string | null;
};

const store: OrganizationDTO[] = [
  {
    id: "org-1",
    name: "Association GSG Conakry",
    type: "association",
    city: "Conakry",
    object: "Promotion de la vie associative et de l'entraide communautaire.",
    status: "active",
    memberCount: 120,
    created_at: "2025-06-10T09:00:00.000Z",
    updated_at: "2026-08-28T14:00:00.000Z",
  },
  {
    id: "org-2",
    name: "Coopérative agricole de Kindia",
    type: "cooperative",
    city: "Kindia",
    object: "Structuration des producteurs et commercialisation groupée.",
    status: "active",
    memberCount: 45,
    created_at: "2025-09-02T09:00:00.000Z",
    updated_at: "2026-08-20T10:00:00.000Z",
  },
  {
    id: "org-3",
    name: "Union des commerçantes de Matam",
    type: "union",
    city: "Conakry",
    object: "Défense des intérêts des commerçantes et accès au financement.",
    status: "active",
    memberCount: 210,
    created_at: "2025-03-18T09:00:00.000Z",
    updated_at: "2026-08-25T16:00:00.000Z",
  },
  {
    id: "org-4",
    name: "Fédération des associations de Labé",
    type: "federation",
    city: "Labé",
    object: "Coordination des associations membres de la région de Labé.",
    status: "active",
    memberCount: 340,
    created_at: "2025-01-22T09:00:00.000Z",
    updated_at: "2026-08-18T11:00:00.000Z",
  },
  {
    id: "org-5",
    name: "ONG Action Solidaire",
    type: "ong",
    city: "Conakry",
    object: "Accompagnement social et éducation des populations vulnérables.",
    status: "pending",
    memberCount: 28,
    created_at: "2026-08-27T09:00:00.000Z",
    updated_at: "2026-08-27T09:00:00.000Z",
  },
  {
    id: "org-6",
    name: "Réseau national des jeunes",
    type: "reseau_national",
    city: "Conakry",
    object: "Insertion professionnelle et citoyenneté des jeunes.",
    status: "active",
    memberCount: 890,
    created_at: "2024-11-05T09:00:00.000Z",
    updated_at: "2026-08-22T08:00:00.000Z",
  },
];

const LIST_URL = /^\/organizations$/;
const ORG_URL = /^\/organizations\/([^/]+)$/;

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

function listOrganizations(
  config: InternalAxiosRequestConfig,
): OrganizationDTO[] {
  const params = (config.params ?? {}) as { search?: string };
  let result = store.slice();

  if (params.search) {
    const needle = params.search.toLowerCase();
    result = result.filter(
      (org) =>
        org.name.toLowerCase().includes(needle) ||
        (org.city ?? "").toLowerCase().includes(needle) ||
        (org.object ?? "").toLowerCase().includes(needle),
    );
  }

  return clone(result);
}

function createOrganization(
  config: InternalAxiosRequestConfig,
): OrganizationDTO {
  const payload = (config.data ?? {}) as CreateOrganizationPayload;
  const now = new Date().toISOString();
  const record: OrganizationDTO = {
    id: `org-${Date.now()}`,
    name: payload.name,
    type: payload.type,
    city: payload.city,
    object: payload.object,
    status: "pending",
    memberCount: 0,
    created_at: now,
    updated_at: now,
  };
  store.unshift(record);
  return clone(record);
}

function getOrganization(config: InternalAxiosRequestConfig): OrganizationDTO {
  const match = ORG_URL.exec(config.url ?? "");
  const [, orgId] = match ?? [];
  const record = store.find((org) => org.id === orgId);
  if (!record) {
    throw new Error("Organisation introuvable");
  }
  return clone(record);
}

export function organizationsMockAdapter(
  config: InternalAxiosRequestConfig,
): AxiosAdapter | null {
  const method = (config.method ?? "get").toLowerCase();
  const url = config.url ?? "";

  if (method === "get" && LIST_URL.test(url)) {
    return async (cfg) => toResponse(listOrganizations(cfg));
  }
  if (method === "get" && ORG_URL.test(url)) {
    return async (cfg) => toResponse(getOrganization(cfg));
  }
  if (method === "post" && LIST_URL.test(url)) {
    return async (cfg) => toResponse(createOrganization(cfg));
  }

  return null;
}
