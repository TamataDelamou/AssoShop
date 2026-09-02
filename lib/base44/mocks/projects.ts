import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  CommunityProject,
  ContributeToProjectPayload,
  CreateProjectPayload,
  ProjectContribution,
  ProjectStatus,
} from "@/types/modules/community";

// Représentation sérialisable (dates en chaînes ISO) renvoyée par le mock.
type ContributionDTO = Omit<ProjectContribution, "contributed_at"> & {
  contributed_at: string | null;
};

type ProjectDTO = Omit<
  CommunityProject,
  "start_date" | "created_at" | "contributions"
> & {
  start_date: string | null;
  created_at: string | null;
  contributions: ContributionDTO[];
};

const store: ProjectDTO[] = [
  {
    id: "prj-1",
    organization_id: "org-1",
    name: "Forage d'un puits communautaire",
    description:
      "Installation d'un forage pour l'accès à l'eau potable du quartier.",
    goal_amount: 5000000,
    raised_amount: 3250000,
    status: ProjectStatus.IN_PROGRESS,
    relayed_from: null,
    relayed_to_affiliates: true,
    start_date: "2026-02-01T00:00:00.000Z",
    created_at: "2026-02-01T00:00:00.000Z",
    contributions: [
      {
        id: "pc-1",
        contributor_name: "Jean Dupont",
        amount: 2000000,
        anonymous: false,
        contributed_at: "2026-02-05T00:00:00.000Z",
      },
      {
        id: "pc-2",
        contributor_name: "Aminata Bah",
        amount: 1250000,
        anonymous: false,
        contributed_at: "2026-02-10T00:00:00.000Z",
      },
    ],
  },
  {
    id: "prj-2",
    organization_id: "org-1",
    name: "Rénovation de la maison des jeunes",
    description:
      "Réfection de la toiture et aménagement d'une salle d'étude.",
    goal_amount: 8000000,
    raised_amount: 8000000,
    status: ProjectStatus.COMPLETED,
    relayed_from: null,
    relayed_to_affiliates: false,
    start_date: "2025-09-01T00:00:00.000Z",
    created_at: "2025-09-01T00:00:00.000Z",
    contributions: [
      {
        id: "pc-3",
        contributor_name: "Mamadou Sow",
        amount: 4000000,
        anonymous: false,
        contributed_at: "2025-09-15T00:00:00.000Z",
      },
      {
        id: "pc-4",
        contributor_name: "Coopérative des femmes",
        amount: 3000000,
        anonymous: false,
        contributed_at: "2025-10-01T00:00:00.000Z",
      },
      {
        id: "pc-5",
        contributor_name: "Donateur anonyme",
        amount: 1000000,
        anonymous: true,
        contributed_at: "2025-10-20T00:00:00.000Z",
      },
    ],
  },
  {
    id: "prj-3",
    organization_id: "org-1",
    name: "Campagne de reboisement",
    description:
      "Plantation de 5 000 arbres avec les associations sœurs de la région.",
    goal_amount: 2500000,
    raised_amount: 500000,
    status: ProjectStatus.IN_PROGRESS,
    relayed_from: "Grande communauté forestière de Conakry",
    relayed_to_affiliates: false,
    start_date: "2026-02-20T00:00:00.000Z",
    created_at: "2026-02-20T00:00:00.000Z",
    contributions: [
      {
        id: "pc-6",
        contributor_name: "Association des planteurs",
        amount: 500000,
        anonymous: false,
        contributed_at: "2026-02-22T00:00:00.000Z",
      },
    ],
  },
];

const LIST_URL = /^\/organizations\/[^/]+\/projects$/;
const CONTRIBUTIONS_URL =
  /^\/organizations\/[^/]+\/projects\/([^/]+)\/contributions$/;

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

function listProjects(config: InternalAxiosRequestConfig): ProjectDTO[] {
  const params = (config.params ?? {}) as { search?: string; status?: string };
  let result = store.slice();

  if (params.search) {
    const needle = params.search.toLowerCase();
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.description.toLowerCase().includes(needle),
    );
  }

  if (params.status && params.status !== "all") {
    result = result.filter((p) => p.status === params.status);
  }

  return clone(result);
}

function createProject(config: InternalAxiosRequestConfig): ProjectDTO {
  const payload = (config.data ?? {}) as CreateProjectPayload;
  const record: ProjectDTO = {
    id: `prj-${Date.now()}`,
    organization_id: "org-1",
    name: payload.name,
    description: payload.description,
    goal_amount: payload.goal_amount,
    raised_amount: 0,
    status: ProjectStatus.IN_PROGRESS,
    relayed_from: null,
    relayed_to_affiliates: payload.relayed_to_affiliates,
    start_date: new Date().toISOString(),
    created_at: new Date().toISOString(),
    contributions: [],
  };
  store.unshift(record);
  return clone(record);
}

function contribute(config: InternalAxiosRequestConfig): ProjectDTO | null {
  const match = config.url?.match(CONTRIBUTIONS_URL);
  if (!match) return null;

  const payload = (config.data ?? {}) as ContributeToProjectPayload;
  const project = store.find((p) => p.id === match[1]);
  if (!project) return null;

  project.contributions.push({
    id: `pc-${Date.now()}`,
    contributor_name: payload.anonymous ? "Donateur anonyme" : payload.contributor_name,
    amount: payload.amount,
    anonymous: payload.anonymous,
    contributed_at: new Date().toISOString(),
  });
  project.raised_amount += payload.amount;
  if (project.raised_amount >= project.goal_amount) {
    project.status = ProjectStatus.COMPLETED;
  }

  return clone(project);
}

export function projectsMockAdapter(
  config: InternalAxiosRequestConfig,
): AxiosAdapter | null {
  const method = (config.method ?? "get").toLowerCase();
  const url = config.url ?? "";

  if (method === "get" && LIST_URL.test(url)) {
    return async (cfg) => toResponse(listProjects(cfg));
  }
  if (method === "post" && LIST_URL.test(url)) {
    return async (cfg) => toResponse(createProject(cfg));
  }
  if (method === "post" && CONTRIBUTIONS_URL.test(url)) {
    return async (cfg) => toResponse(contribute(cfg));
  }

  return null;
}
