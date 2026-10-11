import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  AuditEventDTO,
  clampAuditLimit,
  filterAuditEvents,
  isAuditEventType,
  paginateAuditEvents,
} from "@/lib/audit";
import { AuditEntityType, AuditEventType } from "@/types/modules/audit";
import { AUDIT_CONFIG, CONTRIBUTION_CONFIG } from "@/utils/constants";

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

function ago(days: number, hours = 0): string {
  return new Date(Date.now() - days * DAY_MS - hours * HOUR_MS).toISOString();
}

// Les auteurs (u-1 présidente, u-3 trésorière) correspondent au mock des membres ;
// le nom est joint côté client par le hook useAuditEvents.
const store: AuditEventDTO[] = [
  {
    id: "ae-1",
    organization_id: "org-1",
    actor_id: "u-3",
    event_type: AuditEventType.CONTRIBUTION_VALIDATED,
    entity_type: AuditEntityType.CONTRIBUTION,
    entity_id: "c-1",
    amount: 50000,
    currency: null,
    before: { status: "pending" },
    after: { status: "paid" },
    created_at: ago(0, 3),
  },
  {
    id: "ae-2",
    organization_id: "org-1",
    actor_id: "u-1",
    event_type: AuditEventType.MEMBER_ROLE_CHANGED,
    entity_type: AuditEntityType.MEMBER,
    entity_id: "m-4",
    amount: null,
    currency: null,
    before: { role: "member" },
    after: { role: "auditor" },
    created_at: ago(1, 2),
  },
  {
    id: "ae-3",
    organization_id: "org-1",
    actor_id: "u-1",
    event_type: AuditEventType.SOCIAL_CASE_APPROVED,
    entity_type: AuditEntityType.SOCIAL_CASE,
    entity_id: "sc-1",
    amount: 2000000,
    currency: CONTRIBUTION_CONFIG.CURRENCY,
    before: { status: "under_review" },
    after: { status: "approved" },
    created_at: ago(3),
  },
  {
    id: "ae-4",
    organization_id: "org-1",
    actor_id: "u-3",
    event_type: AuditEventType.ACCOUNTING_ENTRY_VALIDATED,
    entity_type: AuditEntityType.ACCOUNTING_ENTRY,
    entity_id: "e-1",
    amount: 750000,
    currency: null,
    before: { status: "pending" },
    after: { status: "confirmed", entry_type: "expense" },
    created_at: ago(5, 4),
  },
  {
    id: "ae-5",
    organization_id: "org-1",
    actor_id: "u-1",
    event_type: AuditEventType.SIGNATURE_SIGNED,
    entity_type: AuditEntityType.SIGNATURE_REQUEST,
    entity_id: "sig-1",
    amount: 6000000,
    currency: null,
    before: null,
    after: { signatory_id: "sg-1", role: "president", type: "withdrawal" },
    created_at: ago(6),
  },
  {
    id: "ae-6",
    organization_id: "org-1",
    actor_id: "u-3",
    event_type: AuditEventType.LOAN_APPROVED,
    entity_type: AuditEntityType.LOAN,
    entity_id: "l-1",
    amount: 1500000,
    currency: null,
    before: { status: "sponsor_confirmed" },
    after: { status: "approved" },
    created_at: ago(12),
  },
  {
    id: "ae-7",
    organization_id: "org-1",
    actor_id: "u-3",
    event_type: AuditEventType.GROUP_PAYMENT_VALIDATED,
    entity_type: AuditEntityType.GROUP_PAYMENT,
    entity_id: "gp-1",
    amount: 100000,
    currency: null,
    before: { status: "pending" },
    after: { status: "confirmed" },
    created_at: ago(20),
  },
  {
    id: "ae-8",
    organization_id: "org-1",
    actor_id: "u-1",
    event_type: AuditEventType.MEMBER_STATUS_CHANGED,
    entity_type: AuditEntityType.MEMBER,
    entity_id: "m-5",
    amount: null,
    currency: null,
    before: { status: "pending" },
    after: { status: "active" },
    created_at: ago(45),
  },
  {
    id: "ae-9",
    organization_id: "org-1",
    actor_id: null,
    event_type: AuditEventType.LOAN_INSTALLMENT_REPAID,
    entity_type: AuditEntityType.LOAN_INSTALLMENT,
    entity_id: "li-1",
    amount: 250000,
    currency: null,
    before: { status: "pending" },
    after: { status: "paid", loan_id: "l-0" },
    created_at: ago(80),
  },
  {
    id: "ae-10",
    organization_id: "org-1",
    actor_id: "u-1",
    event_type: AuditEventType.SOCIAL_CASE_DISBURSED,
    entity_type: AuditEntityType.SOCIAL_CASE,
    entity_id: "sc-0",
    amount: 3200000,
    currency: CONTRIBUTION_CONFIG.CURRENCY,
    before: { status: "funded" },
    after: { status: "disbursed" },
    created_at: ago(120),
  },
];

const LIST_URL = /^\/organizations\/([^/]+)\/audit-events$/;

function toResponse(data: unknown): AxiosResponse {
  return {
    data,
    status: 200,
    statusText: "OK",
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  };
}

function listAuditEvents(config: InternalAxiosRequestConfig) {
  const orgId = LIST_URL.exec(config.url ?? "")?.[1] ?? null;
  const params = (config.params ?? {}) as Record<string, unknown>;
  const eventType = isAuditEventType(params.event_type)
    ? params.event_type
    : null;

  const events = filterAuditEvents(
    store.filter((event) => event.organization_id === orgId),
    {
      eventType,
      since: typeof params.since === "string" ? params.since : null,
      before: typeof params.before === "string" ? params.before : null,
    },
  );
  return paginateAuditEvents(
    JSON.parse(JSON.stringify(events)) as AuditEventDTO[],
    clampAuditLimit(params.limit ?? AUDIT_CONFIG.PAGE_SIZE),
  );
}

// Lecture seule : aucune route d'écriture, comme la table audit_events.
export function auditMockAdapter(
  config: InternalAxiosRequestConfig,
): AxiosAdapter | null {
  const method = (config.method ?? "get").toLowerCase();
  const url = config.url ?? "";

  if (method === "get" && LIST_URL.test(url)) {
    return async (cfg) => toResponse(listAuditEvents(cfg));
  }

  return null;
}
