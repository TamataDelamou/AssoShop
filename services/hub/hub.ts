import { base44Client } from "@/lib/base44";
import {
  Favorite,
  FavoriteType,
  HubBundle,
  HubProfile,
  KycRequest,
  Message,
  NotificationPreference,
  SavePreferencesPayload,
  SendMessagePayload,
  SyncQueueItem,
  UpdateProfilePayload,
  VaultDocument,
  Conversation,
} from "@/types/modules/hub";
import { HUB_MESSAGES } from "@/utils/constants";

export const hubService = {
  async getBundle(): Promise<HubBundle> {
    const response = await base44Client.get("/hub/bundle");
    return response.data;
  },

  async toggleFavorite(payload: {
    type: FavoriteType;
    label: string;
    detail: string;
  }): Promise<Favorite[]> {
    const response = await base44Client.post("/hub/favorites/toggle", payload);
    if (!response.data) {
      throw new Error(HUB_MESSAGES.FAVORITE_ERROR);
    }
    return response.data;
  },

  async retrySync(): Promise<SyncQueueItem[]> {
    const response = await base44Client.post("/hub/sync/retry");
    if (!response.data) {
      throw new Error(HUB_MESSAGES.SYNC_ERROR);
    }
    return response.data;
  },

  async submitKyc(documentType: string): Promise<KycRequest> {
    const response = await base44Client.post("/hub/kyc/submit", {
      document_type: documentType,
    });
    if (!response.data) {
      throw new Error(HUB_MESSAGES.KYC_ERROR);
    }
    return response.data;
  },

  async markNotificationsRead(): Promise<void> {
    await base44Client.post("/hub/notifications/read");
  },

  async savePreferences(
    preferences: NotificationPreference[],
  ): Promise<NotificationPreference[]> {
    const payload: SavePreferencesPayload = { preferences };
    const response = await base44Client.post("/hub/preferences", payload);
    if (!response.data) {
      throw new Error(HUB_MESSAGES.PREF_ERROR);
    }
    return response.data;
  },

  async getMessages(conversationId: string): Promise<Message[]> {
    const response = await base44Client.get(
      `/hub/conversations/${conversationId}/messages`,
    );
    return response.data;
  },

  async sendMessage(payload: SendMessagePayload): Promise<Message> {
    const response = await base44Client.post("/hub/messages", payload);
    if (!response.data) {
      throw new Error(HUB_MESSAGES.SEND_ERROR);
    }
    return response.data;
  },

  async updateProfile(payload: UpdateProfilePayload): Promise<HubProfile> {
    const response = await base44Client.post("/hub/profile", payload);
    return response.data;
  },

  async uploadVaultDocument(
    name: string,
    category: string,
  ): Promise<VaultDocument> {
    const response = await base44Client.post("/hub/vault", { name, category });
    return response.data;
  },

  async createConversation(participant: string): Promise<Conversation> {
    const response = await base44Client.post("/hub/conversations", {
      participant,
    });
    return response.data;
  },
};
