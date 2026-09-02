import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { EngagementLevel } from "@/types/modules/finance";
import {
  DecideTransferPayload,
  GenerateMobilityReportPayload,
  MobilityReport,
  TransferDecision,
  TransferDecisionStatus,
} from "@/types/modules/community";

// Représentations sérialisables (dates en chaînes ISO).
type MobilityReportDTO = Omit<
  MobilityReport,
  "generated_at" | "member_name"
> & {
  generated_at: string | null;
};

type TransferDecisionDTO = Omit<
  TransferDecision,
  "decided_at" | "member_name"
> & {
  decided_at: string | null;
};

function at(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * 86_400_000).toISOString();
}

interface MemberProfile {
  name: string;
  engagement: EngagementLevel;
  trust_score: number;
  contributions_count: number;
  meetings_attended: number;
}

// Profils déterministes pour les membres connus (démo).
const PROFILES: Record<string, MemberProfile> = {
  "m-2": {
    name: "Mamadou Bah",
    engagement: EngagementLevel.EXEMPLARY,
    trust_score: 91,
    contributions_count: 12,
    meetings_attended: 18,
  },
  "m-4": {
    name: "Ibrahima Sow",
    engagement: EngagementLevel.RELIABLE,
    trust_score: 78,
    contributions_count: 9,
    meetings_attended: 11,
  },
  "m-6": {
    name: "Sékou Touré",
    engagement: EngagementLevel.IRREGULAR,
    trust_score: 54,
    contributions_count: 4,
    meetings_attended: 5,
  },
  "m-8": {
    name: "Alpha Condé",
    engagement: EngagementLevel.RELIABLE,
    trust_score: 80,
    contributions_count: 10,
    meetings_attended: 13,
  },
  "m-9": {
    name: "Hawa Keita",
    engagement: EngagementLevel.EXEMPLARY,
    trust_score: 88,
    contributions_count: 14,
    meetings_attended: 16,
  },
};

function fallbackProfile(memberId: string, memberName: string): MemberProfile {
  let hash = 0;
  for (const ch of memberId) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  const trust = 55 + (hash % 36); // 55..90
  const engagement =
    trust >= 85
      ? EngagementLevel.EXEMPLARY
      : trust >= 70
        ? EngagementLevel.RELIABLE
        : EngagementLevel.IRREGULAR;
  return {
    name: memberName || "Membre",
    engagement,
    trust_score: trust,
    contributions_count: 3 + (hash % 12),
    meetings_attended: 4 + (hash % 14),
  };
}

function profileFor(memberId: string, memberName: string): MemberProfile {
  const known = PROFILES[memberId];
  return known ?? fallbackProfile(memberId, memberName);
}

const reports: MobilityReportDTO[] = [
  {
    id: "mrep-1",
    organization_id: "org-1",
    relocation_id: "rel-1",
    member_id: "m-2",
    engagement: EngagementLevel.EXEMPLARY,
    trust_score: 91,
    indicators: { contributions_count: 12, meetings_attended: 18 },
    generated_at: at(-3),
  },
  {
    id: "mrep-2",
    organization_id: "org-1",
    relocation_id: "rel-2",
    member_id: "m-4",
    engagement: EngagementLevel.RELIABLE,
    trust_score: 78,
    indicators: { contributions_count: 9, meetings_attended: 11 },
    generated_at: at(-10),
  },
  {
    id: "mrep-3",
    organization_id: "org-1",
    relocation_id: "rel-3",
    member_id: "m-6",
    engagement: EngagementLevel.IRREGULAR,
    trust_score: 54,
    indicators: { contributions_count: 4, meetings_attended: 5 },
    generated_at: at(-1),
  },
];

