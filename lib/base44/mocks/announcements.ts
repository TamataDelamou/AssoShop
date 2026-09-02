import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  Announcement,
  AnnouncementAudience,
  PublishAnnouncementPayload,
} from "@/types/modules/community";

// Représentation sérialisable (dates en chaînes ISO) renvoyée par le mock.
type AnnouncementDTO = Omit<Announcement, "created_at"> & {
  created_at: string | null;
};

const store: AnnouncementDTO[] = [
  {
    id: "ann-1",
    organization_id: "org-1",
    author_name: "Bureau de l'association",
    title: "Assemblée générale — 15 mars",
    content:
      "L'assemblée générale se tiendra le 15 mars à 10h au siège. Présence obligatoire pour le vote du budget.",
    audience: AnnouncementAudience.MEMBERS,
    pinned: true,
    relayed_from: null,
    created_at: "2026-02-25T00:00:00.000Z",
  },
  {
    id: "ann-2",
    organization_id: "org-1",
    author_name: "Bureau de l'association",
    title: "Journée de reboisement communautaire",
    content:
      "Samedi prochain, opération de reboisement ouverte à toutes les associations affiliées. Rendez-vous à 8h.",
    audience: AnnouncementAudience.AFFILIATES,
    pinned: false,
    relayed_from: null,
    created_at: "2026-02-24T00:00:00.000Z",
  },
  {
    id: "ann-3",
    organization_id: "org-1",
    author_name: "Grande communauté forestière de Conakry",
    title: "Réunion des associations affiliées",
    content:
      "La grande communauté invite les associations sœurs à une réunion de coordination le 20 mars.",
    audience: AnnouncementAudience.MEMBERS,
    pinned: false,
    relayed_from: "Grande communauté forestière de Conakry",
    created_at: "2026-02-23T00:00:00.000Z",
  },
  {
    id: "ann-4",
    organization_id: "org-1",
    author_name: "Coopérative agricole de Kindia",
    title: "Vente groupée de semences",
    content:
      "La coopérative organise une vente groupée de semences améliorées réservée aux associations affiliées.",
    audience: AnnouncementAudience.MEMBERS,
    pinned: false,
    relayed_from: "Coopérative agricole de Kindia",
    created_at: "2026-02-22T00:00:00.000Z",
  },
  {
    id: "ann-5",
    organization_id: "org-1",
    author_name: "Bureau de l'association",
    title: "Mutualisation des achats d'intrants",
    content:
      "Proposons de mutualiser nos achats d'intrants agricoles avec les associations affiliées. Répondez avant le 1er mars.",
    audience: AnnouncementAudience.AFFILIATES,
    pinned: false,
    relayed_from: null,
    created_at: "2026-02-21T00:00:00.000Z",
  },
  {
    id: "ann-6",
    organization_id: "org-1",
    author_name: "Union des commerçantes de Matam",
    title: "Forum des entrepreneures",
    content:
      "L'union organise un forum des entrepreneures le 25 mars, ouvert aux membres des associations affiliées.",
    audience: AnnouncementAudience.MEMBERS,
    pinned: false,
    relayed_from: "Union des commerçantes de Matam",
    created_at: "2026-02-20T00:00:00.000Z",
  },
];

const LIST_URL = /^\/organizations\/[^/]+\/announcements$/;

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

function listAnnouncements(
  config: InternalAxiosRequestConfig,
): AnnouncementDTO[] {
  const params = (config.params ?? {}) as { search?: string };
  let result = store.slice();

  if (params.search) {
    const needle = params.search.toLowerCase();
    result = result.filter(
      (a) =>
        a.title.toLowerCase().includes(needle) ||
        a.content.toLowerCase().includes(needle),
    );
  }

  // Les annonces épinglées apparaissent en tête de fil.
  return clone(
    result.sort((a, b) => Number(b.pinned) - Number(a.pinned)),
  );
}

function createAnnouncement(
  config: InternalAxiosRequestConfig,
): AnnouncementDTO {
  const payload = (config.data ?? {}) as PublishAnnouncementPayload;
  const record: AnnouncementDTO = {
    id: `ann-${Date.now()}`,
    organization_id: "org-1",
    author_name: "Bureau de l'association",
    title: payload.title,
    content: payload.content,
    audience: payload.audience,
    pinned: payload.pinned,
    relayed_from: null,
    created_at: new Date().toISOString(),
  };
  store.unshift(record);
  return clone(record);
}

export function announcementsMockAdapter(
  config: InternalAxiosRequestConfig,
): AxiosAdapter | null {
  const method = (config.method ?? "get").toLowerCase();
  const url = config.url ?? "";

  if (method === "get" && LIST_URL.test(url)) {
    return async (cfg) => toResponse(listAnnouncements(cfg));
  }
  if (method === "post" && LIST_URL.test(url)) {
    return async (cfg) => toResponse(createAnnouncement(cfg));
  }

  return null;
}
