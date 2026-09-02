import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  CommunityEvent,
  CreateEventPayload,
  EventType,
} from "@/types/modules/community";

// Représentation sérialisable (dates en chaînes ISO) renvoyée par le mock.
type EventDTO = Omit<CommunityEvent, "start_at" | "end_at" | "created_at"> & {
  start_at: string | null;
  end_at: string | null;
  created_at: string | null;
};

const DAY_MS = 86_400_000;

// Dates relatives à « maintenant » pour que l'agenda affiche toujours
// un mélange d'événements à venir et passés.
function at(offsetDays: number, hour: number, minute = 0): string {
  const d = new Date(Date.now() + offsetDays * DAY_MS);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

const store: EventDTO[] = [
  {
    id: "ev-1",
    organization_id: "org-1",
    title: "Réunion mensuelle du bureau",
    type: EventType.MEETING,
    description: "Point sur les cotisations et le calendrier des activités.",
    start_at: at(-12, 18),
    end_at: at(-12, 20),
    location: "Siège de l'association",
    created_at: at(-20, 9),
  },
  {
    id: "ev-2",
    organization_id: "org-1",
    title: "Assemblée générale ordinaire",
    type: EventType.GENERAL_ASSEMBLY,
    description: "Bilan annuel et élection partielle du bureau.",
    start_at: at(10, 9),
    end_at: at(10, 13),
    location: "Mairie — salle polyvalente",
    created_at: at(-15, 9),
  },
  {
    id: "ev-3",
    organization_id: "org-1",
    title: "Journée de nettoyage du quartier",
    type: EventType.ACTIVITY,
    description: "Opération citoyenne ouverte à tous les membres.",
    start_at: at(4, 8),
    end_at: at(4, 12),
    location: "Quartier Madina",
    created_at: at(-5, 9),
  },
  {
    id: "ev-4",
    organization_id: "org-1",
    title: "Formation trésorerie",
    type: EventType.TRAINING,
    description: "Initiation à la tenue des comptes pour les sections.",
    start_at: at(-30, 15),
    end_at: at(-30, 18),
    location: "En ligne (visioconférence)",
    created_at: at(-40, 9),
  },
  {
    id: "ev-5",
    organization_id: "org-1",
    title: "Sortie familiale annuelle",
    type: EventType.OUTING,
    description: "Journée détente et cohésion entre adhérents.",
    start_at: at(25, 7),
    end_at: at(25, 19),
    location: "Plage de Rogbané",
    created_at: at(-8, 9),
  },
  {
    id: "ev-6",
    organization_id: "org-2",
    title: "Réunion de rentrée",
    type: EventType.MEETING,
    description: "Définition du programme de la saison.",
    start_at: at(6, 17),
    end_at: at(6, 19),
    location: "Local de l'association",
    created_at: at(-3, 9),
  },
  {
    id: "ev-7",
    organization_id: "org-3",
    title: "Assemblée générale élective",
    type: EventType.GENERAL_ASSEMBLY,
    description: "Renouvellement du bureau exécutif.",
    start_at: at(15, 10),
    end_at: at(15, 14),
    location: "Centre culturel",
    created_at: at(-10, 9),
  },
];

const LIST_URL = /^\/organizations\/[^/]+\/events$/;

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

function listEvents(config: InternalAxiosRequestConfig): EventDTO[] {
  const orgId = extractOrgId(config.url ?? "");
  return clone(
    store
      .filter((e) => e.organization_id === orgId)
      .sort((a, b) => (a.start_at ?? "").localeCompare(b.start_at ?? "")),
  );
}

function createEvent(config: InternalAxiosRequestConfig): EventDTO {
  const payload = (config.data ?? {}) as CreateEventPayload;
  const orgId = extractOrgId(config.url ?? "") ?? "";
  const record: EventDTO = {
    id: `ev-${Date.now()}`,
    organization_id: orgId,
    title: payload.title,
    type: payload.type,
    description: payload.description ?? null,
    start_at: payload.start_at,
    end_at: payload.end_at ?? null,
    location: payload.location,
    created_at: new Date().toISOString(),
  };
  store.push(record);
  return clone(record);
}

export function eventsMockAdapter(
  config: InternalAxiosRequestConfig,
): AxiosAdapter | null {
  const method = (config.method ?? "get").toLowerCase();
  const url = config.url ?? "";

  if (method === "get" && LIST_URL.test(url)) {
    return async (cfg) => toResponse(listEvents(cfg));
  }
  if (method === "post" && LIST_URL.test(url)) {
    return async (cfg) => toResponse(createEvent(cfg));
  }

  return null;
}
