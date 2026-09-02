// Types du module Hub Communautaire et socle transversal (AssoShop).

// RG-H04 : l'indicateur d'engagement (badge 4 couleurs) est partagé avec
// le module Finance — réutilisé ici, jamais redéfini.
import { EngagementLevel } from "@/types/modules/finance";
export { EngagementLevel };

export enum KycStatus {
  NOT_SUBMITTED = "not_submitted",
  PENDING = "pending",
  VERIFIED = "verified",
  REJECTED = "rejected",
}

export enum FavoriteType {
  PRODUCT = "product",
  ASSOCIATION = "association",
  GROUP = "group",
  PROVIDER = "provider",
}

export enum MembershipKind {
  ASSOCIATION = "association",
  GROUP = "group",
}

export enum NotificationChannel {
  SMS = "sms",
  EMAIL = "email",
  WHATSAPP = "whatsapp",
  IN_APP = "in_app",
}

export enum SyncStatus {
  PENDING = "pending",
  SYNCED = "synced",
  CONFLICT = "conflict",
}

export interface HubProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  country: string;
  language: string;
  engagement: EngagementLevel;
  trust_score: number;
  kyc_status: KycStatus;
  joined_at: Date;
}

export interface Membership {
  id: string;
  kind: MembershipKind;
  name: string;
  type: string;
  role: string;
  status: string;
}

export interface Favorite {
  id: string;
  type: FavoriteType;
  label: string;
  detail: string;
  created_at: Date;
}

export interface VaultDocument {
  id: string;
  name: string;
  category: string;
  size: number;
  encrypted: boolean;
  uploaded_at: Date;
}

export interface KycRequest {
  id: string;
  document_type: string;
  status: KycStatus;
  submitted_at: Date;
  reviewed_at: Date | null;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  channel: NotificationChannel;
  read: boolean;
  created_at: Date;
}

export interface NotificationPreference {
  channel: NotificationChannel;
  event_type: string;
  enabled: boolean;
}

export interface Conversation {
  id: string;
  participant: string;
  last_message: string;
  unread: number;
  updated_at: Date;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender: "me" | "them";
  body: string;
  created_at: Date;
}

export interface Referral {
  id: string;
  referred_name: string;
  status: string;
  joined_at: Date;
  reward: number;
}

export interface SyncQueueItem {
  id: string;
  action: string;
  module: string;
  status: SyncStatus;
  created_at: Date;
}

export interface HubHome {
  associations_count: number;
  groups_count: number;
  pending_invitations: number;
  monthly_income: number;
  monthly_expenses: number;
  currency: string;
}

export interface HubBundle {
  profile: HubProfile;
  home: HubHome;
  memberships: Membership[];
  favorites: Favorite[];
  vault: VaultDocument[];
  kyc: KycRequest[];
  notifications: AppNotification[];
  preferences: NotificationPreference[];
  conversations: Conversation[];
  referrals: Referral[];
  sync_queue: SyncQueueItem[];
}

export interface SendMessagePayload {
  conversation_id: string;
  body: string;
}

export interface SavePreferencesPayload {
  preferences: NotificationPreference[];
}

export interface UpdateProfilePayload {
  city: string;
  language: string;
}
