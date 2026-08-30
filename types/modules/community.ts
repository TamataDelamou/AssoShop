// ============================================
// ENUMS - MEMBRES
// ============================================
export enum MemberStatus {
  PENDING = "pending",
  ACTIVE = "active",
  INACTIVE = "inactive",
  EXPELLED = "expelled",
  LEFT = "left",
}

export enum MemberRole {
  PRESIDENT = "president",
  VICE_PRESIDENT = "vice_president",
  SECRETARY = "secretary",
  VICE_SECRETARY = "vice_secretary",
  TREASURER = "treasurer",
  VICE_TREASURER = "vice_treasurer",
  AUDITOR = "auditor",
  COMMITTEE_HEAD = "committee_head",
  MEMBER = "member",
}

// ============================================
// INTERFACES
// ============================================
export interface Member {
  id: string;
  organization_id: string;
  user_id: string;
  status: MemberStatus;
  role: MemberRole;
  joined_at: Date | null;
  user?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    avatar_url?: string;
  };
  // Pour le parrainage (optionnel)
  sponsor_id?: string;
}

export interface CreateMemberPayload {
  organization_id: string;
  user_id?: string; // Si déjà inscrit
  email?: string; // Si on l'invite par email
  phone?: string; // Si on l'invite par téléphone
  role: MemberRole;
}

// ============================================
// ORGANISATIONS
// ============================================
export interface Organization {
  id: string;
  name: string;
  type: string;
  city?: string;
  object?: string;
  status: string;
  memberCount?: number;
  created_at?: string | Date | null;
  updated_at?: string | Date | null;
}

export interface CreateOrganizationPayload {
  name: string;
  type: string;
  city?: string;
  object?: string;
}
