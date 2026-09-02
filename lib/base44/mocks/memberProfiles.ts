import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { EngagementLevel } from "@/types/modules/finance";
import { MemberProfile } from "@/types/modules/community";

// Le profil est renvoyé tel quel (aucune date à sérialiser).
type MemberProfileDTO = MemberProfile;

interface ProfileSeed {
  name: string;
  engagement: EngagementLevel;
  trust_score: number;
  history: MemberProfile["history"];
}

const PROFILES: Record<string, ProfileSeed> = {
  "m-1": {
    name: "Aïssatou Diallo",
    engagement: EngagementLevel.EXEMPLARY,
    trust_score: 94,
    history: {
      contributions_count: 15,
      meetings_attended: 21,
      social_aids_received: 0,
      tontines_count: 2,
      savings_active: true,
      purchases_count: 6,
    },
  },
  "m-2": {
    name: "Mamadou Bah",
    engagement: EngagementLevel.EXEMPLARY,
    trust_score: 91,
    history: {
      contributions_count: 12,
      meetings_attended: 18,
      social_aids_received: 1,
      tontines_count: 1,
      savings_active: true,
      purchases_count: 3,
    },
  },
  "m-3": {
    name: "Fatoumata Camara",
    engagement: EngagementLevel.RELIABLE,
    trust_score: 84,
    history: {
      contributions_count: 11,
      meetings_attended: 15,
      social_aids_received: 0,
      tontines_count: 1,
      savings_active: true,
      purchases_count: 4,
    },
  },
  "m-4": {
    name: "Ibrahima Sow",
    engagement: EngagementLevel.RELIABLE,
    trust_score: 78,
    history: {
      contributions_count: 9,
      meetings_attended: 11,
      social_aids_received: 2,
      tontines_count: 0,
      savings_active: false,
      purchases_count: 2,
    },
  },
  "m-5": {
    name: "Mariama Baldé",
    engagement: EngagementLevel.IRREGULAR,
    trust_score: 61,
    history: {
      contributions_count: 2,
      meetings_attended: 3,
      social_aids_received: 0,
      tontines_count: 0,
      savings_active: false,
      purchases_count: 1,
    },
  },
  "m-6": {
    name: "Sékou Touré",
    engagement: EngagementLevel.IRREGULAR,
    trust_score: 54,
    history: {
      contributions_count: 4,
      meetings_attended: 5,
      social_aids_received: 3,
      tontines_count: 0,
      savings_active: false,
      purchases_count: 0,
    },
  },
  "m-7": {
    name: "Kadiatou Sylla",
    engagement: EngagementLevel.RELIABLE,
    trust_score: 76,
    history: {
      contributions_count: 8,
      meetings_attended: 12,
      social_aids_received: 0,
      tontines_count: 1,
      savings_active: true,
      purchases_count: 5,
    },
  },
  "m-8": {
    name: "Alpha Condé",
    engagement: EngagementLevel.RELIABLE,
    trust_score: 80,
    history: {
      contributions_count: 10,
      meetings_attended: 13,
      social_aids_received: 1,
      tontines_count: 2,
      savings_active: true,
      purchases_count: 7,
    },
  },
  "m-9": {
    name: "Hawa Keita",
    engagement: EngagementLevel.EXEMPLARY,
    trust_score: 88,
    history: {
      contributions_count: 14,
      meetings_attended: 16,
      social_aids_received: 0,
      tontines_count: 2,
      savings_active: true,
      purchases_count: 8,
    },
  },
};

function fallbackProfile(memberId: string): ProfileSeed {
  let hash = 0;
  for (const ch of memberId) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  const trust = 55 + (hash % 36);
  const engagement =
    trust >= 85
      ? EngagementLevel.EXEMPLARY
      : trust >= 70
        ? EngagementLevel.RELIABLE
        : EngagementLevel.IRREGULAR;
  return {
    name: "Membre",
    engagement,
    trust_score: trust,
    history: {
      contributions_count: 3 + (hash % 12),
      meetings_attended: 4 + (hash % 14),
      social_aids_received: hash % 3,
      tontines_count: hash % 3,
      savings_active: hash % 2 === 0,
      purchases_count: hash % 9,
    },
  };
}

const PROFILE_URL = /^\/organizations\/([^/]+)\/members\/([^/]+)\/profile$/;

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

function getProfile(config: InternalAxiosRequestConfig): MemberProfileDTO {
  const match = PROFILE_URL.exec(config.url ?? "");
  const [, orgId, memberId] = match ?? ["", "", ""];
  const seed = PROFILES[memberId] ?? fallbackProfile(memberId);

  return clone({
    member_id: memberId,
    organization_id: orgId,
    member_name: seed.name,
    engagement: seed.engagement,
    trust_score: seed.trust_score,
    history: seed.history,
  });
}

export function memberProfilesMockAdapter(
  config: InternalAxiosRequestConfig,
): AxiosAdapter | null {
  const method = (config.method ?? "get").toLowerCase();
  const url = config.url ?? "";

  if (method === "get" && PROFILE_URL.test(url)) {
    return async (cfg) => toResponse(getProfile(cfg));
  }

  return null;
}
