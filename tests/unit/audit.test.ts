import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  AuditEventRow,
  clampAuditLimit,
  describeAuditChanges,
  filterAuditEvents,
  paginateAuditEvents,
  parseAuditEvent,
  parseAuditQuery,
  periodToSince,
  serializeAuditEvent,
  toSnapshot,
} from "@/lib/audit";
import {
  AuditEntityType,
  AuditEventType,
  AuditPeriod,
} from "@/types/modules/audit";
import {
  AUDIT_CONFIG,
  AUDIT_EVENT_LABELS,
  AUDIT_ORG_EVENT_TYPES,
  AUDIT_PERIOD_DAYS,
  AUDIT_PERIOD_LABELS,
} from "@/utils/constants";

function readMigration(name: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../../supabase/migrations/${name}`, import.meta.url)),
    "utf8",
  );
}

const MIGRATION = readMigration("0018_activity_audit.sql");
// 0019 redéfinit la contrainte event_type : c'est elle qui fait foi.
const MIGRATION_0019 = readMigration("0019_market_topup_integrity.sql");

function eventTypesIn(sql: string): string[] {
  const match = /check \(event_type in \(([\s\S]*?)\)\)/.exec(sql);
  if (!match) throw new Error("Contrainte event_type introuvable");
  return Array.from(match[1].matchAll(/'([^']+)'/g), (m) => m[1]);
}

// Liste des event_type autorisés par la contrainte CHECK en vigueur.
function migrationEventTypes(): string[] {
  return eventTypesIn(MIGRATION_0019);
}

function row(overrides: Partial<AuditEventRow> = {}): AuditEventRow {
  return {
    id: "ae-1",
    organization_id: "org-1",
    actor_id: "u-1",
    event_type: AuditEventType.CONTRIBUTION_VALIDATED,
    entity_type: AuditEntityType.CONTRIBUTION,
    entity_id: "c-1",
    amount: 50000,
    currency: null,
    before: { status: "pending" },
    after: { status: "paid" },
    created_at: "2026-10-10T12:00:00.000Z",
    ...overrides,
  };
}

describe("Journal d'audit : cohérence migration / constantes", () => {
  it("déclare les mêmes event_type dans la migration et dans l'enum", () => {
    expect(migrationEventTypes().sort()).toEqual(
      (Object.values(AuditEventType) as string[]).sort(),
    );
  });

  it("ne retire aucun event_type déclaré par 0018", () => {
    const current = migrationEventTypes();
    for (const type of eventTypesIn(MIGRATION)) expect(current).toContain(type);
  });

  it("ne contient aucun doublon dans la migration", () => {
    const types = migrationEventTypes();
    expect(new Set(types).size).toBe(types.length);
  });

  it("émet uniquement des event_type déclarés dans les triggers", () => {
    // Littéraux complets ('loan.installment_repaid') et préfixes dynamiques
    // ('pay.' || new.type) utilisés dans les fonctions de trigger.
    const body =
      MIGRATION.slice(MIGRATION.indexOf("-- 3. TRIGGERS MÉTIER")) +
      MIGRATION_0019.slice(MIGRATION_0019.indexOf("-- Commande marché payée."));
    const declared = Object.values(AuditEventType) as string[];
    const literals = Array.from(
      body.matchAll(/'([a-z_]+\.[a-z_]+)'/g),
      (m) => m[1],
    );
    expect(literals).toContain("market.order_paid");
    expect(literals).toContain("pay.topup_confirmed");
    for (const literal of literals) expect(declared).toContain(literal);

    const prefixes = Array.from(body.matchAll(/'([a-z_]+\.)' \|\|/g), (m) => m[1]);
    expect(prefixes.sort()).toEqual(["loan.", "pay.", "social_case."]);
    for (const prefix of prefixes) {
      expect(declared.some((type) => type.startsWith(prefix))).toBe(true);
    }
  });

  it("libelle chaque type d'événement et chaque période", () => {
    for (const type of Object.values(AuditEventType)) {
      expect(AUDIT_EVENT_LABELS[type]).toBeTruthy();
    }
    for (const period of Object.values(AuditPeriod)) {
      expect(AUDIT_PERIOD_LABELS[period]).toBeTruthy();
      expect(period in AUDIT_PERIOD_DAYS).toBe(true);
    }
  });

  it("exclut les événements du portefeuille personnel du filtre organisation", () => {
    expect(AUDIT_ORG_EVENT_TYPES).not.toContain(AuditEventType.PAY_TOPUP);
    expect(AUDIT_ORG_EVENT_TYPES).toContain(AuditEventType.MEMBER_ROLE_CHANGED);
    expect(AUDIT_ORG_EVENT_TYPES).not.toContain(AuditEventType.MARKET_ORDER_PAID);
    const personal = Object.values(AuditEventType).filter(
      (type) => type.startsWith("pay.") || type.startsWith("market."),
    );
    expect(personal).toHaveLength(6);
    expect(AUDIT_ORG_EVENT_TYPES).toHaveLength(
      Object.values(AuditEventType).length - personal.length,
    );
  });

  it("garde la table en ajout seul", () => {
    expect(MIGRATION).toMatch(/before update or delete on public\.audit_events/);
    expect(MIGRATION).toMatch(/before truncate on public\.audit_events/);
    expect(MIGRATION).not.toMatch(
      /on public\.audit_events for (insert|update|delete|all)/,
    );
  });
});

describe("Journal d'audit : sérialisation", () => {
  it("adapte une ligne SQL au contrat de l'API", () => {
    expect(serializeAuditEvent(row())).toEqual({
      id: "ae-1",
      organization_id: "org-1",
      actor_id: "u-1",
      event_type: "contribution.validated",
      entity_type: "contribution",
      entity_id: "c-1",
      amount: 50000,
      currency: null,
      before: { status: "pending" },
      after: { status: "paid" },
      created_at: "2026-10-10T12:00:00.000Z",
    });
  });

  it("conserve les valeurs nulles (action système, sans montant)", () => {
    const event = serializeAuditEvent(
      row({ actor_id: null, amount: null, before: null, after: null }),
    );
    expect(event.actor_id).toBeNull();
    expect(event.amount).toBeNull();
    expect(event.before).toBeNull();
    expect(event.after).toBeNull();
  });

  it("ne garde que les valeurs scalaires des états avant / après", () => {
    expect(
      toSnapshot({ status: "paid", count: 2, ok: true, none: null, nested: { phone: "x" }, list: [1] }),
    ).toEqual({ status: "paid", count: 2, ok: true, none: null });
    expect(toSnapshot("texte")).toBeNull();
    expect(toSnapshot([1, 2])).toBeNull();
    expect(toSnapshot(undefined)).toBeNull();
  });

  it("convertit la date pour l'écran", () => {
    const parsed = parseAuditEvent(serializeAuditEvent(row()));
    expect(parsed.created_at).toBeInstanceOf(Date);
    expect(parsed.created_at?.toISOString()).toBe("2026-10-10T12:00:00.000Z");
    expect(parseAuditEvent(serializeAuditEvent(row({ created_at: null }))).created_at).toBeNull();
  });

  it("décrit les changements libellés et ignore les identifiants techniques", () => {
    expect(
      describeAuditChanges({
        before: { status: "pending" },
        after: { status: "paid", loan_id: "l-1" },
      }),
    ).toEqual([{ field: "status", label: "Statut", before: "pending", after: "paid" }]);

    expect(
      describeAuditChanges({ before: { role: "member", status: "active" }, after: null }),
    ).toEqual([
      { field: "role", label: "Rôle", before: "member", after: null },
      { field: "status", label: "Statut", before: "active", after: null },
    ]);
    expect(describeAuditChanges({ before: null, after: null })).toEqual([]);
  });
});

describe("Journal d'audit : filtres", () => {
  const events = [
    serializeAuditEvent(row({ id: "a", created_at: "2026-10-10T12:00:00.000Z" })),
    serializeAuditEvent(
      row({
        id: "b",
        event_type: AuditEventType.MEMBER_ROLE_CHANGED,
        created_at: "2026-10-08T12:00:00.000Z",
      }),
    ),
    serializeAuditEvent(row({ id: "c", created_at: "2026-09-01T12:00:00.000Z" })),
  ];

  it("trie du plus récent au plus ancien", () => {
    const shuffled = [events[2], events[0], events[1]];
    expect(filterAuditEvents(shuffled, {}).map((e) => e.id)).toEqual(["a", "b", "c"]);
  });

  it("filtre par type d'événement", () => {
    expect(
      filterAuditEvents(events, { eventType: AuditEventType.MEMBER_ROLE_CHANGED }).map((e) => e.id),
    ).toEqual(["b"]);
  });

  it("inclut la borne since et exclut la borne before", () => {
    expect(
      filterAuditEvents(events, { since: "2026-10-08T12:00:00.000Z" }).map((e) => e.id),
    ).toEqual(["a", "b"]);
    expect(
      filterAuditEvents(events, { before: "2026-10-08T12:00:00.000Z" }).map((e) => e.id),
    ).toEqual(["c"]);
  });

  it("calcule la borne basse d'une période", () => {
    const now = new Date("2026-10-11T00:00:00.000Z");
    expect(periodToSince(AuditPeriod.LAST_7_DAYS, now)).toBe("2026-10-04T00:00:00.000Z");
    expect(periodToSince(AuditPeriod.LAST_30_DAYS, now)).toBe("2026-09-11T00:00:00.000Z");
    expect(periodToSince(AuditPeriod.ALL, now)).toBeNull();
  });

  it("pagine par created_at", () => {
    const first = paginateAuditEvents(events, 2);
    expect(first.events.map((e) => e.id)).toEqual(["a", "b"]);
    expect(first.has_more).toBe(true);
    expect(first.next_before).toBe("2026-10-08T12:00:00.000Z");

    const rest = filterAuditEvents(events, { before: first.next_before });
    const second = paginateAuditEvents(rest, 2);
    expect(second.events.map((e) => e.id)).toEqual(["c"]);
    expect(second.has_more).toBe(false);
    expect(second.next_before).toBeNull();
  });

  it("borne la taille de page", () => {
    expect(clampAuditLimit(10)).toBe(10);
    expect(clampAuditLimit(0)).toBe(1);
    expect(clampAuditLimit(100000)).toBe(AUDIT_CONFIG.PAGE_SIZE_MAX);
    expect(clampAuditLimit("abc")).toBe(AUDIT_CONFIG.PAGE_SIZE);
  });

  it("valide les paramètres de la requête", () => {
    const ok = parseAuditQuery(
      new URLSearchParams({
        event_type: "loan.approved",
        since: "2026-10-01",
        limit: "20",
      }),
    );
    expect(ok).toEqual({
      ok: true,
      query: {
        eventType: "loan.approved",
        since: "2026-10-01T00:00:00.000Z",
        before: null,
        limit: 20,
      },
    });

    expect(parseAuditQuery(new URLSearchParams())).toEqual({
      ok: true,
      query: { eventType: null, since: null, before: null, limit: AUDIT_CONFIG.PAGE_SIZE },
    });
  });

  it("refuse un type inconnu ou une date invalide", () => {
    expect(parseAuditQuery(new URLSearchParams({ event_type: "member.hacked" }))).toEqual({
      ok: false,
      error: "event_type",
    });
    expect(parseAuditQuery(new URLSearchParams({ since: "hier" }))).toEqual({
      ok: false,
      error: "date",
    });
    expect(parseAuditQuery(new URLSearchParams({ before: "pas-une-date" }))).toEqual({
      ok: false,
      error: "date",
    });
  });
});
