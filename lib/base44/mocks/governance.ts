import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  CastVotePayload,
  DeclareCandidacyPayload,
  Election,
  ElectionStatus,
  Mandate,
  MemberRole,
} from "@/types/modules/community";

// Représentations sérialisables (dates en chaînes ISO) renvoyées par le mock.
// Les noms des candidats sont joints côté client (useGovernance) à partir des membres.
type ElectionDTO = Omit<Election, "start_date" | "end_date"> & {
  start_date: string | null;
  end_date: string | null;
};
type MandateDTO = Omit<Mandate, "start_date" | "end_date"> & {
  start_date: string | null;
  end_date: string | null;
};

const DAY_MS = 86_400_000;

function at(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * DAY_MS).toISOString();
}

function iso(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month - 1, day)).toISOString();
}

const electionsStore: ElectionDTO[] = [
  {
    id: "e-1",
    organization_id: "org-1",
    title: "Élection du Président",
    position: MemberRole.PRESIDENT,
    status: ElectionStatus.OPEN,
    start_date: at(-5),
    end_date: at(10),
    candidates: [
      { id: "c-1", member_id: "m-1", votes: 12 },
      { id: "c-2", member_id: "m-3", votes: 8 },
    ],
  },
  {
    id: "e-2",
    organization_id: "org-1",
    title: "Élection du Trésorier",
    position: MemberRole.TREASURER,
    status: ElectionStatus.CLOSED,
    start_date: at(-120),
    end_date: at(-90),
    candidates: [
      { id: "c-3", member_id: "m-3", votes: 15 },
      { id: "c-4", member_id: "m-4", votes: 6 },
    ],
  },
  {
    id: "e-3",
    organization_id: "org-1",
    title: "Élection du Secrétaire",
    position: MemberRole.SECRETARY,
    status: ElectionStatus.CLOSED,
    start_date: at(-400),
    end_date: at(-370),
    candidates: [
      { id: "c-5", member_id: "m-2", votes: 11 },
      { id: "c-6", member_id: "m-4", votes: 4 },
    ],
  },
];

const mandatesStore: MandateDTO[] = [
  {
    id: "mand-1",
    organization_id: "org-1",
    label: "Mandat 2023-2025",
    start_date: iso(2023, 1, 1),
    end_date: iso(2025, 12, 31),
    office_holders: [
      { role: MemberRole.PRESIDENT, member_name: "Alpha Barry" },
      { role: MemberRole.SECRETARY, member_name: "Mariama Soumah" },
      { role: MemberRole.TREASURER, member_name: "Lamine Cissé" },
    ],
  },
  {
    id: "mand-2",
    organization_id: "org-1",
    label: "Mandat 2026-2029",
    start_date: iso(2026, 1, 1),
    end_date: null,
    office_holders: [
      { role: MemberRole.PRESIDENT, member_name: "Aïssatou Diallo" },
      { role: MemberRole.SECRETARY, member_name: "Mamadou Bah" },
      { role: MemberRole.TREASURER, member_name: "Fatoumata Camara" },
      { role: MemberRole.AUDITOR, member_name: "Ibrahima Sow" },
    ],
  },
];

const ELECTIONS_URL = /^\/organizations\/[^/]+\/elections$/;
const ELECTION_URL = /^\/organizations\/([^/]+)\/elections\/([^/]+)$/;
const CANDIDATES_URL =
  /^\/organizations\/[^/]+\/elections\/[^/]+\/candidates$/;
const VOTES_URL = /^\/organizations\/[^/]+\/elections\/[^/]+\/votes$/;
const MANDATES_URL = /^\/organizations\/[^/]+\/mandates$/;

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

function extractElectionId(url: string): string | null {
  const match = url.match(/\/elections\/([^/]+)\//);
  return match ? match[1] : null;
}

function findElection(id: string | null): ElectionDTO | undefined {
  return electionsStore.find((e) => e.id === id);
}

function listElections(config: InternalAxiosRequestConfig): ElectionDTO[] {
  const orgId = extractOrgId(config.url ?? "");
  return clone(
    electionsStore
      .filter((e) => e.organization_id === orgId)
      .sort((a, b) => (b.start_date ?? "").localeCompare(a.start_date ?? "")),
  );
}

function declareCandidacy(config: InternalAxiosRequestConfig): ElectionDTO {
  const payload = (config.data ?? {}) as DeclareCandidacyPayload;
  const election = findElection(extractElectionId(config.url ?? ""));
  if (!election) throw new Error("Élection introuvable");
  if (election.status !== ElectionStatus.OPEN) {
    throw new Error("Vote clôturé : aucune candidature ne peut être ajoutée");
  }
  if (election.candidates.some((c) => c.member_id === payload.member_id)) {
    throw new Error("Ce membre est déjà candidat");
  }
  election.candidates.push({
    id: `c-${Date.now()}`,
    member_id: payload.member_id,
    votes: 0,
  });
  return clone(election);
}

function castVote(config: InternalAxiosRequestConfig): ElectionDTO {
  const payload = (config.data ?? {}) as CastVotePayload;
  const election = findElection(extractElectionId(config.url ?? ""));
  if (!election) throw new Error("Élection introuvable");
  if (election.status !== ElectionStatus.OPEN) {
    throw new Error("Vote clôturé : le scrutin est verrouillé (RG-C06)");
  }
  const candidate = election.candidates.find(
    (c) => c.id === payload.candidate_id,
  );
  if (!candidate) throw new Error("Candidat introuvable");
  candidate.votes += 1;
  return clone(election);
}

function closeElection(config: InternalAxiosRequestConfig): ElectionDTO {
  const election = findElection(extractElectionId(config.url ?? ""));
  if (!election) throw new Error("Élection introuvable");
  if (election.status === ElectionStatus.CLOSED) {
    throw new Error("Le scrutin est déjà clôturé");
  }
  election.status = ElectionStatus.CLOSED;
  election.end_date = new Date().toISOString();
  return clone(election);
}

function listMandates(config: InternalAxiosRequestConfig): MandateDTO[] {
  const orgId = extractOrgId(config.url ?? "");
  return clone(
    mandatesStore
      .filter((m) => m.organization_id === orgId)
      .sort((a, b) => (b.start_date ?? "").localeCompare(a.start_date ?? "")),
  );
}

export function governanceMockAdapter(
  config: InternalAxiosRequestConfig,
): AxiosAdapter | null {
  const method = (config.method ?? "get").toLowerCase();
  const url = config.url ?? "";

  if (method === "get" && ELECTIONS_URL.test(url)) {
    return async (cfg) => toResponse(listElections(cfg));
  }
  if (method === "post" && CANDIDATES_URL.test(url)) {
    return async (cfg) => toResponse(declareCandidacy(cfg));
  }
  if (method === "post" && VOTES_URL.test(url)) {
    return async (cfg) => toResponse(castVote(cfg));
  }
  if (method === "patch" && ELECTION_URL.test(url)) {
    return async (cfg) => toResponse(closeElection(cfg));
  }
  if (method === "get" && MANDATES_URL.test(url)) {
    return async (cfg) => toResponse(listMandates(cfg));
  }

  return null;
}
