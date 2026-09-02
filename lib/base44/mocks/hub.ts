import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  AppNotification,
  Conversation,
  Favorite,
  FavoriteType,
  HubHome,
  HubProfile,
  KycRequest,
  KycStatus,
  Message,
  NotificationChannel,
  NotificationPreference,
  Referral,
  SavePreferencesPayload,
  SendMessagePayload,
  SyncQueueItem,
  SyncStatus,
  UpdateProfilePayload,
  VaultDocument,
} from "@/types/modules/hub";
import { EngagementLevel } from "@/types/modules/finance";

// Les dates sont sérialisées en chaînes ISO côté mock, puis réhydratées
// en `Date` par le hook consommateur.
type HubProfileDTO = Omit<HubProfile, "joined_at"> & { joined_at: string };
type FavoriteDTO = Omit<Favorite, "created_at"> & { created_at: string };
type VaultDocumentDTO = Omit<VaultDocument, "uploaded_at"> & { uploaded_at: string };
type KycRequestDTO = Omit<KycRequest, "submitted_at" | "reviewed_at"> & {
  submitted_at: string;
  reviewed_at: string | null;
};
type AppNotificationDTO = Omit<AppNotification, "created_at"> & { created_at: string };
type ConversationDTO = Omit<Conversation, "updated_at"> & { updated_at: string };
type MessageDTO = Omit<Message, "created_at"> & { created_at: string };
type SyncQueueItemDTO = Omit<SyncQueueItem, "created_at"> & { created_at: string };
type ReferralDTO = Omit<Referral, "joined_at"> & { joined_at: string };

const BUNDLE_URL = /^\/hub\/bundle$/;
const FAVORITE_TOGGLE_URL = /^\/hub\/favorites\/toggle$/;
const SYNC_RETRY_URL = /^\/hub\/sync\/retry$/;
const KYC_SUBMIT_URL = /^\/hub\/kyc\/submit$/;
const NOTIFICATIONS_READ_URL = /^\/hub\/notifications\/read$/;
const PREFERENCES_URL = /^\/hub\/preferences$/;
const MESSAGES_URL = /^\/hub\/conversations\/([^/]+)\/messages$/;
const SEND_MESSAGE_URL = /^\/hub\/messages$/;
const PROFILE_URL = /^\/hub\/profile$/;
const VAULT_URL = /^\/hub\/vault$/;
const CONVERSATIONS_URL = /^\/hub\/conversations$/;

function now(): string {
  return new Date().toISOString();
}

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

const profile: HubProfileDTO = {
  id: "user-1",
  name: "Aminata Diallo",
  phone: "+224 620 00 00 01",
  email: "aminata.diallo@example.com",
  city: "Conakry",
  country: "Guinée",
  language: "Français",
  engagement: EngagementLevel.RELIABLE,
  trust_score: 82,
  kyc_status: KycStatus.PENDING,
  joined_at: "2025-11-12T09:00:00.000Z",
};

const home: HubHome = {
  associations_count: 2,
  groups_count: 3,
  pending_invitations: 2,
  monthly_income: 620000,
  monthly_expenses: 210000,
  currency: "GNF",
};

const memberships = [
  {
    id: "ms-1",
    kind: "association",
    name: "Association GSG Conakry",
    type: "Association",
    role: "Trésorière",
    status: "active",
  },
  {
    id: "ms-2",
    kind: "association",
    name: "Coopérative agricole de Kindia",
    type: "Coopérative",
    role: "Membre",
    status: "active",
  },
  {
    id: "ms-3",
    kind: "group",
    name: "Tontine des commerçantes",
    type: "Tontine",
    role: "Membre",
    status: "active",
  },
  {
    id: "ms-4",
    kind: "group",
    name: "Épargne scolarité",
    type: "Épargne",
    role: "Administratrice",
    status: "active",
  },
  {
    id: "ms-5",
    kind: "group",
    name: "Cotisation mariage",
    type: "Cotisation à objectif",
    role: "Membre",
    status: "active",
  },
];

const favorites: FavoriteDTO[] = [
  {
    id: "f-1",
    type: FavoriteType.PRODUCT,
    label: "Riz parfumé 25 kg",
    detail: "Mode & Style — marketplace B2B",
    created_at: "2026-08-28T10:00:00.000Z",
  },
  {
    id: "f-2",
    type: FavoriteType.PROVIDER,
    label: "Plomberie Rapide",
    detail: "Prestataire — services communautaires",
    created_at: "2026-08-25T15:00:00.000Z",
  },
  {
    id: "f-3",
    type: FavoriteType.GROUP,
    label: "Tontine des commerçantes",
    detail: "Groupe financier",
    created_at: "2026-08-20T09:00:00.000Z",
  },
];

const vault: VaultDocumentDTO[] = [
  {
    id: "v-1",
    name: "Pièce d'identité.pdf",
    category: "Identité",
    size: 840000,
    encrypted: true,
    uploaded_at: "2025-11-13T09:00:00.000Z",
  },
  {
    id: "v-2",
    name: "Diplôme licence.pdf",
    category: "Diplôme",
    size: 2100000,
    encrypted: true,
    uploaded_at: "2026-01-20T11:00:00.000Z",
  },
  {
    id: "v-3",
    name: "Contrat de location.pdf",
    category: "Contrat",
    size: 1400000,
    encrypted: true,
    uploaded_at: "2026-03-05T14:00:00.000Z",
  },
];

