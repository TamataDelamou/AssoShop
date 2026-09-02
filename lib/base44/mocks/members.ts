import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  CreateMemberPayload,
  Member,
  MemberRole,
  MemberStatus,
  SubmitAdhesionPayload,
} from "@/types/modules/community";

// Représentation sérialisable (dates en chaînes ISO) renvoyée par le mock.
type MemberDTO = Omit<Member, "joined_at"> & {
  joined_at: string | null;
};

const store: MemberDTO[] = [
  {
    id: "m-1",
    organization_id: "org-1",
    user_id: "u-1",
    status: MemberStatus.ACTIVE,
    role: MemberRole.PRESIDENT,
    joined_at: "2025-06-15T00:00:00.000Z",
    user: {
      id: "u-1",
      name: "Aïssatou Diallo",
      email: "aissatou.diallo@example.com",
      phone: "+224 620 11 22 33",
    },
  },
  {
    id: "m-2",
    organization_id: "org-1",
    user_id: "u-2",
    status: MemberStatus.ACTIVE,
    role: MemberRole.SECRETARY,
    joined_at: "2025-06-20T00:00:00.000Z",
    user: {
      id: "u-2",
      name: "Mamadou Bah",
      email: "mamadou.bah@example.com",
      phone: "+224 620 44 55 66",
    },
  },
  {
    id: "m-3",
    organization_id: "org-1",
    user_id: "u-3",
    status: MemberStatus.ACTIVE,
    role: MemberRole.TREASURER,
    joined_at: "2025-07-02T00:00:00.000Z",
    user: {
      id: "u-3",
      name: "Fatoumata Camara",
      email: "fatoumata.camara@example.com",
      phone: "+224 621 77 88 99",
    },
  },
  {
    id: "m-4",
    organization_id: "org-1",
    user_id: "u-4",
    status: MemberStatus.ACTIVE,
    role: MemberRole.AUDITOR,
    joined_at: "2025-07-10T00:00:00.000Z",
    user: {
      id: "u-4",
      name: "Ibrahima Sow",
      email: "ibrahima.sow@example.com",
      phone: "+224 622 00 11 22",
    },
  },
  {
    id: "m-5",
    organization_id: "org-1",
    user_id: "u-5",
    status: MemberStatus.PENDING,
    role: MemberRole.MEMBER,
    joined_at: "2026-08-01T00:00:00.000Z",
    user: {
      id: "u-5",
      name: "Mariama Baldé",
      email: "mariama.balde@example.com",
      phone: "+224 623 33 44 55",
    },
  },
  {
    id: "m-6",
    organization_id: "org-2",
    user_id: "u-6",
    status: MemberStatus.ACTIVE,
    role: MemberRole.PRESIDENT,
    joined_at: "2025-09-05T00:00:00.000Z",
    user: {
      id: "u-6",
      name: "Sékou Touré",
      email: "sekou.toure@example.com",
      phone: "+224 624 12 34 56",
    },
  },
  {
    id: "m-7",
    organization_id: "org-2",
    user_id: "u-7",
    status: MemberStatus.ACTIVE,
    role: MemberRole.MEMBER,
    joined_at: "2025-09-18T00:00:00.000Z",
    user: {
      id: "u-7",
      name: "Kadiatou Sylla",
      email: "kadiatou.sylla@example.com",
      phone: "+224 625 65 43 21",
    },
  },
  {
    id: "m-8",
    organization_id: "org-3",
    user_id: "u-8",
    status: MemberStatus.ACTIVE,
    role: MemberRole.PRESIDENT,
    joined_at: "2025-04-12T00:00:00.000Z",
    user: {
      id: "u-8",
      name: "Alpha Condé",
      email: "alpha.conde@example.com",
      phone: "+224 626 98 76 54",
    },
  },
  {
    id: "m-9",
    organization_id: "org-3",
    user_id: "u-9",
    status: MemberStatus.ACTIVE,
    role: MemberRole.TREASURER,
    joined_at: "2025-04-20T00:00:00.000Z",
    user: {
      id: "u-9",
      name: "Hawa Keita",
      email: "hawa.keita@example.com",
      phone: "+224 627 11 22 33",
    },
  },
];

const LIST_URL = /^\/organizations\/[^/]+\/members$/;
const MEMBER_URL = /^\/organizations\/([^/]+)\/members\/([^/]+)$/;
const ADHESIONS_URL = /^\/organizations\/[^/]+\/adhesions$/;

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

