import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  CreateTransactionPayload,
  TransactionType,
  TreasuryTransaction,
} from "@/types/modules/community";
import { TreasuryAccountType } from "@/types/modules/accounting";

// Représentation sérialisable (dates en chaînes ISO) renvoyée par le mock.
type TransactionDTO = Omit<
  TreasuryTransaction,
  "date" | "created_at"
> & {
  date: string | null;
  created_at: string | null;
};

const DAY_MS = 86_400_000;

function at(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * DAY_MS).toISOString();
}

const store: TransactionDTO[] = [
  {
    id: "tx-1",
    organization_id: "org-1",
    type: TransactionType.INCOME,
    label: "Cotisations mensuelles des membres",
    amount: 1500000,
    account: TreasuryAccountType.MOBILE_MONEY,
    date: at(-5),
    reference: "Reçu MM-2026-0412",
    created_at: at(-5),
  },
  {
    id: "tx-2",
    organization_id: "org-1",
    type: TransactionType.EXPENSE,
    label: "Location de la salle de réunion",
    amount: 200000,
    account: TreasuryAccountType.CASH,
    date: at(-8),
    reference: "Quittance loc-118",
    created_at: at(-8),
  },
  {
    id: "tx-3",
    organization_id: "org-1",
    type: TransactionType.INCOME,
    label: "Don de la coopérative des femmes",
    amount: 500000,
    account: TreasuryAccountType.BANK,
    date: at(-12),
    reference: "Virement BCI-221",
    created_at: at(-12),
  },
  {
    id: "tx-4",
    organization_id: "org-1",
    type: TransactionType.EXPENSE,
    label: "Fournitures de bureau",
    amount: 120000,
    account: TreasuryAccountType.CASH,
    date: at(-20),
    reference: "Facture F-045",
    created_at: at(-20),
  },
  {
    id: "tx-5",
    organization_id: "org-1",
    type: TransactionType.EXPENSE,
    label: "Transport de la délégation",
    amount: 75000,
    account: TreasuryAccountType.MOBILE_MONEY,
    date: at(-3),
    reference: "Reçu MM-2026-0419",
    created_at: at(-3),
  },
  {
    id: "tx-6",
    organization_id: "org-1",
    type: TransactionType.INCOME,
    label: "Subvention de la mairie",
    amount: 800000,
    account: TreasuryAccountType.BANK,
    date: at(-40),
    reference: "Ordre de virement M-102",
    created_at: at(-40),
  },
];

const LIST_URL = /^\/organizations\/[^/]+\/treasury$/;

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

function listTransactions(config: InternalAxiosRequestConfig): TransactionDTO[] {
  const orgId = extractOrgId(config.url ?? "");
  return clone(
    store
      .filter((t) => t.organization_id === orgId)
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")),
  );
}

function createTransaction(config: InternalAxiosRequestConfig): TransactionDTO {
  const payload = (config.data ?? {}) as CreateTransactionPayload;
  const orgId = extractOrgId(config.url ?? "") ?? "";
  const now = new Date().toISOString();

  const record: TransactionDTO = {
    id: `tx-${Date.now()}`,
    organization_id: orgId,
    type: payload.type,
    label: payload.label,
    amount: payload.amount,
    account: payload.account,
    date: payload.date ? new Date(payload.date).toISOString() : now,
    reference: payload.reference ?? "",
    created_at: now,
  };
  store.unshift(record);
  return clone(record);
}

export function treasuryMockAdapter(
  config: InternalAxiosRequestConfig,
): AxiosAdapter | null {
  const method = (config.method ?? "get").toLowerCase();
  const url = config.url ?? "";

  if (method === "get" && LIST_URL.test(url)) {
    return async (cfg) => toResponse(listTransactions(cfg));
  }
  if (method === "post" && LIST_URL.test(url)) {
    return async (cfg) => toResponse(createTransaction(cfg));
  }

  return null;
}
