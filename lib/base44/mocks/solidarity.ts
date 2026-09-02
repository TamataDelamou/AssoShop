import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  ClaimStatus,
  DeclareClaimPayload,
  EnrollInsurancePayload,
  GuaranteeFund,
  InsuranceClaim,
  InsuranceEnrollment,
  InsuranceEnrollmentStatus,
} from "@/types/modules/finance";

type EnrollmentDTO = Omit<InsuranceEnrollment, "joined_at"> & {
  joined_at: string | null;
};

type ClaimDTO = Omit<InsuranceClaim, "submitted_at" | "decided_at"> & {
  submitted_at: string | null;
  decided_at: string | null;
};

interface BundleDTO {
  fund: GuaranteeFund;
  enrollments: EnrollmentDTO[];
  claims: ClaimDTO[];
}

const store: BundleDTO = {
  fund: {
    balance: 1500000,
    levy_rate: 0.004,
    cap_amount: 1000,
    total_collected: 2200000,
    total_used: 700000,
  },
  enrollments: [
    {
      id: "enr-1",
      member_id: "fm-9",
      member_name: "Kadiatou Sylla",
      status: InsuranceEnrollmentStatus.ACTIVE,
      joined_at: "2026-01-20T00:00:00.000Z",
    },
    {
      id: "enr-2",
      member_id: "fm-10",
      member_name: "Alpha Baldé",
      status: InsuranceEnrollmentStatus.ACTIVE,
      joined_at: "2026-01-25T00:00:00.000Z",
    },
    {
      id: "enr-3",
      member_id: "fm-1",
      member_name: "Mamadou Sow",
      status: InsuranceEnrollmentStatus.SUSPENDED,
      joined_at: "2025-12-22T00:00:00.000Z",
    },
  ],
  claims: [
    {
      id: "cl-1",
      member_id: "fm-9",
      member_name: "Kadiatou Sylla",
      description: "Hospitalisation — frais médicaux",
      amount: 200000,
      indemnity: 0,
      status: ClaimStatus.SUBMITTED,
      submitted_at: "2026-02-26T00:00:00.000Z",
      decided_at: null,
    },
    {
      id: "cl-2",
      member_id: "fm-10",
      member_name: "Alpha Baldé",
      description: "Perte de marchandises (incendie)",
      amount: 350000,
      indemnity: 0,
      status: ClaimStatus.UNDER_REVIEW,
      submitted_at: "2026-02-20T00:00:00.000Z",
      decided_at: null,
    },
    {
      id: "cl-3",
      member_id: "fm-1",
      member_name: "Mamadou Sow",
      description: "Inondation du local commercial",
      amount: 150000,
      indemnity: 150000,
      status: ClaimStatus.APPROVED,
      submitted_at: "2026-01-10T00:00:00.000Z",
      decided_at: "2026-01-15T00:00:00.000Z",
    },
    {
      id: "cl-4",
      member_id: "fm-9",
      member_name: "Kadiatou Sylla",
      description: "Vol de téléphone",
      amount: 80000,
      indemnity: 0,
      status: ClaimStatus.REJECTED,
      submitted_at: "2026-01-05T00:00:00.000Z",
      decided_at: "2026-01-08T00:00:00.000Z",
    },
  ],
};

const BUNDLE_URL = /^\/organizations\/[^/]+\/solidarity$/;
const ENROLL_URL = /^\/organizations\/[^/]+\/solidarity\/enrollments$/;
const CLAIM_URL = /^\/organizations\/[^/]+\/solidarity\/claims$/;
const DECIDE_URL =
  /^\/organizations\/[^/]+\/solidarity\/claims\/([^/]+)\/decision$/;

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

function getBundle(): BundleDTO {
  return clone(store);
}

function enroll(config: InternalAxiosRequestConfig): EnrollmentDTO {
  const payload = (config.data ?? {}) as EnrollInsurancePayload;
  const record: EnrollmentDTO = {
    id: `enr-${Date.now()}`,
    member_id: payload.member_id,
    member_name: payload.member_name,
    status: InsuranceEnrollmentStatus.ACTIVE,
    joined_at: new Date().toISOString(),
  };
  store.enrollments.unshift(record);
  return clone(record);
}

function declareClaim(config: InternalAxiosRequestConfig): ClaimDTO {
  const payload = (config.data ?? {}) as DeclareClaimPayload;
  const record: ClaimDTO = {
    id: `cl-${Date.now()}`,
    member_id: payload.member_id,
    member_name: payload.member_name,
    description: payload.description,
    amount: payload.amount,
    indemnity: 0,
    status: ClaimStatus.SUBMITTED,
    submitted_at: new Date().toISOString(),
    decided_at: null,
  };
  store.claims.unshift(record);
  return clone(record);
}

function decideClaim(config: InternalAxiosRequestConfig): ClaimDTO | null {
  const match = config.url?.match(DECIDE_URL);
  if (!match) return null;

  const claim = store.claims.find((c) => c.id === match[1]);
  if (!claim) return null;

  const body = (config.data ?? {}) as { approved?: boolean };
  if (
    claim.status !== ClaimStatus.SUBMITTED &&
    claim.status !== ClaimStatus.UNDER_REVIEW
  ) {
    return clone(claim);
  }

  claim.decided_at = new Date().toISOString();
  if (body.approved) {
    claim.status = ClaimStatus.APPROVED;
    claim.indemnity = claim.amount;
    store.fund.balance -= claim.amount;
    store.fund.total_used += claim.amount;
  } else {
    claim.status = ClaimStatus.REJECTED;
    claim.indemnity = 0;
  }

  return clone(claim);
}

export function solidarityMockAdapter(
  config: InternalAxiosRequestConfig,
): AxiosAdapter | null {
  const method = (config.method ?? "get").toLowerCase();
  const url = config.url ?? "";

  if (method === "get" && BUNDLE_URL.test(url)) {
    return async () => toResponse(getBundle());
  }
  if (method === "post" && ENROLL_URL.test(url)) {
    return async (cfg) => toResponse(enroll(cfg));
  }
  if (method === "post" && CLAIM_URL.test(url)) {
    return async (cfg) => toResponse(declareClaim(cfg));
  }
  if (method === "post" && DECIDE_URL.test(url)) {
    return async (cfg) => toResponse(decideClaim(cfg));
  }

  return null;
}