function listMembers(config: InternalAxiosRequestConfig): MemberDTO[] {
  const params = (config.params ?? {}) as { search?: string };
  const orgId = extractOrgId(config.url ?? "");
  let result = store.filter((m) => m.organization_id === orgId);

  if (params.search) {
    const needle = params.search.toLowerCase();
    result = result.filter(
      (m) =>
        (m.user?.name ?? "").toLowerCase().includes(needle) ||
        (m.user?.email ?? "").toLowerCase().includes(needle) ||
        (m.user?.phone ?? "").toLowerCase().includes(needle),
    );
  }

  return clone(result);
}

function createMember(config: InternalAxiosRequestConfig): MemberDTO {
  const payload = (config.data ?? {}) as CreateMemberPayload;
  const baseName = payload.email
    ? payload.email.split("@")[0].split(/[._-]/)[0]
    : "Membre";
  const name =
    baseName.charAt(0).toUpperCase() + baseName.slice(1).toLowerCase();

  const record: MemberDTO = {
    id: `m-${Date.now()}`,
    organization_id: payload.organization_id,
    user_id: `u-${Date.now()}`,
    status: MemberStatus.PENDING,
    role: payload.role,
    joined_at: new Date().toISOString(),
    user: {
      id: `u-${Date.now()}`,
      name,
      email: payload.email ?? "",
      phone: payload.phone ?? "",
    },
  };
  store.push(record);
  return clone(record);
}

function updateMember(config: InternalAxiosRequestConfig): MemberDTO {
  const match = MEMBER_URL.exec(config.url ?? "");
  const [, , memberId] = match ?? [];
  const payload = (config.data ?? {}) as {
    status?: MemberStatus;
    role?: MemberRole;
  };

  const record = store.find((m) => m.id === memberId);
  if (!record) {
    throw new Error("Membre introuvable");
  }
  if (payload.status) record.status = payload.status;
  if (payload.role) record.role = payload.role;
  return clone(record);
}

function removeMember(config: InternalAxiosRequestConfig): { ok: true } {
  const match = MEMBER_URL.exec(config.url ?? "");
  const [, , memberId] = match ?? [];
  const index = store.findIndex((m) => m.id === memberId);
  if (index >= 0) store.splice(index, 1);
  return { ok: true };
}

function listAdhesionRequests(
  config: InternalAxiosRequestConfig,
): MemberDTO[] {
  const orgId = extractOrgId(config.url ?? "");
  return clone(
    store.filter(
      (m) =>
        m.organization_id === orgId && m.status === MemberStatus.PENDING,
    ),
  );
}

function createAdhesionRequest(
  config: InternalAxiosRequestConfig,
): MemberDTO {
  const payload = (config.data ?? {}) as SubmitAdhesionPayload;
  const orgId = extractOrgId(config.url ?? "") ?? "";
  const record: MemberDTO = {
    id: `m-${Date.now()}`,
    organization_id: orgId,
    user_id: `u-${Date.now()}`,
    status: MemberStatus.PENDING,
    role: MemberRole.MEMBER,
    joined_at: new Date().toISOString(),
    user: {
      id: `u-${Date.now()}`,
      name: payload.name,
      email: payload.email ?? "",
      phone: payload.phone ?? "",
    },
  };
  store.push(record);
  return clone(record);
}

export function membersMockAdapter(
  config: InternalAxiosRequestConfig,
): AxiosAdapter | null {
  const method = (config.method ?? "get").toLowerCase();
  const url = config.url ?? "";

  if (method === "get" && LIST_URL.test(url)) {
    return async (cfg) => toResponse(listMembers(cfg));
  }
  if (method === "post" && LIST_URL.test(url)) {
    return async (cfg) => toResponse(createMember(cfg));
  }
  if (method === "patch" && MEMBER_URL.test(url)) {
    return async (cfg) => toResponse(updateMember(cfg));
  }
  if (method === "delete" && MEMBER_URL.test(url)) {
    return async (cfg) => toResponse(removeMember(cfg));
  }
  if (method === "get" && ADHESIONS_URL.test(url)) {
    return async (cfg) => toResponse(listAdhesionRequests(cfg));
  }
  if (method === "post" && ADHESIONS_URL.test(url)) {
    return async (cfg) => toResponse(createAdhesionRequest(cfg));
  }

  return null;
}
