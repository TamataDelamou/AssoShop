import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  CreateInvestmentProjectPayload,
  InvestmentProject,
  InvestmentProjectStatus,
  InvestPayload,
} from "@/types/modules/market";

type ProjectDTO = Omit<InvestmentProject, "created_at"> & {
  created_at: string;
};

const INVESTMENTS_URL = /^\/market\/investments$/;
const INVEST_URL = /^\/market\/investments\/([^/]+)\/invest$/;

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

const projects: ProjectDTO[] = [
  {
    id: "inv-1",
    name: "Verger de manguiers (2 ha)",
    description:
      "Plantation et entretien d'un verger de manguiers greffés, première récolte attendue à 3 ans.",
    sector: "agriculture",
    target_amount: 5000000,
    raised_amount: 3200000,
    currency: "GNF",
    profit_sharing_rules:
      "60 % pour les investisseurs, 40 % pour le porteur du projet.",
    rules_locked: true,
    status: InvestmentProjectStatus.OPEN,
    my_contribution: 500000,
    created_at: "2026-03-10T00:00:00.000Z",
  },
  {
    id: "inv-2",
    name: "Élevage de poulets de chair",
    description:
      "Construction d'un poulailler de 1 000 sujets et vente sur le marché local.",
    sector: "elevage",
    target_amount: 3000000,
    raised_amount: 3000000,
    currency: "GNF",
    profit_sharing_rules:
      "50 % investisseurs / 50 % porteur, après remboursement des coûts.",
    rules_locked: true,
    status: InvestmentProjectStatus.COMPLETED,
    my_contribution: 1000000,
    created_at: "2026-02-05T00:00:00.000Z",
  },
  {
    id: "inv-3",
    name: "Boutique communautaire de produits locaux",
    description:
      "Ouverture d'une boutique de produits agricoles et artisanaux locaux.",
    sector: "commerce",
    target_amount: 8000000,
    raised_amount: 0,
    currency: "GNF",
    profit_sharing_rules:
      "70 % investisseurs / 30 % porteur, versement semestriel des bénéfices.",
    rules_locked: false,
    status: InvestmentProjectStatus.OPEN,
    my_contribution: 0,
    created_at: "2026-07-01T00:00:00.000Z",
  },
];

function createProject(config: InternalAxiosRequestConfig): ProjectDTO | null {
  const payload = (config.data ?? {}) as CreateInvestmentProjectPayload;
  if (!payload.name?.trim() || !payload.profit_sharing_rules?.trim()) {
    return null;
  }

  const record: ProjectDTO = {
    id: `inv-${Date.now()}`,
    name: payload.name,
    description: payload.description,
    sector: payload.sector,
    target_amount: payload.target_amount,
    raised_amount: 0,
    currency: payload.currency,
    // RG-M05 : les règles sont publiées à la création, modifiables tant
    // qu'aucune contribution n'a été reçue.
    profit_sharing_rules: payload.profit_sharing_rules,
    rules_locked: false,
    status: InvestmentProjectStatus.OPEN,
    my_contribution: 0,
    created_at: new Date().toISOString(),
  };

  projects.unshift(record);
  return clone(record);
}

function invest(config: InternalAxiosRequestConfig): ProjectDTO | null {
  const match = config.url?.match(INVEST_URL);
  if (!match) return null;

  const payload = (config.data ?? {}) as InvestPayload;
  const project = projects.find((p) => p.id === match[1]);
  if (!project || project.status !== InvestmentProjectStatus.OPEN) return null;
  if (payload.amount <= 0) return null;

  project.raised_amount += payload.amount;
  project.my_contribution += payload.amount;
  // RG-M05 : les règles deviennent immuables dès la première contribution.
  project.rules_locked = true;

  if (project.raised_amount >= project.target_amount) {
    project.status = InvestmentProjectStatus.COMPLETED;
  }

  return clone(project);
}

export function marketInvestmentsMockAdapter(
  config: InternalAxiosRequestConfig,
): AxiosAdapter | null {
  const method = (config.method ?? "get").toLowerCase();
  const url = config.url ?? "";

  if (method === "get" && INVESTMENTS_URL.test(url)) {
    return async () => toResponse(clone(projects));
  }
  if (method === "post" && INVESTMENTS_URL.test(url)) {
    return async (cfg) => toResponse(createProject(cfg));
  }
  if (method === "post" && INVEST_URL.test(url)) {
    return async (cfg) => toResponse(invest(cfg));
  }

  return null;
}
