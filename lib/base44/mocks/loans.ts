import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  GroupLoan,
  InstallmentStatus,
  LoanInstallment,
  LoanStatus,
  RequestLoanPayload,
} from "@/types/modules/finance";

type InstallmentDTO = Omit<LoanInstallment, "due_date" | "paid_at"> & {
  due_date: string | null;
  paid_at: string | null;
};

type LoanDTO = Omit<
  GroupLoan,
  "requested_at" | "sponsor_confirmed_at" | "decision_at" | "installments"
> & {
  requested_at: string | null;
  sponsor_confirmed_at: string | null;
  decision_at: string | null;
  installments: InstallmentDTO[];
};

// Correspondance interne avec le groupe d'épargne (fg-3) du mock.
const MEMBER_NAMES: Record<string, string> = {
  "fm-8": "Bureau de l'association",
  "fm-9": "Kadiatou Sylla",
  "fm-10": "Alpha Baldé",
};

const ELIGIBLE_GROUPS: Record<
  string,
  { name: string; interest_rate: number; sponsor: string }
> = {
  "fg-3": {
    name: "Épargne solidarité",
    interest_rate: 5,
    sponsor: "Bureau de l'association",
  },
};

const store: LoanDTO[] = [
  {
    id: "ln-1",
    group_id: "fg-3",
    group_name: "Épargne solidarité",
    member_id: "fm-9",
    member_name: "Kadiatou Sylla",
    sponsor_name: "Bureau de l'association",
    amount: 60000,
    suggested_amount: 45000,
    interest_rate: 5,
    total_due: 0,
    repaid_amount: 0,
    status: LoanStatus.REQUESTED,
    requested_at: "2026-02-27T00:00:00.000Z",
    sponsor_confirmed_at: null,
    decision_at: null,
    installments: [],
  },
  {
    id: "ln-2",
    group_id: "fg-3",
    group_name: "Épargne solidarité",
    member_id: "fm-10",
    member_name: "Alpha Baldé",
    sponsor_name: "Bureau de l'association",
    amount: 50000,
    suggested_amount: 40000,
    interest_rate: 5,
    total_due: 52500,
    repaid_amount: 17500,
    status: LoanStatus.APPROVED,
    requested_at: "2026-02-01T00:00:00.000Z",
    sponsor_confirmed_at: "2026-02-03T00:00:00.000Z",
    decision_at: "2026-02-05T00:00:00.000Z",
    installments: [
      {
        id: "inst-1",
        position: 1,
        due_date: "2026-03-05T00:00:00.000Z",
        amount: 17500,
        status: InstallmentStatus.PAID,
        paid_at: "2026-03-05T00:00:00.000Z",
      },
      {
        id: "inst-2",
        position: 2,
        due_date: "2026-04-05T00:00:00.000Z",
        amount: 17500,
        status: InstallmentStatus.PENDING,
        paid_at: null,
      },
      {
        id: "inst-3",
        position: 3,
        due_date: "2026-05-05T00:00:00.000Z",
        amount: 17500,
        status: InstallmentStatus.PENDING,
        paid_at: null,
      },
    ],
  },
  {
    id: "ln-3",
    group_id: "fg-3",
    group_name: "Épargne solidarité",
    member_id: "fm-9",
    member_name: "Kadiatou Sylla",
    sponsor_name: "Bureau de l'association",
    amount: 25000,
    suggested_amount: 20000,
    interest_rate: 5,
    total_due: 26250,
    repaid_amount: 26250,
    status: LoanStatus.REPAID,
    requested_at: "2025-12-01T00:00:00.000Z",
    sponsor_confirmed_at: "2025-12-03T00:00:00.000Z",
    decision_at: "2025-12-05T00:00:00.000Z",
    installments: [
      {
        id: "inst-4",
        position: 1,
        due_date: "2026-01-05T00:00:00.000Z",
        amount: 26250,
        status: InstallmentStatus.PAID,
        paid_at: "2026-01-05T00:00:00.000Z",
      },
    ],
  },
  {
    id: "ln-4",
    group_id: "fg-3",
    group_name: "Épargne solidarité",
    member_id: "fm-10",
    member_name: "Alpha Baldé",
    sponsor_name: "Bureau de l'association",
    amount: 80000,
    suggested_amount: 50000,
    interest_rate: 5,
    total_due: 0,
    repaid_amount: 0,
    status: LoanStatus.REJECTED,
    requested_at: "2026-01-10T00:00:00.000Z",
    sponsor_confirmed_at: "2026-01-12T00:00:00.000Z",
    decision_at: "2026-01-14T00:00:00.000Z",
    installments: [],
  },
];

const LIST_URL = /^\/organizations\/[^/]+\/loans$/;
const REQUEST_URL =
  /^\/organizations\/[^/]+\/financial-groups\/([^/]+)\/loans$/;
const CONFIRM_URL =
  /^\/organizations\/[^/]+\/loans\/([^/]+)\/sponsor-confirm$/;
