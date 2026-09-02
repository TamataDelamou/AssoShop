import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  Beneficiary,
  BeneficiaryCategory,
  BeneficiaryStatus,
  CreateBeneficiaryPayload,
  CreateEvaluationPayload,
  ProjectEvaluation,
} from "@/types/modules/community";

// Représentations sérialisables (dates en chaînes ISO) renvoyées par le mock.
// Les noms de projets sont joints côté client (useBeneficiaries).
type BeneficiaryDTO = Omit<Beneficiary, "registered_at" | "project_name"> & {
  registered_at: string | null;
};
type EvaluationDTO = Omit<ProjectEvaluation, "evaluated_at" | "project_name"> & {
  evaluated_at: string | null;
};

const DAY_MS = 86_400_000;

function at(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * DAY_MS).toISOString();
}

const beneficiariesStore: BeneficiaryDTO[] = [
  {
    id: "b-1",
    organization_id: "org-1",
    project_id: "prj-1",
    name: "Quartier Bonfi (120 foyers)",
    category: BeneficiaryCategory.CONSTRUCTION,
    status: BeneficiaryStatus.SUPPORTED,
    registered_at: at(-60),
  },
  {
    id: "b-2",
    organization_id: "org-1",
    project_id: "prj-1",
    name: "École primaire de Bonfi",
    category: BeneficiaryCategory.HEALTH,
    status: BeneficiaryStatus.SUPPORTED,
    registered_at: at(-45),
  },
  {
    id: "b-3",
    organization_id: "org-1",
    project_id: "prj-2",
    name: "Jeunes du quartier (85 jeunes)",
    category: BeneficiaryCategory.EDUCATION,
    status: BeneficiaryStatus.COMPLETED,
    registered_at: at(-200),
  },
  {
    id: "b-4",
    organization_id: "org-1",
    project_id: "prj-3",
    name: "Communautés riveraines (300 habitants)",
    category: BeneficiaryCategory.AGRICULTURE,
    status: BeneficiaryStatus.SUPPORTED,
    registered_at: at(-30),
  },
];

const evaluationsStore: EvaluationDTO[] = [
  {
    id: "ev-1",
    organization_id: "org-1",
    project_id: "prj-2",
    objectives:
      "Créer un espace d'étude et d'activités pour les jeunes du quartier.",
    results:
      "Toiture refaite, salle d'étude aménagée, 85 jeunes accueillis depuis l'ouverture.",
    impact:
      "Baisse de l'absentéisme scolaire et renforcement de la cohésion entre jeunes.",
    rating: 4,
    evaluated_at: at(-30),
  },
  {
    id: "ev-2",
    organization_id: "org-1",
    project_id: "prj-1",
    objectives: "Accès à l'eau potable pour 120 foyers du quartier Bonfi.",
    results: "Forage réalisé, raccordement du réseau en cours.",
    impact: "Premiers foyers alimentés ; réduction attendue des maladies hydriques.",
    rating: 3,
    evaluated_at: at(-10),
  },
];

const BENEFICIARIES_URL = /^\/organizations\/[^/]+\/beneficiaries$/;
const BENEFICIARY_URL = /^\/organizations\/([^/]+)\/beneficiaries\/([^/]+)$/;
const EVALUATIONS_URL = /^\/organizations\/[^/]+\/evaluations$/;

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

function listBeneficiaries(config: InternalAxiosRequestConfig): BeneficiaryDTO[] {
  const orgId = extractOrgId(config.url ?? "");
  return clone(
    beneficiariesStore
      .filter((b) => b.organization_id === orgId)
      .sort((a, b) => (b.registered_at ?? "").localeCompare(a.registered_at ?? "")),
  );
}

function createBeneficiary(config: InternalAxiosRequestConfig): BeneficiaryDTO {
  const payload = (config.data ?? {}) as CreateBeneficiaryPayload;
  const orgId = extractOrgId(config.url ?? "") ?? "";
  const record: BeneficiaryDTO = {
    id: `b-${Date.now()}`,
    organization_id: orgId,
    project_id: payload.project_id,
    name: payload.name,
    category: payload.category,
    status: BeneficiaryStatus.SUPPORTED,
    registered_at: new Date().toISOString(),
  };
  beneficiariesStore.push(record);
  return clone(record);
}

function updateBeneficiary(config: InternalAxiosRequestConfig): BeneficiaryDTO {
  const match = BENEFICIARY_URL.exec(config.url ?? "");
  const [, , beneficiaryId] = match ?? [];
  const payload = (config.data ?? {}) as { status?: BeneficiaryStatus };

  const record = beneficiariesStore.find((b) => b.id === beneficiaryId);
  if (!record) throw new Error("Bénéficiaire introuvable");
  if (payload.status) record.status = payload.status;
  return clone(record);
}

function listEvaluations(config: InternalAxiosRequestConfig): EvaluationDTO[] {
  const orgId = extractOrgId(config.url ?? "");
  return clone(
    evaluationsStore
      .filter((e) => e.organization_id === orgId)
      .sort((a, b) => (b.evaluated_at ?? "").localeCompare(a.evaluated_at ?? "")),
  );
}

function createEvaluation(config: InternalAxiosRequestConfig): EvaluationDTO {
  const payload = (config.data ?? {}) as CreateEvaluationPayload;
  const orgId = extractOrgId(config.url ?? "") ?? "";
  const record: EvaluationDTO = {
    id: `ev-${Date.now()}`,
    organization_id: orgId,
    project_id: payload.project_id,
    objectives: payload.objectives,
    results: payload.results,
    impact: payload.impact,
    rating: payload.rating,
    evaluated_at: new Date().toISOString(),
  };
  evaluationsStore.push(record);
  return clone(record);
}

export function beneficiariesMockAdapter(
  config: InternalAxiosRequestConfig,
): AxiosAdapter | null {
  const method = (config.method ?? "get").toLowerCase();
  const url = config.url ?? "";

  if (method === "get" && BENEFICIARIES_URL.test(url)) {
    return async (cfg) => toResponse(listBeneficiaries(cfg));
  }
  if (method === "post" && BENEFICIARIES_URL.test(url)) {
    return async (cfg) => toResponse(createBeneficiary(cfg));
  }
  if (method === "patch" && BENEFICIARY_URL.test(url)) {
    return async (cfg) => toResponse(updateBeneficiary(cfg));
  }
  if (method === "get" && EVALUATIONS_URL.test(url)) {
    return async (cfg) => toResponse(listEvaluations(cfg));
  }
  if (method === "post" && EVALUATIONS_URL.test(url)) {
    return async (cfg) => toResponse(createEvaluation(cfg));
  }

  return null;
}