const decisions: TransferDecisionDTO[] = [
  {
    id: "tdec-1",
    organization_id: "org-1",
    relocation_id: "rel-1",
    member_id: "m-2",
    status: TransferDecisionStatus.PENDING,
    decided_at: null,
  },
  {
    id: "tdec-2",
    organization_id: "org-1",
    relocation_id: "rel-2",
    member_id: "m-4",
    status: TransferDecisionStatus.ACCEPTED,
    sponsorship: "Mariama Baldé",
    decision_note: "Dossier complet, parrainage validé.",
    decided_at: at(-8),
    decided_by: "Bureau de Kindia",
  },
  {
    id: "tdec-3",
    organization_id: "org-1",
    relocation_id: "rel-3",
    member_id: "m-6",
    status: TransferDecisionStatus.PENDING,
    decided_at: null,
  },
];

const BUNDLE_URL = /^\/organizations\/[^/]+\/mobility$/;
const REPORT_URL =
  /^\/organizations\/([^/]+)\/relocations\/([^/]+)\/mobility-report$/;
const DECISION_URL =
  /^\/organizations\/([^/]+)\/relocations\/([^/]+)\/transfer-decision$/;

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

function getBundle(config: InternalAxiosRequestConfig): {
  reports: MobilityReportDTO[];
  decisions: TransferDecisionDTO[];
} {
  const orgId = extractOrgId(config.url ?? "");
  return {
    reports: clone(reports.filter((r) => r.organization_id === orgId)),
    decisions: clone(decisions.filter((d) => d.organization_id === orgId)),
  };
}

function generateReport(config: InternalAxiosRequestConfig): MobilityReportDTO {
  const match = REPORT_URL.exec(config.url ?? "");
  const [, orgId, relocationId] = match ?? ["", "", ""];
  const payload = (config.data ?? {}) as GenerateMobilityReportPayload;

  const existing = reports.find((r) => r.relocation_id === relocationId);
  if (existing) return clone(existing);

  const profile = profileFor(payload.member_id, payload.member_name ?? "");
  const record: MobilityReportDTO = {
    id: `mrep-${Date.now()}`,
    organization_id: orgId,
    relocation_id: relocationId,
    member_id: payload.member_id,
    engagement: profile.engagement,
    trust_score: profile.trust_score,
    indicators: {
      contributions_count: profile.contributions_count,
      meetings_attended: profile.meetings_attended,
    },
    generated_at: new Date().toISOString(),
  };
  reports.push(record);
  return clone(record);
}

function decide(config: InternalAxiosRequestConfig): TransferDecisionDTO {
  const match = DECISION_URL.exec(config.url ?? "");
  const [, orgId, relocationId] = match ?? ["", "", ""];
  const payload = (config.data ?? {}) as DecideTransferPayload;

  let record = decisions.find((d) => d.relocation_id === relocationId);
  if (record) {
    record.status = payload.status;
    record.sponsorship = payload.sponsorship;
    record.decision_note = payload.decision_note;
    record.decided_by = payload.decided_by;
    record.decided_at = new Date().toISOString();
    return clone(record);
  }

  const relocation = reports.find((r) => r.relocation_id === relocationId);
  record = {
    id: `tdec-${Date.now()}`,
    organization_id: orgId,
    relocation_id: relocationId,
    member_id: relocation?.member_id ?? "",
    status: payload.status,
    sponsorship: payload.sponsorship,
    decision_note: payload.decision_note,
    decided_at: new Date().toISOString(),
    decided_by: payload.decided_by,
  };
  decisions.push(record);
  return clone(record);
}

export function mobilityMockAdapter(
  config: InternalAxiosRequestConfig,
): AxiosAdapter | null {
  const method = (config.method ?? "get").toLowerCase();
  const url = config.url ?? "";

  if (method === "get" && BUNDLE_URL.test(url)) {
    return async (cfg) => toResponse(getBundle(cfg));
  }
  if (method === "post" && REPORT_URL.test(url)) {
    return async (cfg) => toResponse(generateReport(cfg));
  }
  if (method === "post" && DECISION_URL.test(url)) {
    return async (cfg) => toResponse(decide(cfg));
  }

  return null;
}
