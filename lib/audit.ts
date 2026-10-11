import {
  AuditEntityType,
  AuditEvent,
  AuditEventType,
  AuditPeriod,
  AuditSnapshot,
} from "@/types/modules/audit";
import {
  AUDIT_CONFIG,
  AUDIT_PERIOD_DAYS,
  AUDIT_SNAPSHOT_FIELD_LABELS,
} from "@/utils/constants";

// Logique pure du journal d'audit, partagée entre l'API, le mock et l'écran.

const DAY_MS = 86_400_000;

// Ligne SQL de public.audit_events (migration 0018).
export interface AuditEventRow {
  id: string;
  organization_id: string | null;
  actor_id: string | null;
  event_type: string;
  entity_type: string;
  entity_id: string;
  amount: number | null;
  currency: string | null;
  before: unknown;
  after: unknown;
  created_at: string | null;
}

// Représentation transportée en JSON (dates en chaînes ISO).
export type AuditEventDTO = Omit<AuditEvent, "created_at" | "actor_name"> & {
  created_at: string | null;
};

export function isAuditEventType(value: unknown): value is AuditEventType {
  return (
    typeof value === "string" &&
    (Object.values(AuditEventType) as string[]).includes(value)
  );
}

export function isAuditPeriod(value: unknown): value is AuditPeriod {
  return (
    typeof value === "string" &&
    (Object.values(AuditPeriod) as string[]).includes(value)
  );
}

// Ne conserve que les valeurs scalaires d'un état avant / après.
export function toSnapshot(value: unknown): AuditSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const snapshot: AuditSnapshot = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (
      entry === null ||
      typeof entry === "string" ||
      typeof entry === "number" ||
      typeof entry === "boolean"
    ) {
      snapshot[key] = entry;
    }
  }
  return snapshot;
}

// Adapte une ligne SQL au contrat renvoyé par l'API (identique au mock).
export function serializeAuditEvent(row: AuditEventRow): AuditEventDTO {
  return {
    id: row.id,
    organization_id: row.organization_id,
    actor_id: row.actor_id,
    event_type: row.event_type as AuditEventType,
    entity_type: row.entity_type as AuditEntityType,
    entity_id: row.entity_id,
    amount: row.amount === null ? null : Number(row.amount),
    currency: row.currency,
    before: toSnapshot(row.before),
    after: toSnapshot(row.after),
    created_at: row.created_at,
  };
}

// Convertit l'événement reçu de l'API (ou relu du cache) pour l'écran.
export function parseAuditEvent(event: AuditEventDTO | AuditEvent): AuditEvent {
  return {
    ...event,
    created_at: event.created_at ? new Date(event.created_at) : null,
  };
}

// Borne basse (ISO) d'une période, ou null si elle est sans limite.
export function periodToSince(
  period: AuditPeriod,
  now: Date = new Date(),
): string | null {
  const days = AUDIT_PERIOD_DAYS[period];
  if (days === null) return null;
  return new Date(now.getTime() - days * DAY_MS).toISOString();
}

export function clampAuditLimit(value: unknown): number {
  const requested = Number(value);
  if (!Number.isFinite(requested)) return AUDIT_CONFIG.PAGE_SIZE;
  return Math.min(Math.max(Math.floor(requested), 1), AUDIT_CONFIG.PAGE_SIZE_MAX);
}

export interface AuditQuery {
  eventType: AuditEventType | null;
  since: string | null;
  before: string | null;
  limit: number;
}

export type AuditQueryResult =
  | { ok: true; query: AuditQuery }
  | { ok: false; error: "event_type" | "date" };

function parseIsoDate(raw: string | null): string | null | undefined {
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

// Valide les paramètres de GET /organizations/:orgId/audit-events.
export function parseAuditQuery(params: URLSearchParams): AuditQueryResult {
  const rawType = params.get("event_type");
  if (rawType && !isAuditEventType(rawType)) {
    return { ok: false, error: "event_type" };
  }

  const since = parseIsoDate(params.get("since"));
  const before = parseIsoDate(params.get("before"));
  if (since === undefined || before === undefined) {
    return { ok: false, error: "date" };
  }

  return {
    ok: true,
    query: {
      eventType: rawType ? (rawType as AuditEventType) : null,
      since,
      before,
      limit: clampAuditLimit(params.get("limit") ?? AUDIT_CONFIG.PAGE_SIZE),
    },
  };
}

interface Filterable {
  event_type: string;
  created_at: string | Date | null;
}

function toTime(value: string | Date | null): number {
  if (!value) return 0;
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

// Filtre par type et par fenêtre de dates (since incluse, before exclue), du
// plus récent au plus ancien. Même sémantique que la requête SQL de l'API.
export function filterAuditEvents<T extends Filterable>(
  events: T[],
  filters: {
    eventType?: AuditEventType | null;
    since?: string | null;
    before?: string | null;
  },
): T[] {
  const sinceTime = filters.since ? new Date(filters.since).getTime() : null;
  const beforeTime = filters.before ? new Date(filters.before).getTime() : null;

  return events
    .filter((event) => {
      if (filters.eventType && event.event_type !== filters.eventType) {
        return false;
      }
      const time = toTime(event.created_at);
      if (sinceTime !== null && time < sinceTime) return false;
      if (beforeTime !== null && time >= beforeTime) return false;
      return true;
    })
    .sort((a, b) => toTime(b.created_at) - toTime(a.created_at));
}

// Découpe une liste triée (plus récent d'abord) en page + curseur suivant.
export function paginateAuditEvents<T extends { created_at: string | null }>(
  events: T[],
  limit: number,
): { events: T[]; next_before: string | null; has_more: boolean } {
  const page = events.slice(0, limit);
  const hasMore = events.length > limit;
  return {
    events: page,
    next_before: hasMore ? (page.at(-1)?.created_at ?? null) : null,
    has_more: hasMore,
  };
}

export interface AuditChange {
  field: string;
  label: string;
  before: string | null;
  after: string | null;
}

// Changements à afficher : uniquement les champs libellés (statut, rôle…),
// jamais les identifiants techniques.
export function describeAuditChanges(
  event: Pick<AuditEvent, "before" | "after">,
): AuditChange[] {
  const fields = new Set([
    ...Object.keys(event.before ?? {}),
    ...Object.keys(event.after ?? {}),
  ]);
  const changes: AuditChange[] = [];
  for (const field of fields) {
    const label = AUDIT_SNAPSHOT_FIELD_LABELS[field];
    if (!label) continue;
    const before = event.before?.[field];
    const after = event.after?.[field];
    changes.push({
      field,
      label,
      before: before === undefined || before === null ? null : String(before),
      after: after === undefined || after === null ? null : String(after),
    });
  }
  return changes;
}