const kyc: KycRequestDTO[] = [
  {
    id: "k-1",
    document_type: "Carte nationale d'identité",
    status: KycStatus.PENDING,
    submitted_at: "2026-08-29T08:00:00.000Z",
    reviewed_at: null,
  },
];

const notifications: AppNotificationDTO[] = [
  {
    id: "n-1",
    type: "payment",
    title: "Paiement reçu",
    message: "Cotisation de 250 000 GNF encaissée.",
    channel: NotificationChannel.IN_APP,
    read: false,
    created_at: "2026-08-30T09:00:00.000Z",
  },
  {
    id: "n-2",
    type: "reminder",
    title: "Échéance de prêt",
    message: "Votre échéance de 100 000 GNF arrive le 1er septembre.",
    channel: NotificationChannel.SMS,
    read: false,
    created_at: "2026-08-29T18:00:00.000Z",
  },
  {
    id: "n-3",
    type: "order",
    title: "Commande expédiée",
    message: "Votre commande marketplace est prête à être récupérée.",
    channel: NotificationChannel.WHATSAPP,
    read: true,
    created_at: "2026-08-28T12:00:00.000Z",
  },
];

const preferences: NotificationPreference[] = [
  { channel: NotificationChannel.SMS, event_type: "payment", enabled: true },
  { channel: NotificationChannel.SMS, event_type: "reminder", enabled: true },
  { channel: NotificationChannel.EMAIL, event_type: "payment", enabled: false },
  { channel: NotificationChannel.WHATSAPP, event_type: "order", enabled: true },
  { channel: NotificationChannel.IN_APP, event_type: "payment", enabled: true },
];

const conversations: ConversationDTO[] = [
  {
    id: "c-1",
    participant: "Mamadou Sow",
    last_message: "Merci, à bientôt !",
    unread: 2,
    updated_at: "2026-08-30T08:00:00.000Z",
  },
  {
    id: "c-2",
    participant: "Aïssatou Barry",
    last_message: "Le versement est confirmé.",
    unread: 0,
    updated_at: "2026-08-28T17:00:00.000Z",
  },
];

const messages: Record<string, MessageDTO[]> = {
  "c-1": [
    {
      id: "msg-1",
      conversation_id: "c-1",
      sender: "them",
      body: "Bonjour, la réunion est-elle maintenue demain ?",
      created_at: "2026-08-30T07:50:00.000Z",
    },
    {
      id: "msg-2",
      conversation_id: "c-1",
      sender: "me",
      body: "Oui, à 10h à la maison des jeunes.",
      created_at: "2026-08-30T07:58:00.000Z",
    },
    {
      id: "msg-3",
      conversation_id: "c-1",
      sender: "them",
      body: "Merci, à bientôt !",
      created_at: "2026-08-30T08:00:00.000Z",
    },
  ],
  "c-2": [
    {
      id: "msg-4",
      conversation_id: "c-2",
      sender: "me",
      body: "As-tu reçu le versement ?",
      created_at: "2026-08-28T16:40:00.000Z",
    },
    {
      id: "msg-5",
      conversation_id: "c-2",
      sender: "them",
      body: "Le versement est confirmé.",
      created_at: "2026-08-28T17:00:00.000Z",
    },
  ],
};

const referrals: ReferralDTO[] = [
  {
    id: "rf-1",
    referred_name: "Fatoumata Camara",
    status: "active",
    joined_at: "2026-06-15T09:00:00.000Z",
    reward: 2000,
  },
  {
    id: "rf-2",
    referred_name: "Ibrahima Bah",
    status: "pending",
    joined_at: "2026-08-20T09:00:00.000Z",
    reward: 0,
  },
];

const syncQueue: SyncQueueItemDTO[] = [
  {
    id: "sq-1",
    action: "Déclaration de paiement en espèces",
    module: "community",
    status: SyncStatus.PENDING,
    created_at: "2026-08-29T20:00:00.000Z",
  },
  {
    id: "sq-2",
    action: "Présence réunion (QR Code)",
    module: "community",
    status: SyncStatus.CONFLICT,
    created_at: "2026-08-28T19:00:00.000Z",
  },
];

function getBundle() {
  return {
    profile: clone(profile),
    home: clone(home),
    memberships: clone(memberships),
    favorites: clone(favorites),
    vault: clone(vault),
    kyc: clone(kyc),
    notifications: clone(notifications),
    preferences: clone(preferences),
    conversations: clone(conversations),
    referrals: clone(referrals),
    sync_queue: clone(syncQueue),
  };
}

