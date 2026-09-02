// ============================================
// ENUMS - GROUPES FINANCIERS
// ============================================
export enum FinancialGroupType {
  TONTINE = "tontine",
  SAVINGS_GOAL = "savings_goal",
  SAVINGS = "savings",
}

export enum FinancialGroupStatus {
  FORMING = "forming",
  ACTIVE = "active",
  CLOSED = "closed",
}

export enum GroupPeriodicity {
  WEEKLY = "weekly",
  MONTHLY = "monthly",
}

export enum GroupMemberRole {
  CREATOR = "creator",
  SPONSOR = "sponsor",
  MEMBER = "member",
}

export enum EngagementLevel {
  AT_RISK = "at_risk",
  IRREGULAR = "irregular",
  RELIABLE = "reliable",
  EXEMPLARY = "exemplary",
}

export enum GroupPaymentStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
}

export enum GroupPaymentMethod {
  MOBILE = "mobile",
  CASH = "cash",
}

// ============================================
// INTERFACES - GROUPES FINANCIERS
// ============================================
export interface GroupMember {
  id: string;
  name: string;
  role: GroupMemberRole;
  engagement: EngagementLevel;
  joined_at: Date | null;
  last_payment_at: Date | null;
}

export interface GroupPayment {
  id: string;
  member_id: string;
  member_name: string;
  method: GroupPaymentMethod;
  amount: number;
  paid_for_member_name: string | null;
  status: GroupPaymentStatus;
  paid_at: Date | null;
}

export interface GroupTurn {
  id: string;
  member_id: string;
  member_name: string;
  position: number;
  expected_date: Date | null;
  received: boolean;
  received_at: Date | null;
}

export interface FinancialGroup {
  id: string;
  organization_id: string;
  name: string;
  type: FinancialGroupType;
  status: FinancialGroupStatus;
  amount: number;
  periodicity: GroupPeriodicity;
  max_members: number;
  goal_amount: number | null;
  interest_rate: number | null;
  start_date: Date | null;
  created_at: Date | null;
  raised_amount: number;
  members: GroupMember[];
  payments: GroupPayment[];
  turns: GroupTurn[];
}

export interface CreateFinancialGroupPayload {
  name: string;
  type: FinancialGroupType;
  amount: number;
  periodicity: GroupPeriodicity;
  max_members: number;
  goal_amount?: number | null;
  interest_rate?: number | null;
  // Tontine (FIN-3) : ordre de passage et date de début.
  start_date?: string | null;
  turn_member_names?: string[];
}

export interface DeclarePaymentPayload {
  member_id: string;
  amount: number;
  paid_for_member_id?: string | null;
  method: GroupPaymentMethod;
}

// ============================================
// ENUMS - TRANSACTIONS, STATISTIQUES & PARAMÈTRES
// ============================================
export enum GroupTransactionKind {
  CREATION = "creation",
  PAYMENT = "payment",
  PAYMENT_DECLARED = "payment_declared",
  TURN_PAYOUT = "turn_payout",
}

export enum GroupVisibility {
  PRIVATE = "private",
  MEMBERS = "members",
  PUBLIC = "public",
}

// ============================================
// INTERFACES - ADMINISTRATION DU GROUPE (FIN-21/30/31/32)
// ============================================
export interface GroupTransaction {
  id: string;
  group_id: string;
  kind: GroupTransactionKind;
  label: string;
  amount: number; // > 0 entrée, < 0 sortie, 0 = événement sans mouvement.
  member_name: string | null;
  date: Date | null;
}

export interface GroupStatistics {
  group_id: string;
  total_raised: number;
  payments_count: number;
  pending_count: number;
  confirmed_count: number;
  members_count: number;
  turns_total: number;
  turns_received: number;
  regularity_rate: number;
  last_payment_at: Date | null;
}