const DECIDE_URL = /^\/organizations\/[^/]+\/loans\/([^/]+)\/decision$/;
const REPAY_URL =
  /^\/organizations\/[^/]+\/loans\/([^/]+)\/installments\/([^/]+)\/repay$/;

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

function listLoans(config: InternalAxiosRequestConfig): LoanDTO[] {
  const params = (config.params ?? {}) as { search?: string; status?: string };
  let result = store.slice();

  if (params.search) {
    const needle = params.search.toLowerCase();
    result = result.filter(
      (l) =>
        l.member_name.toLowerCase().includes(needle) ||
        l.group_name.toLowerCase().includes(needle),
    );
  }

  if (params.status && params.status !== "all") {
    result = result.filter((l) => l.status === params.status);
  }

  return clone(result);
}

function requestLoan(config: InternalAxiosRequestConfig): LoanDTO | null {
  const match = config.url?.match(REQUEST_URL);
  if (!match) return null;

  const groupInfo = ELIGIBLE_GROUPS[match[1]];
  if (!groupInfo) return null;

  const payload = (config.data ?? {}) as RequestLoanPayload;
  const record: LoanDTO = {
    id: `ln-${Date.now()}`,
    group_id: match[1],
    group_name: groupInfo.name,
    member_id: payload.member_id,
    member_name: MEMBER_NAMES[payload.member_id] ?? "Membre",
    sponsor_name: groupInfo.sponsor,
    amount: payload.amount,
    suggested_amount: Math.round((payload.amount * 0.75) / 1000) * 1000,
    interest_rate: groupInfo.interest_rate,
    total_due: 0,
    repaid_amount: 0,
    status: LoanStatus.REQUESTED,
    requested_at: new Date().toISOString(),
    sponsor_confirmed_at: null,
    decision_at: null,
    installments: [],
  };
  store.unshift(record);
  return clone(record);
}

function confirmSponsor(config: InternalAxiosRequestConfig): LoanDTO | null {
  const match = config.url?.match(CONFIRM_URL);
  if (!match) return null;

  const loan = store.find((l) => l.id === match[1]);
  if (!loan) return null;

  if (loan.status === LoanStatus.REQUESTED) {
    loan.status = LoanStatus.SPONSOR_CONFIRMED;
    loan.sponsor_confirmed_at = new Date().toISOString();
  }

  return clone(loan);
}

function decideLoan(config: InternalAxiosRequestConfig): LoanDTO | null {
  const match = config.url?.match(DECIDE_URL);
  if (!match) return null;

  const loan = store.find((l) => l.id === match[1]);
  if (!loan) return null;

  const body = (config.data ?? {}) as { approved?: boolean };
  if (loan.status !== LoanStatus.SPONSOR_CONFIRMED) {
    return clone(loan);
  }

  loan.decision_at = new Date().toISOString();

  if (body.approved) {
    loan.status = LoanStatus.APPROVED;
    const count = 3;
    const total = Math.round(loan.amount * (1 + loan.interest_rate / 100));
    loan.total_due = total;
    const per = Math.floor(total / count);
    const remainder = total - per * count;
    loan.installments = Array.from({ length: count }, (_, i) => ({
      id: `inst-${Date.now()}-${i}`,
      position: i + 1,
      due_date: new Date(
        Date.now() + (i + 1) * 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      amount: per + (i === count - 1 ? remainder : 0),
      status: InstallmentStatus.PENDING,
      paid_at: null,
    }));
  } else {
    loan.status = LoanStatus.REJECTED;
  }

  return clone(loan);
}

function repayInstallment(config: InternalAxiosRequestConfig): LoanDTO | null {
  const match = config.url?.match(REPAY_URL);
  if (!match) return null;

  const loan = store.find((l) => l.id === match[1]);
  if (!loan) return null;

  const installment = loan.installments.find((i) => i.id === match[2]);
  if (!installment) return null;

  if (installment.status === InstallmentStatus.PENDING) {
    installment.status = InstallmentStatus.PAID;
    installment.paid_at = new Date().toISOString();
    loan.repaid_amount += installment.amount;
    if (loan.repaid_amount >= loan.total_due) {
      loan.status = LoanStatus.REPAID;
    }
  }

  return clone(loan);
}

export function loansMockAdapter(
  config: InternalAxiosRequestConfig,
): AxiosAdapter | null {
  const method = (config.method ?? "get").toLowerCase();
  const url = config.url ?? "";

  if (method === "get" && LIST_URL.test(url)) {
    return async (cfg) => toResponse(listLoans(cfg));
  }
  if (method === "post" && REQUEST_URL.test(url)) {
    return async (cfg) => toResponse(requestLoan(cfg));
  }
  if (method === "post" && CONFIRM_URL.test(url)) {
    return async (cfg) => toResponse(confirmSponsor(cfg));
  }
  if (method === "post" && DECIDE_URL.test(url)) {
    return async (cfg) => toResponse(decideLoan(cfg));
  }
  if (method === "post" && REPAY_URL.test(url)) {
    return async (cfg) => toResponse(repayInstallment(cfg));
  }

  return null;
}
