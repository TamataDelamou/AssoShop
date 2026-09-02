import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  Contribution,
  ContributionMethod,
  ContributionStatus,
  PayContributionPayload,
  ValidateContributionPayload,
} from "@/types/modules/community";

// Représentation sérialisable (dates en chaînes ISO) renvoyée par le mock.
type ContributionDTO = Omit<Contribution, "due_date" | "paid_at"> & {
  due_date: string | null;
  paid_at: string | null;
};

const MEMBER_NAMES: Record<
  string,
  { name: string; email?: string; phone?: string }
> = {
  "1": {
    name: "Jean Dupont",
    email: "jean@example.com",
    phone: "+224 600 00 00 00",
  },
  "2": {
    name: "Aminata Bah",
    email: "aminata@example.com",
    phone: "+224 620 00 00 00",
  },
};

const store: ContributionDTO[] = [
  {
    id: "ctb-1",
    organization_id: "org-1",
    member_id: "1",
    member: {
      id: "1",
      name: "Jean Dupont",
      email: "jean@example.com",
      phone: "+224 600 00 00 00",
    },
    amount: 50000,
    period_label: "Janvier 2026",
    due_date: "2026-01-31T00:00:00.000Z",
    status: ContributionStatus.DUE,
    method: null,
    paid_at: null,
    paid_by: null,
  },
  {
    id: "ctb-2",
    organization_id: "org-1",
    member_id: "1",
    member: {
      id: "1",
      name: "Jean Dupont",
      email: "jean@example.com",
      phone: "+224 600 00 00 00",
    },
    amount: 50000,
    period_label: "Février 2026",
    due_date: "2026-02-28T00:00:00.000Z",
    status: ContributionStatus.PENDING,
    method: ContributionMethod.CASH,
    paid_at: "2026-02-10T00:00:00.000Z",
    paid_by: { id: "2", name: "Aminata Bah" },
  },
  {
    id: "ctb-3",
    organization_id: "org-1",
    member_id: "2",
    member: {
      id: "2",
      name: "Aminata Bah",
      email: "aminata@example.com",
      phone: "+224 620 00 00 00",
    },
    amount: 50000,
    period_label: "Janvier 2026",
    due_date: "2026-01-31T00:00:00.000Z",
    status: ContributionStatus.PAID,
    method: ContributionMethod.ONLINE,
    paid_at: "2026-01-05T00:00:00.000Z",
    paid_by: null,
  },
];

const LIST_URL = /^\/organizations\/[^/]+\/contributions$/;
const ITEM_URL = /^\/organizations\/[^/]+\/contributions\/([^/]+)$/;

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

function listContributions(config: InternalAxiosRequestConfig): ContributionDTO[] {
  const params = (config.params ?? {}) as { search?: string; status?: string };
  let result = store.slice();

  if (params.search) {
    const needle = params.search.toLowerCase();
    result = result.filter(
      (c) =>
        c.member?.name.toLowerCase().includes(needle) ||
        c.member?.email?.toLowerCase().includes(needle),
    );
  }

  if (params.status && params.status !== "all") {
    result = result.filter((c) => c.status === params.status);
  }

  return clone(result);
}

function createContribution(config: InternalAxiosRequestConfig): ContributionDTO {
  const payload = (config.data ?? {}) as PayContributionPayload;
  const member = MEMBER_NAMES[payload.beneficiary_member_id] ?? {
    name: "Membre",
  };
  const now = new Date();

  const record: ContributionDTO = {
    id: `ctb-${Date.now()}`,
    organization_id: "org-1",
    member_id: payload.beneficiary_member_id,
    member: {
      id: payload.beneficiary_member_id,
      name: member.name,
      email: member.email,
      phone: member.phone,
    },
    amount: payload.amount,
    period_label: now.toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    }),
    due_date: now.toISOString(),
    status:
      payload.method === ContributionMethod.ONLINE
        ? ContributionStatus.PAID
        : ContributionStatus.PENDING,
    method: payload.method,
    paid_at: now.toISOString(),
    paid_by: null,
  };

  if (payload.contribution_id) {
    const existing = store.find((c) => c.id === payload.contribution_id);
    if (existing) {
      Object.assign(existing, {
        status: record.status,
        method: record.method,
        paid_at: record.paid_at,
      });
      return clone(existing);
    }
  }

  store.unshift(record);
  return clone(record);
}

function validateContribution(
  config: InternalAxiosRequestConfig,
): ContributionDTO | null {
  const match = config.url?.match(ITEM_URL);
  if (!match) return null;

  const contributionId = match[1];
  const payload = (config.data ?? {}) as ValidateContributionPayload;
  const record = store.find((c) => c.id === contributionId);
  if (!record) return null;

  record.status =
    payload.decision === "approve"
      ? ContributionStatus.PAID
      : ContributionStatus.REJECTED;
  record.validated_by = payload.validator_name;
  if (payload.decision === "approve") {
    record.paid_at = new Date().toISOString();
  }

  return clone(record);
}

export function contributionsMockAdapter(
  config: InternalAxiosRequestConfig,
): AxiosAdapter | null {
  const method = (config.method ?? "get").toLowerCase();
  const url = config.url ?? "";

  if (method === "get" && LIST_URL.test(url)) {
    return async (cfg) => toResponse(listContributions(cfg));
  }
  if (method === "post" && LIST_URL.test(url)) {
    return async (cfg) => toResponse(createContribution(cfg));
  }
  if (method === "patch" && ITEM_URL.test(url)) {
    return async (cfg) => toResponse(validateContribution(cfg));
  }

  return null;
}
