import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  MembershipValidationMode,
  OrganizationSettings,
  UpdateOrganizationSettingsPayload,
} from "@/types/modules/community";

type SettingsDTO = Omit<OrganizationSettings, "updated_at"> & {
  updated_at: string | null;
};

const URL = /^\/organizations\/([^/]+)\/settings$/;

function defaults(organizationId: string): SettingsDTO {
  return {
    organization_id: organizationId,
    confidentiality: {
      members_visible_to_affiliates: true,
      financial_details_visible_to_affiliates: false,
      contributors_visible_in_social_cases: false,
    },
    membership: {
      validation_mode: MembershipValidationMode.MANUAL,
      sponsorship_required: false,
    },
    updated_at: null,
  };
}

const store: Record<string, SettingsDTO> = {};

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

function getOrCreate(organizationId: string): SettingsDTO {
  if (!store[organizationId]) {
    store[organizationId] = defaults(organizationId);
  }
  return store[organizationId];
}

function getSettings(config: InternalAxiosRequestConfig): SettingsDTO {
  const orgId = extractOrgId(config.url ?? "") ?? "";
  return clone(getOrCreate(orgId));
}

function updateSettings(config: InternalAxiosRequestConfig): SettingsDTO {
  const orgId = extractOrgId(config.url ?? "") ?? "";
  const payload = (config.data ?? {}) as UpdateOrganizationSettingsPayload;
  const current = getOrCreate(orgId);

  if (payload.confidentiality) {
    current.confidentiality = {
      ...current.confidentiality,
      ...payload.confidentiality,
    };
  }
  if (payload.membership) {
    current.membership = { ...current.membership, ...payload.membership };
  }
  current.updated_at = new Date().toISOString();

  return clone(current);
}

export function settingsMockAdapter(
  config: InternalAxiosRequestConfig,
): AxiosAdapter | null {
  const method = (config.method ?? "get").toLowerCase();
  const url = config.url ?? "";

  if (method === "get" && URL.test(url)) {
    return async (cfg) => toResponse(getSettings(cfg));
  }
  if (method === "patch" && URL.test(url)) {
    return async (cfg) => toResponse(updateSettings(cfg));
  }

  return null;
}
