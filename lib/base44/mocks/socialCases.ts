import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  ContributeSocialCasePayload,
  CreateSocialCasePayload,
  SocialCase,
  SocialCaseStatus,
  SocialCaseType,
} from "@/types/modules/community";

// Représentation sérialisable (dates en chaînes ISO) renvoyée par le mock.
type SocialCaseDTO = Omit<
  SocialCase,
  "disbursed_at" | "created_at" | "contributors"
> & {
  disbursed_at: string | null;
  created_at: string | null;
  contributors?: {
    id: string;
    name: string;
    amount: number;
    contributed_at: string | null;
    anonymous: boolean;
  }[];
};

const store: SocialCaseDTO[] = [
  {
    id: "sc-1",
    organization_id: "org-1",
    title: "Soutien médical urgent",
    description:
      "Membre hospitalisé nécessitant une prise en charge des frais médicaux.",
    type: SocialCaseType.ILLNESS,
    status: SocialCaseStatus.SUBMITTED,
    beneficiary_name: "Mamadou Sow",
    target_amount: 1000000,
    collected_amount: 0,
    currency: "GNF",
    contributors_visible: true,
    committee_note: null,
    disbursed_at: null,
    created_at: "2026-02-01T00:00:00.000Z",
    contributors: [],
  },
  {
    id: "sc-2",
    organization_id: "org-1",
    title: "Funérailles d'un membre",
    description: "Aide aux obsèques d'un membre actif de la communauté.",
    type: SocialCaseType.DEATH,
    status: SocialCaseStatus.APPROVED,
    beneficiary_name: "Famille Diallo",
    target_amount: 2000000,
    collected_amount: 850000,
    currency: "GNF",
    contributors_visible: true,
    committee_note: "Validé à l'unanimité lors de la séance du 10 février.",
    disbursed_at: null,
    created_at: "2026-02-05T00:00:00.000Z",
    contributors: [
      {
        id: "c-1",
        name: "Jean Dupont",
        amount: 500000,
        contributed_at: "2026-02-06T00:00:00.000Z",
        anonymous: false,
      },
      {
        id: "c-2",
        name: "Aminata Bah",
        amount: 350000,
        contributed_at: "2026-02-07T00:00:00.000Z",
        anonymous: false,
      },
    ],
  },
  {
    id: "sc-3",
    organization_id: "org-1",
    title: "Sinistre incendie",
    description: "Incendie ayant touché le domicile d'une famille adhérente.",
    type: SocialCaseType.DISASTER,
    status: SocialCaseStatus.FUNDED,
    beneficiary_name: "Famille Camara",
    target_amount: 1500000,
    collected_amount: 1500000,
    currency: "GNF",
    contributors_visible: false,
    committee_note: "Aide d'urgence validée.",
    disbursed_at: null,
    created_at: "2026-01-20T00:00:00.000Z",
    contributors: [
      {
        id: "c-3",
        name: "Contributeur anonyme",
        amount: 1500000,
        contributed_at: "2026-01-22T00:00:00.000Z",
        anonymous: true,
      },
    ],
  },
];

const LIST_URL = /^\/organizations\/[^/]+\/social-cases$/;
const ITEM_URL = /^\/organizations\/[^/]+\/social-cases\/([^/]+)$/;
const CONTRIBUTIONS_URL =
  /^\/organizations\/[^/]+\/social-cases\/([^/]+)\/contributions$/;

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

function listSocialCases(config: InternalAxiosRequestConfig): SocialCaseDTO[] {
  const params = (config.params ?? {}) as { search?: string; status?: string };
  let result = store.slice();

  if (params.search) {
    const needle = params.search.toLowerCase();
    result = result.filter(
      (c) =>
        c.title.toLowerCase().includes(needle) ||
        c.beneficiary_name.toLowerCase().includes(needle),
    );
  }

  if (params.status && params.status !== "all") {
    result = result.filter((c) => c.status === params.status);
  }

  return clone(result);
}

function createSocialCase(config: InternalAxiosRequestConfig): SocialCaseDTO {
  const payload = (config.data ?? {}) as CreateSocialCasePayload;
  const record: SocialCaseDTO = {
    id: `sc-${Date.now()}`,
    organization_id: "org-1",
    title: payload.title,
    description: payload.description,
    type: payload.type,
    status: SocialCaseStatus.SUBMITTED,
    beneficiary_name: payload.beneficiary_name,
    target_amount: payload.target_amount,
    collected_amount: 0,
    currency: "GNF",
    contributors_visible: payload.contributors_visible,
    committee_note: null,
    disbursed_at: null,
    created_at: new Date().toISOString(),
    contributors: [],
  };
  store.unshift(record);
  return clone(record);
}

function updateSocialCase(
  config: InternalAxiosRequestConfig,
): SocialCaseDTO | null {
  const match = config.url?.match(ITEM_URL);
  if (!match) return null;

  const payload = (config.data ?? {}) as {
    action: string;
    committee_note?: string;
  };
  const record = store.find((c) => c.id === match[1]);
  if (!record) return null;

  if (payload.action === "approve") {
    record.status = SocialCaseStatus.APPROVED;
    record.committee_note = payload.committee_note ?? null;
  } else if (payload.action === "reject") {
    record.status = SocialCaseStatus.REJECTED;
    record.committee_note = payload.committee_note ?? null;
  } else if (payload.action === "disburse") {
    if (record.status === SocialCaseStatus.FUNDED) {
      record.status = SocialCaseStatus.DISBURSED;
      record.disbursed_at = new Date().toISOString();
    }
  }

  return clone(record);
}

function contribute(config: InternalAxiosRequestConfig): SocialCaseDTO | null {
  const match = config.url?.match(CONTRIBUTIONS_URL);
  if (!match) return null;

  const payload = (config.data ?? {}) as ContributeSocialCasePayload;
  const record = store.find((c) => c.id === match[1]);
  if (!record) return null;

  record.contributors = record.contributors ?? [];
  record.contributors.push({
    id: `c-${Date.now()}`,
    name: payload.anonymous ? "Contributeur anonyme" : payload.contributor_name,
    amount: payload.amount,
    contributed_at: new Date().toISOString(),
    anonymous: payload.anonymous,
  });
  record.collected_amount += payload.amount;

  if (
    record.status === SocialCaseStatus.APPROVED &&
    record.collected_amount >= record.target_amount
  ) {
    record.status = SocialCaseStatus.FUNDED;
  }

  return clone(record);
}

export function socialCasesMockAdapter(
  config: InternalAxiosRequestConfig,
): AxiosAdapter | null {
  const method = (config.method ?? "get").toLowerCase();
  const url = config.url ?? "";

  if (method === "get" && LIST_URL.test(url)) {
    return async (cfg) => toResponse(listSocialCases(cfg));
  }
  if (method === "post" && LIST_URL.test(url)) {
    return async (cfg) => toResponse(createSocialCase(cfg));
  }
  if (method === "post" && CONTRIBUTIONS_URL.test(url)) {
    return async (cfg) => toResponse(contribute(cfg));
  }
  if (method === "patch" && ITEM_URL.test(url)) {
    return async (cfg) => toResponse(updateSocialCase(cfg));
  }

  return null;
}
