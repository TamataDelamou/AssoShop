import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  Asset,
  AssetCategory,
  AssetStatus,
  CreateAssetPayload,
} from "@/types/modules/community";

// Représentation sérialisable (dates en chaînes ISO) renvoyée par le mock.
type AssetDTO = Omit<Asset, "acquisition_date"> & {
  acquisition_date: string | null;
};

const DAY_MS = 86_400_000;

function at(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * DAY_MS).toISOString();
}

const store: AssetDTO[] = [
  {
    id: "a-1",
    organization_id: "org-1",
    name: "Véhicule pick-up",
    category: AssetCategory.VEHICLE,
    status: AssetStatus.IN_USE,
    quantity: 1,
    acquisition_value: 45000000,
    acquisition_date: at(-900),
    location: "Siège",
    assigned_to: "Mamadou Bah",
  },
  {
    id: "a-2",
    organization_id: "org-1",
    name: "Ordinateurs portables",
    category: AssetCategory.COMPUTER,
    status: AssetStatus.IN_USE,
    quantity: 3,
    acquisition_value: 3600000,
    acquisition_date: at(-400),
    location: "Bureau",
    assigned_to: "Équipe administrative",
  },
  {
    id: "a-3",
    organization_id: "org-1",
    name: "Imprimante multifonction",
    category: AssetCategory.PRINTER,
    status: AssetStatus.MAINTENANCE,
    quantity: 1,
    acquisition_value: 850000,
    acquisition_date: at(-700),
    location: "Bureau",
  },
  {
    id: "a-4",
    organization_id: "org-1",
    name: "Bâtiment du siège",
    category: AssetCategory.BUILDING,
    status: AssetStatus.IN_USE,
    quantity: 1,
    acquisition_value: 120000000,
    acquisition_date: at(-1800),
    location: "Conakry",
  },
  {
    id: "a-5",
    organization_id: "org-1",
    name: "Terrain agricole",
    category: AssetCategory.LAND,
    status: AssetStatus.AVAILABLE,
    quantity: 1,
    acquisition_value: 30000000,
    acquisition_date: at(-1200),
    location: "Kindia",
  },
  {
    id: "a-6",
    organization_id: "org-1",
    name: "Mobilier de bureau",
    category: AssetCategory.FURNITURE,
    status: AssetStatus.IN_USE,
    quantity: 12,
    acquisition_value: 2400000,
    acquisition_date: at(-500),
    location: "Bureau",
  },
];

const LIST_URL = /^\/organizations\/[^/]+\/assets$/;
const ASSET_URL = /^\/organizations\/([^/]+)\/assets\/([^/]+)$/;

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

function listAssets(config: InternalAxiosRequestConfig): AssetDTO[] {
  const orgId = extractOrgId(config.url ?? "");
  return clone(
    store
      .filter((a) => a.organization_id === orgId)
      .sort((a, b) => a.name.localeCompare(b.name)),
  );
}

function createAsset(config: InternalAxiosRequestConfig): AssetDTO {
  const payload = (config.data ?? {}) as CreateAssetPayload;
  const orgId = extractOrgId(config.url ?? "") ?? "";

  const record: AssetDTO = {
    id: `a-${Date.now()}`,
    organization_id: orgId,
    name: payload.name,
    category: payload.category,
    status: AssetStatus.AVAILABLE,
    quantity: payload.quantity,
    acquisition_value: payload.acquisition_value,
    acquisition_date: payload.acquisition_date
      ? new Date(payload.acquisition_date).toISOString()
      : null,
    location: payload.location ?? "",
    assigned_to: payload.assigned_to ?? "",
  };
  store.push(record);
  return clone(record);
}

function updateAsset(config: InternalAxiosRequestConfig): AssetDTO {
  const match = ASSET_URL.exec(config.url ?? "");
  const [, , assetId] = match ?? [];
  const payload = (config.data ?? {}) as { status?: AssetStatus };

  const record = store.find((a) => a.id === assetId);
  if (!record) throw new Error("Actif introuvable");
  if (payload.status) record.status = payload.status;
  return clone(record);
}

export function assetsMockAdapter(
  config: InternalAxiosRequestConfig,
): AxiosAdapter | null {
  const method = (config.method ?? "get").toLowerCase();
  const url = config.url ?? "";

  if (method === "get" && LIST_URL.test(url)) {
    return async (cfg) => toResponse(listAssets(cfg));
  }
  if (method === "post" && LIST_URL.test(url)) {
    return async (cfg) => toResponse(createAsset(cfg));
  }
  if (method === "patch" && ASSET_URL.test(url)) {
    return async (cfg) => toResponse(updateAsset(cfg));
  }

  return null;
}