export interface GroupSettings {
  group_id: string;
  visibility: GroupVisibility;
  allow_join_requests: boolean;
  notify_payment_reminders: boolean;
}

export interface UpdateGroupSettingsPayload {
  visibility: GroupVisibility;
  allow_join_requests: boolean;
  notify_payment_reminders: boolean;
}

// ============================================
// PARRAINAGE (FIN-7..11, RG-F02)
// ============================================
export enum SponsorshipRequestStatus {
  PENDING = "pending",
  SPONSOR_ACCEPTED = "sponsor_accepted",
  CONFIRMED = "confirmed",
  DECLINED = "declined",
}

export interface SponsorshipRequest {
  id: string;
  group_id: string;
  group_name: string;
  sponsor_id: string;
  sponsor_name: string;
  invitee_name: string;
  invitee_phone: string | null;
  status: SponsorshipRequestStatus;
  created_at: Date | null;
}

export interface SponsorshipBundle {
  requests: SponsorshipRequest[];
  open_groups: FinancialGroup[];
}

export interface CreateSponsorshipRequestPayload {
  group_id: string;
  sponsor_id: string;
  invitee_name: string;
  invitee_phone?: string | null;
}

export interface RespondSponsorshipPayload {
  decision: "accept" | "decline";
}

// ============================================
// ENUMS - PRÊTS INTERNES
// ============================================
export enum LoanStatus {
  REQUESTED = "requested",
  SPONSOR_CONFIRMED = "sponsor_confirmed",
  APPROVED = "approved",
  REJECTED = "rejected",
  REPAID = "repaid",
}

export enum InstallmentStatus {
  PENDING = "pending",
  PAID = "paid",
}

// ============================================
// INTERFACES - PRÊTS INTERNES
// ============================================
export interface LoanInstallment {
  id: string;
  position: number;
  due_date: Date | null;
  amount: number;
  status: InstallmentStatus;
  paid_at: Date | null;
}

export interface GroupLoan {
  id: string;
  group_id: string;
  group_name: string;
  member_id: string;
  member_name: string;
  sponsor_name: string;
  amount: number;
  suggested_amount: number;
  interest_rate: number;
  total_due: number;
  repaid_amount: number;
  status: LoanStatus;
  requested_at: Date | null;
  sponsor_confirmed_at: Date | null;
  decision_at: Date | null;
  installments: LoanInstallment[];
}

export interface RequestLoanPayload {
  member_id: string;
  amount: number;
}

// ============================================
// ENUMS - ASSURANCE COMMUNAUTAIRE & SOLIDARITÉ
// ============================================
export enum InsuranceEnrollmentStatus {
  ACTIVE = "active",
  SUSPENDED = "suspended",
}

export enum ClaimStatus {
  SUBMITTED = "submitted",
  UNDER_REVIEW = "under_review",
  APPROVED = "approved",
  REJECTED = "rejected",
}

// ============================================
// INTERFACES - ASSURANCE COMMUNAUTAIRE & SOLIDARITÉ
// ============================================
export interface GuaranteeFund {
  balance: number;
  levy_rate: number;
  cap_amount: number;
  total_collected: number;
  total_used: number;
}

export interface InsuranceEnrollment {
  id: string;
  member_id: string;
  member_name: string;
  status: InsuranceEnrollmentStatus;
  joined_at: Date | null;
}

export interface InsuranceClaim {
  id: string;
  member_id: string;
  member_name: string;
  description: string;
  amount: number;
  indemnity: number;
  status: ClaimStatus;
  submitted_at: Date | null;
  decided_at: Date | null;
}

export interface SolidarityBundle {
  fund: GuaranteeFund;
  enrollments: InsuranceEnrollment[];
  claims: InsuranceClaim[];
}

export interface EnrollInsurancePayload {
  member_id: string;
  member_name: string;
}

export interface DeclareClaimPayload {
  member_id: string;
  member_name: string;
  description: string;
  amount: number;
}
