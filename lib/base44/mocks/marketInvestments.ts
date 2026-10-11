import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  CreateInvestmentProjectPayload,
  DeclareProfitPayload,
  InvestmentDistributionStatus,
  InvestmentProject,
  InvestmentProjectStatus,
  InvestPayload,
} from "@/types/modules/market";

type DistributionDTO = Omit<
  InvestmentProject["distributions"][number],
  "declared_at"
> & { declared_at: string };

type ProjectDTO = Omit<
  InvestmentProject,
  "created_at" | "deadline" | "distributions"
> & {
  created_at: string;
  deadline: string | null;
  distributions: DistributionDTO[];
};

// Taux de la « Commission investissement » (démonstration).
const COMMISSION_RATE = 1;

const INVESTMENTS_URL = /^\/market\/investments$/;
const INVEST_URL = /^\/market\/investments\/([^/]+)\/invest$/;
const PROFIT_URL = /^\/market\/investments\/([^/]+)\/profit$/;

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
    deadline: "2026-12-31",
    is_owner: false,
    commission_rate: COMMISSION_RATE,
    shares: [
      { is_me: false, amount: 1700000, percent: 53.1 },
      { is_me: false, amount: 1000000, percent: 31.3 },
      { is_me: true, amount: 500000, percent: 15.6 },
    ],
    distributions: [],
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
    status: InvestmentProjectStatus.FUNDED,
    my_contribution: 1000000,
    deadline: "2026-06-30",
    is_owner: true,
    commission_rate: COMMISSION_RATE,
    shares: [
      { is_me: false, amount: 2000000, percent: 66.7 },
      { is_me: true, amount: 1000000, percent: 33.3 },
    ],
    distributions: [
      {
        id: "dist-0",
        amount: 300000,
        distributed_amount: 300000,
        status: InvestmentDistributionStatus.APPROVED,
        declared_at: "2026-08-01T00:00:00.000Z",
        my_share: 100000,
      },
    ],
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
    deadline: "2027-01-31",
    is_owner: false,
    commission_rate: COMMISSION_RATE,
    shares: [],
    distributions: [],
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
    deadline: payload.deadline || null,
    is_owner: true,
    commission_rate: COMMISSION_RATE,
    shares: [],
    distributions: [],
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
  const mine = project.shares.find((share) => share.is_me);
  if (mine) mine.amount += payload.amount;
  else project.shares.push({ is_me: true, amount: payload.amount, percent: 0 });
  for (const share of project.shares) {
    share.percent =
      Math.round((share.amount * 1000) / project.raised_amount) / 10;
  }
  // RG-M05 : les règles deviennent immuables dès la première contribution.
  project.rules_locked = true;

  if (project.raised_amount >= project.target_amount) {
    project.status = InvestmentProjectStatus.COMPLETED;
  }

  return clone(project);
}

// Déclaration d'un bénéfice : en attente de validation, sans mouvement de fonds.
function declareProfit(config: InternalAxiosRequestConfig): DistributionDTO | null {
  const match = config.url?.match(PROFIT_URL);
  if (!match) return null;

  const payload = (config.data ?? {}) as DeclareProfitPayload;
  const project = projects.find((p) => p.id === match[1]);
  if (!project || !project.is_owner) return null;
  if (project.status !== InvestmentProjectStatus.FUNDED) return null;
  if (!(payload.amount > 0)) return null;
  if (
    project.distributions.some(
      (d) => d.status === InvestmentDistributionStatus.PENDING,
    )
  ) {
    return null;
  }

  const record: DistributionDTO = {
    id: `dist-${Date.now()}`,
    amount: payload.amount,
    distributed_amount: null,
    status: InvestmentDistributionStatus.PENDING,
    declared_at: new Date().toISOString(),
    my_share: 0,
  };
  project.distributions.unshift(record);
  return clone(record);
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
  if (method === "post" && PROFIT_URL.test(url)) {
    return async (cfg) => toResponse(declareProfit(cfg));
  }

  return null;
}
