import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  Antenna,
  CreateAntennaPayload,
  StructureLevel,
} from "@/types/modules/community";

// Représentation sérialisable (dates en chaînes ISO) renvoyée par le mock.
type AntennaDTO = Omit<Antenna, "created_at"> & { created_at: string | null };

function at(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * 86_400_000).toISOString();
}

const store: AntennaDTO[] = [
  {
    id: "an-1",
    organization_id: "org-1",
    parent_id: null,
    name: "Bureau régional de Kindia",
    level: StructureLevel.REGIONAL,
    city: "Kindia",
    address: "Quartier Sambaya",
    responsible: "Mamadou Bah",
    member_count: 35,
    created_at: at(-400),
  },
  {
    id: "an-2",
    organization_id: "org-1",
    parent_id: null,
    name: "Bureau régional de Mamou",
    level: StructureLevel.REGIONAL,
    city: "Mamou",
    address: "Centre-ville",
    responsible: "Aïcha Baldé",
    member_count: 22,
    created_at: at(-320),
  },
  {
    id: "an-3",
    organization_id: "org-1",
    parent_id: "an-1",
    name: "Bureau préfectoral de Dubréka",
    level: StructureLevel.PREFECTORAL,
    city: "Dubréka",
    responsible: "Sékou Camara",
    member_count: 18,
    created_at: at(-280),
  },
  {
    id: "an-4",
    organization_id: "org-1",
    parent_id: null,
    name: "Section communale de Dixinn",
    level: StructureLevel.COMMUNAL,
    city: "Conakry",
    address: "Marché Dixinn",
    responsible: "Fatou Diallo",
    member_count: 12,
    created_at: at(-200),
  },
  {
    id: "an-5",
    organization_id: "org-1",
    parent_id: "an-4",
    name: "Cellule de quartier Kipé",
    level: StructureLevel.NEIGHBORHOOD,
    city: "Conakry",
    responsible: "Ibrahima Sow",
    member_count: 5,
    created_at: at(-120),
  },
];

const LIST_URL = /^\/organizations\/[^/]+\/antennas$/;

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

function listAntennas(config: InternalAxiosRequestConfig): AntennaDTO[] {
  const orgId = extractOrgId(config.url ?? "");
  return clone(
    store
      .filter((a) => a.organization_id === orgId)
      .sort((a, b) => a.name.localeCompare(b.name)),
  );
}

function createAntenna(config: InternalAxiosRequestConfig): AntennaDTO {
  const payload = (config.data ?? {}) as CreateAntennaPayload;
  const orgId = extractOrgId(config.url ?? "") ?? "";

  const record: AntennaDTO = {
    id: `an-${Date.now()}`,
    organization_id: orgId,
    parent_id: payload.parent_id ?? null,
    name: payload.name,
    level: payload.level,
    city: payload.city,
    address: payload.address ?? "",
    responsible: payload.responsible ?? "",
    member_count: 0,
    created_at: new Date().toISOString(),
  };
  store.push(record);
  return clone(record);
}

export function antennasMockAdapter(
  config: InternalAxiosRequestConfig,
): AxiosAdapter | null {
  const method = (config.method ?? "get").toLowerCase();
  const url = config.url ?? "";

  if (method === "get" && LIST_URL.test(url)) {
    return async (cfg) => toResponse(listAntennas(cfg));
  }
  if (method === "post" && LIST_URL.test(url)) {
    return async (cfg) => toResponse(createAntenna(cfg));
  }

  return null;
}
