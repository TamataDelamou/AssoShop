import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  AttendanceStatus,
  CheckInAttendeePayload,
  Meeting,
  MeetingStatus,
  PlanMeetingPayload,
  SaveMinutesPayload,
} from "@/types/modules/community";

// Représentation sérialisable (dates en chaînes ISO) renvoyée par le mock.
type MeetingDTO = Omit<Meeting, "date" | "created_at" | "attendees"> & {
  date: string | null;
  created_at: string | null;
  attendees: {
    id: string;
    name: string;
    status: AttendanceStatus;
    checked_in_at: string | null;
  }[];
};

const store: MeetingDTO[] = [
  {
    id: "m-1",
    organization_id: "org-1",
    title: "Assemblée générale",
    date: "2026-03-15T10:00:00.000Z",
    location: "Siège de l'association",
    agenda: "Bilan annuel\nValidation des comptes\nÉlection du bureau",
    status: MeetingStatus.PLANNED,
    minutes: null,
    reminder_enabled: true,
    created_at: "2026-02-20T00:00:00.000Z",
    attendees: [
      {
        id: "a-1",
        name: "Jean Dupont",
        status: AttendanceStatus.INVITED,
        checked_in_at: null,
      },
      {
        id: "a-2",
        name: "Aminata Bah",
        status: AttendanceStatus.INVITED,
        checked_in_at: null,
      },
      {
        id: "a-3",
        name: "Mamadou Sow",
        status: AttendanceStatus.INVITED,
        checked_in_at: null,
      },
    ],
  },
  {
    id: "m-2",
    organization_id: "org-1",
    title: "Réunion du bureau",
    date: "2026-02-10T17:00:00.000Z",
    location: "Salle de conférence",
    agenda: "Point sur les cotisations\nPréparation de l'assemblée",
    status: MeetingStatus.COMPLETED,
    minutes:
      "Points abordés :\n- Point sur les cotisations : 12 membres à jour\n- Préparation de l'assemblée\nDécisions :\n- Validation du budget prévisionnel\nActions à suivre :\n- Envoyer les convocations",
    reminder_enabled: false,
    created_at: "2026-01-28T00:00:00.000Z",
    attendees: [
      {
        id: "a-1",
        name: "Jean Dupont",
        status: AttendanceStatus.PRESENT,
        checked_in_at: "2026-02-10T16:55:00.000Z",
      },
      {
        id: "a-2",
        name: "Aminata Bah",
        status: AttendanceStatus.EXCUSED,
        checked_in_at: null,
      },
    ],
  },
  {
    id: "m-3",
    organization_id: "org-1",
    title: "Atelier de formation",
    date: "2026-03-30T09:00:00.000Z",
    location: "Maison des jeunes",
    agenda: "Formation à la gestion de trésorerie",
    status: MeetingStatus.PLANNED,
    minutes: null,
    reminder_enabled: true,
    created_at: "2026-02-22T00:00:00.000Z",
    attendees: [],
  },
];

const LIST_URL = /^\/organizations\/[^/]+\/meetings$/;
const ITEM_URL = /^\/organizations\/[^/]+\/meetings\/([^/]+)$/;
const ATTENDEE_URL =
  /^\/organizations\/[^/]+\/meetings\/([^/]+)\/attendees\/([^/]+)$/;

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

function listMeetings(config: InternalAxiosRequestConfig): MeetingDTO[] {
  const params = (config.params ?? {}) as { search?: string; status?: string };
  let result = store.slice();

  if (params.search) {
    const needle = params.search.toLowerCase();
    result = result.filter(
      (m) =>
        m.title.toLowerCase().includes(needle) ||
        m.location.toLowerCase().includes(needle),
    );
  }

  if (params.status && params.status !== "all") {
    result = result.filter((m) => m.status === params.status);
  }

  return clone(result);
}

function createMeeting(config: InternalAxiosRequestConfig): MeetingDTO {
  const payload = (config.data ?? {}) as PlanMeetingPayload;
  const record: MeetingDTO = {
    id: `m-${Date.now()}`,
    organization_id: "org-1",
    title: payload.title,
    date: new Date(payload.date).toISOString(),
    location: payload.location,
    agenda: payload.agenda,
    status: MeetingStatus.PLANNED,
    minutes: null,
    reminder_enabled: payload.reminder_enabled,
    created_at: new Date().toISOString(),
    attendees: [],
  };
  store.unshift(record);
  return clone(record);
}

function saveMinutes(config: InternalAxiosRequestConfig): MeetingDTO | null {
  const match = config.url?.match(ITEM_URL);
  if (!match) return null;

  const payload = (config.data ?? {}) as SaveMinutesPayload & {
    action?: string;
  };
  const record = store.find((m) => m.id === match[1]);
  if (!record) return null;

  if (payload.action === "save-minutes") {
    record.minutes = payload.minutes;
    record.status = MeetingStatus.COMPLETED;
  }

  return clone(record);
}

function checkIn(config: InternalAxiosRequestConfig): MeetingDTO | null {
  const match = config.url?.match(ATTENDEE_URL);
  if (!match) return null;

  const payload = (config.data ?? {}) as CheckInAttendeePayload & {
    status: AttendanceStatus;
  };
  const record = store.find((m) => m.id === match[1]);
  if (!record) return null;

  const attendee = record.attendees.find((a) => a.id === match[2]);
  if (!attendee) return null;

  attendee.status = payload.status;
  attendee.checked_in_at =
    payload.status === AttendanceStatus.PRESENT
      ? new Date().toISOString()
      : null;

  return clone(record);
}

export function meetingsMockAdapter(
  config: InternalAxiosRequestConfig,
): AxiosAdapter | null {
  const method = (config.method ?? "get").toLowerCase();
  const url = config.url ?? "";

  if (method === "get" && LIST_URL.test(url)) {
    return async (cfg) => toResponse(listMeetings(cfg));
  }
  if (method === "post" && LIST_URL.test(url)) {
    return async (cfg) => toResponse(createMeeting(cfg));
  }
  if (method === "patch" && ITEM_URL.test(url)) {
    return async (cfg) => toResponse(saveMinutes(cfg));
  }
  if (method === "patch" && ATTENDEE_URL.test(url)) {
    return async (cfg) => toResponse(checkIn(cfg));
  }

  return null;
}