function toggleFavorite(config: InternalAxiosRequestConfig): FavoriteDTO[] {
  const payload = (config.data ?? {}) as {
    type: FavoriteType;
    label: string;
    detail: string;
  };

  const existing = favorites.find(
    (f) => f.label === payload.label && f.type === payload.type,
  );

  if (existing) {
    const index = favorites.indexOf(existing);
    favorites.splice(index, 1);
  } else {
    favorites.unshift({
      id: `f-${Date.now()}`,
      type: payload.type,
      label: payload.label,
      detail: payload.detail,
      created_at: now(),
    });
  }

  return clone(favorites);
}

function retrySync(): SyncQueueItemDTO[] {
  for (const item of syncQueue) {
    if (item.status === SyncStatus.PENDING) {
      item.status = SyncStatus.SYNCED;
    }
  }
  return clone(syncQueue);
}

function submitKyc(config: InternalAxiosRequestConfig): KycRequestDTO {
  const payload = (config.data ?? {}) as { document_type: string };
  const record: KycRequestDTO = {
    id: `k-${Date.now()}`,
    document_type: payload.document_type,
    status: KycStatus.PENDING,
    submitted_at: now(),
    reviewed_at: null,
  };
  kyc.unshift(record);
  profile.kyc_status = KycStatus.PENDING;
  return clone(record);
}

function markAllRead(): AppNotificationDTO[] {
  for (const n of notifications) {
    n.read = true;
  }
  return clone(notifications);
}

function savePreferences(
  config: InternalAxiosRequestConfig,
): NotificationPreference[] {
  const payload = (config.data ?? {}) as SavePreferencesPayload;
  preferences.length = 0;
  preferences.push(...payload.preferences);
  return clone(preferences);
}

function getMessages(config: InternalAxiosRequestConfig): MessageDTO[] {
  const match = config.url?.match(MESSAGES_URL);
  if (!match) return [];
  return clone(messages[match[1]] ?? []);
}

function sendMessage(config: InternalAxiosRequestConfig): MessageDTO {
  const payload = (config.data ?? {}) as SendMessagePayload;
  const record: MessageDTO = {
    id: `msg-${Date.now()}`,
    conversation_id: payload.conversation_id,
    sender: "me",
    body: payload.body,
    created_at: now(),
  };

  if (!messages[payload.conversation_id]) {
    messages[payload.conversation_id] = [];
  }
  messages[payload.conversation_id].push(record);

  const conversation = conversations.find(
    (c) => c.id === payload.conversation_id,
  );
  if (conversation) {
    conversation.last_message = payload.body;
    conversation.updated_at = now();
  }

  return clone(record);
}

function updateProfile(config: InternalAxiosRequestConfig): HubProfileDTO {
  const payload = (config.data ?? {}) as UpdateProfilePayload;
  profile.city = payload.city;
  profile.language = payload.language;
  return clone(profile);
}

function uploadVault(config: InternalAxiosRequestConfig): VaultDocumentDTO {
  const payload = (config.data ?? {}) as { name: string; category: string };
  const record: VaultDocumentDTO = {
    id: `v-${Date.now()}`,
    name: payload.name,
    category: payload.category,
    size: 0,
    encrypted: true,
    uploaded_at: now(),
  };
  vault.unshift(record);
  return clone(record);
}

function createConversation(config: InternalAxiosRequestConfig): ConversationDTO {
  const payload = (config.data ?? {}) as { participant: string };
  const record: ConversationDTO = {
    id: `c-${Date.now()}`,
    participant: payload.participant,
    last_message: "",
    unread: 0,
    updated_at: now(),
  };
  conversations.unshift(record);
  messages[record.id] = [];
  return clone(record);
}

export function hubMockAdapter(
  config: InternalAxiosRequestConfig,
): AxiosAdapter | null {
  const method = (config.method ?? "get").toLowerCase();
  const url = config.url ?? "";

  if (method === "get" && BUNDLE_URL.test(url)) {
    return async () => toResponse(getBundle());
  }
  if (method === "post" && FAVORITE_TOGGLE_URL.test(url)) {
    return async (cfg) => toResponse(toggleFavorite(cfg));
  }
  if (method === "post" && SYNC_RETRY_URL.test(url)) {
    return async () => toResponse(retrySync());
  }
  if (method === "post" && KYC_SUBMIT_URL.test(url)) {
    return async (cfg) => toResponse(submitKyc(cfg));
  }
  if (method === "post" && NOTIFICATIONS_READ_URL.test(url)) {
    return async () => toResponse(markAllRead());
  }
  if (method === "post" && PREFERENCES_URL.test(url)) {
    return async (cfg) => toResponse(savePreferences(cfg));
  }
  if (method === "get" && MESSAGES_URL.test(url)) {
    return async (cfg) => toResponse(getMessages(cfg));
  }
  if (method === "post" && SEND_MESSAGE_URL.test(url)) {
    return async (cfg) => toResponse(sendMessage(cfg));
  }
  if (method === "post" && PROFILE_URL.test(url)) {
    return async (cfg) => toResponse(updateProfile(cfg));
  }
  if (method === "post" && VAULT_URL.test(url)) {
    return async (cfg) => toResponse(uploadVault(cfg));
  }
  if (method === "post" && CONVERSATIONS_URL.test(url)) {
    return async (cfg) => toResponse(createConversation(cfg));
  }

  return null;
}
