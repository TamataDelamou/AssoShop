// ============================================
// ENUMS - MEMBRES
// ============================================
import { TreasuryAccountType } from "./accounting";
import { EngagementLevel } from "./finance";

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
// INTERFACES - MEMBRES
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

// Formulaire public de demande d'adhésion (auto-inscription).
export interface SubmitAdhesionPayload {
  name: string;
  email?: string;
  phone?: string;
}

// ============================================
// INTERFACES - PROFIL COMPLET DU MEMBRE (COM-11)
// ============================================
export interface MemberProfileHistory {
  contributions_count: number;
  meetings_attended: number;
  social_aids_received: number;
  tontines_count: number;
  savings_active: boolean;
  purchases_count: number;
}

export interface MemberProfile {
  member_id: string;
  organization_id: string;
  member_name: string;
  engagement: EngagementLevel;
  trust_score: number;
  history: MemberProfileHistory;
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

// ============================================
// ENUMS - COTISATIONS
// ============================================
export enum ContributionStatus {
  DUE = "due",
  PENDING = "pending",
  PAID = "paid",
  OVERDUE = "overdue",
  REJECTED = "rejected",
}

export enum ContributionMethod {
  ONLINE = "online",
  CASH = "cash",
}

// ============================================
// INTERFACES - COTISATIONS
// ============================================
export interface Contribution {
  id: string;
  organization_id: string;
  member_id: string;
  member?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  amount: number;
  period_label: string;
  due_date: Date | null;
  status: ContributionStatus;
  method: ContributionMethod | null;
  paid_at: Date | null;
  paid_by?: {
    id: string;
    name: string;
  } | null;
  validated_by?: string | null;
}

export interface PayContributionPayload {
  contribution_id?: string;
  beneficiary_member_id: string;
  amount: number;
  method: ContributionMethod;
}

export interface ValidateContributionPayload {
  decision: "approve" | "reject";
  validator_name: string;
}

// ============================================
// ENUMS - CAS SOCIAUX
// ============================================
export enum SocialCaseStatus {
  SUBMITTED = "submitted",
  UNDER_REVIEW = "under_review",
  APPROVED = "approved",
  FUNDED = "funded",
  DISBURSED = "disbursed",
  REJECTED = "rejected",
}

export enum SocialCaseType {
  ILLNESS = "illness",
  DEATH = "death",
  DISASTER = "disaster",
  OTHER = "other",
}

export interface SocialCaseContributor {
  id: string;
  name: string;
  amount: number;
  contributed_at: Date | null;
  anonymous: boolean;
}

export interface SocialCase {
  id: string;
  organization_id: string;
  title: string;
  description: string;
  type: SocialCaseType;
  status: SocialCaseStatus;
  beneficiary_name: string;
  target_amount: number;
  collected_amount: number;
  currency: string;
  contributors_visible: boolean;
  committee_note?: string | null;
  disbursed_at: Date | null;
  created_at: Date | null;
  contributors?: SocialCaseContributor[];
}

export interface CreateSocialCasePayload {
  title: string;
  description: string;
  type: SocialCaseType;
  beneficiary_name: string;
  target_amount: number;
  contributors_visible: boolean;
}

export interface ValidateSocialCasePayload {
  decision: "approve" | "reject";
  committee_note?: string;
}

export interface ContributeSocialCasePayload {
  contributor_name: string;
  amount: number;
  anonymous: boolean;
}

// ============================================
// ENUMS - RÉUNIONS
// ============================================
export enum MeetingStatus {
  PLANNED = "planned",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum AttendanceStatus {
  INVITED = "invited",
  PRESENT = "present",
  ABSENT = "absent",
  EXCUSED = "excused",
}

// ============================================
// INTERFACES - RÉUNIONS
// ============================================
export interface MeetingAttendee {
  id: string;
  name: string;
  status: AttendanceStatus;
  checked_in_at: Date | null;
}

export interface Meeting {
  id: string;
  organization_id: string;
  title: string;
  date: Date | null;
  location: string;
  agenda: string;
  status: MeetingStatus;
  minutes: string | null;
  reminder_enabled: boolean;
  created_at: Date | null;
  attendees: MeetingAttendee[];
}

export interface PlanMeetingPayload {
  title: string;
  date: string;
  location: string;
  agenda: string;
  reminder_enabled: boolean;
}

export interface SaveMinutesPayload {
  minutes: string;
}

export interface CheckInAttendeePayload {
  attendee_id: string;
  status: AttendanceStatus;
}

// ============================================
// ENUMS - ANNONCES
// ============================================
export enum AnnouncementAudience {
  MEMBERS = "members",
  AFFILIATES = "affiliates",
}

// ============================================
// INTERFACES - ANNONCES
// ============================================
export interface Announcement {
  id: string;
  organization_id: string;
  author_name: string;
  title: string;
  content: string;
  audience: AnnouncementAudience;
  pinned: boolean;
  relayed_from: string | null;
  created_at: Date | null;
}

export interface PublishAnnouncementPayload {
  title: string;
  content: string;
  audience: AnnouncementAudience;
  pinned: boolean;
}

// ============================================
// ENUMS - DOCUMENTS
// ============================================
export enum DocumentCategory {
  STATUTES = "statutes",
  INTERNAL_RULES = "internal_rules",
  MEETING_MINUTES = "meeting_minutes",
  FINANCIAL = "financial",
  OTHER = "other",
}

// ============================================
// INTERFACES - DOCUMENTS
// ============================================
export interface AssociationDocument {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  category: DocumentCategory;
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  created_at: Date | null;
}

export interface UploadDocumentPayload {
  name: string;
  description: string;
  category: DocumentCategory;
  file_name: string;
  file_type: string;
  file_size: number;
}

// ============================================
// ENUMS - PROJETS
// ============================================
export enum ProjectStatus {
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

// ============================================
// INTERFACES - PROJETS
// ============================================
export interface ProjectContribution {
  id: string;
  contributor_name: string;
  amount: number;
  anonymous: boolean;
  contributed_at: Date | null;
}

export interface CommunityProject {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  goal_amount: number;
  raised_amount: number;
  status: ProjectStatus;
  relayed_from: string | null;
  relayed_to_affiliates: boolean;
  start_date: Date | null;
  created_at: Date | null;
  contributions: ProjectContribution[];
}

export interface CreateProjectPayload {
  name: string;
  description: string;
  goal_amount: number;
  relayed_to_affiliates: boolean;
}

export interface ContributeToProjectPayload {
  contributor_name: string;
  amount: number;
  anonymous: boolean;
}

// ============================================
// ENUMS - AGENDA / ÉVÉNEMENTS
// ============================================
export enum EventType {
  MEETING = "meeting",
  GENERAL_ASSEMBLY = "general_assembly",
  ACTIVITY = "activity",
  TRAINING = "training",
  OUTING = "outing",
  OTHER = "other",
}

// ============================================
// INTERFACES - AGENDA / ÉVÉNEMENTS
// ============================================
export interface CommunityEvent {
  id: string;
  organization_id: string;
  title: string;
  type: EventType;
  description: string | null;
  start_at: Date | null;
  end_at: Date | null;
  location: string;
  created_at: Date | null;
}

export interface CreateEventPayload {
  title: string;
  type: EventType;
  description?: string;
  start_at: string; // ISO datetime
  end_at?: string; // ISO datetime
  location: string;
}

// ============================================
// ENUMS - PARAMÈTRES DE L'ASSOCIATION
// ============================================
export enum MembershipValidationMode {
  MANUAL = "manual",
  AUTO = "auto",
}

// ============================================
// INTERFACES - PARAMÈTRES DE L'ASSOCIATION
// ============================================
export interface OrganizationSettings {
  organization_id: string;
  confidentiality: {
    members_visible_to_affiliates: boolean;
    financial_details_visible_to_affiliates: boolean;
    contributors_visible_in_social_cases: boolean;
  };
  membership: {
    validation_mode: MembershipValidationMode;
    sponsorship_required: boolean;
  };
  updated_at: Date | null;
}

export interface UpdateOrganizationSettingsPayload {
  confidentiality: {
    members_visible_to_affiliates: boolean;
    financial_details_visible_to_affiliates: boolean;
    contributors_visible_in_social_cases: boolean;
  };
  membership: {
    validation_mode: MembershipValidationMode;
    sponsorship_required: boolean;
  };
}

// ============================================
// ENUMS - SANCTIONS
// ============================================
export enum SanctionType {
  WARNING = "warning",
  SUSPENSION = "suspension",
  EXCLUSION = "exclusion",
}

export enum SanctionStatus {
  ACTIVE = "active",
  LIFTED = "lifted",
}

// ============================================
// INTERFACES - SANCTIONS
// ============================================
export interface Sanction {
  id: string;
  organization_id: string;
  member_id: string;
  member?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  type: SanctionType;
  reason: string;
  duration_days: number | null;
  start_date: Date | null;
  end_date: Date | null;
  status: SanctionStatus;
  created_at: Date | null;
}

export interface ApplySanctionPayload {
  member_id: string;
  type: SanctionType;
  reason: string;
  duration_days?: number; // requis pour une suspension
}

// ============================================
// ENUMS - GOUVERNANCE (ÉLECTIONS)
// ============================================
export enum ElectionStatus {
  OPEN = "open",
  CLOSED = "closed",
}

// ============================================
// INTERFACES - GOUVERNANCE (ÉLECTIONS & MANDATS)
// ============================================
export interface ElectionCandidate {
  id: string;
  member_id: string;
  member_name?: string;
  votes: number;
}

export interface Election {
  id: string;
  organization_id: string;
  title: string;
  position: MemberRole;
  status: ElectionStatus;
  start_date: Date | null;
  end_date: Date | null;
  candidates: ElectionCandidate[];
}

export interface CastVotePayload {
  candidate_id: string;
}

export interface DeclareCandidacyPayload {
  member_id: string;
}

export interface MandateOfficeHolder {
  role: MemberRole;
  member_name: string;
}

export interface Mandate {
  id: string;
  organization_id: string;
  label: string;
  start_date: Date | null;
  end_date: Date | null;
  office_holders: MandateOfficeHolder[];
}

// ============================================
// ENUMS - TÂCHES ET RESPONSABILITÉS
// ============================================
export enum TaskStatus {
  TODO = "todo",
  IN_PROGRESS = "in_progress",
  DONE = "done",
}

// ============================================
// INTERFACES - TÂCHES ET RESPONSABILITÉS
// ============================================
export interface CommunityTask {
  id: string;
  organization_id: string;
  title: string;
  description?: string;
  assignee_id: string | null;
  assignee?: {
    id: string;
    name: string;
  };
  status: TaskStatus;
  progress: number; // 0-100
  due_date: Date | null;
  created_at: Date | null;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  assignee_id?: string;
  due_date?: string; // ISO date
}

export interface UpdateTaskPayload {
  progress?: number; // 0-100
  assignee_id?: string | null;
}

// ============================================
// ENUMS - BÉNÉFICIAIRES & ÉVALUATION
// ============================================
export enum BeneficiaryCategory {
  CONSTRUCTION = "construction",
  AGRICULTURE = "agriculture",
  LIVESTOCK = "livestock",
  HEALTH = "health",
  EDUCATION = "education",
  COMMERCE = "commerce",
}

export enum BeneficiaryStatus {
  SUPPORTED = "supported",
  COMPLETED = "completed",
}

// ============================================
// INTERFACES - BÉNÉFICIAIRES & ÉVALUATION
// ============================================
export interface Beneficiary {
  id: string;
  organization_id: string;
  project_id: string;
  project_name?: string;
  name: string;
  category: BeneficiaryCategory;
  status: BeneficiaryStatus;
  registered_at: Date | null;
}

export interface CreateBeneficiaryPayload {
  project_id: string;
  name: string;
  category: BeneficiaryCategory;
}

export interface ProjectEvaluation {
  id: string;
  organization_id: string;
  project_id: string;
  project_name?: string;
  objectives: string;
  results: string;
  impact: string;
  rating: number; // 1-5
  evaluated_at: Date | null;
}

export interface CreateEvaluationPayload {
  project_id: string;
  objectives: string;
  results: string;
  impact: string;
  rating: number;
}

// ============================================
// ENUMS - TRÉSORERIE
// ============================================
export enum TransactionType {
  INCOME = "income",
  EXPENSE = "expense",
}

export interface TreasuryTransaction {
  id: string;
  organization_id: string;
  type: TransactionType;
  label: string;
  amount: number;
  account: TreasuryAccountType;
  date: Date | null;
  reference?: string;
  created_at: Date | null;
}

export interface CreateTransactionPayload {
  type: TransactionType;
  label: string;
  amount: number;
  account: TreasuryAccountType;
  date?: string; // ISO date
  reference?: string;
}

// ============================================
// ENUMS - GESTION DES ACTIFS
// ============================================
export enum AssetCategory {
  VEHICLE = "vehicle",
  COMPUTER = "computer",
  PRINTER = "printer",
  BUILDING = "building",
  LAND = "land",
  FURNITURE = "furniture",
  AGRICULTURAL = "agricultural",
}

export enum AssetStatus {
  AVAILABLE = "available",
  IN_USE = "in_use",
  MAINTENANCE = "maintenance",
  OUT_OF_SERVICE = "out_of_service",
}

// ============================================
// INTERFACES - GESTION DES ACTIFS
// ============================================
export interface Asset {
  id: string;
  organization_id: string;
  name: string;
  category: AssetCategory;
  status: AssetStatus;
  quantity: number;
  acquisition_value: number;
  acquisition_date: Date | null;
  location?: string;
  assigned_to?: string;
}

export interface CreateAssetPayload {
  name: string;
  category: AssetCategory;
  quantity: number;
  acquisition_value: number;
  acquisition_date?: string; // ISO date
  location?: string;
  assigned_to?: string;
}

// ============================================
// ENUMS - RESSOURCES HUMAINES
// ============================================
export enum StaffType {
  EMPLOYEE = "employee",
  VOLUNTEER = "volunteer",
  CONSULTANT = "consultant",
}

export enum ContractType {
  CDI = "cdi",
  CDD = "cdd",
  VOLUNTEERING = "volunteering",
  CONSULTING = "consulting",
}

export enum StaffStatus {
  ACTIVE = "active",
  ON_LEAVE = "on_leave",
  INACTIVE = "inactive",
}

export enum LeaveStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

// ============================================
// INTERFACES - RESSOURCES HUMAINES
// ============================================
export interface StaffMember {
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  type: StaffType;
  position: string;
  contract_type: ContractType;
  status: StaffStatus;
  monthly_salary: number; // 0 pour les bénévoles
  hire_date: Date | null;
}

export interface CreateStaffPayload {
  first_name: string;
  last_name: string;
  type: StaffType;
  position: string;
  contract_type: ContractType;
  monthly_salary: number;
  hire_date?: string; // ISO date
}

export interface LeaveRequest {
  id: string;
  organization_id: string;
  staff_id: string;
  staff_name?: string;
  reason: string;
  start_date: Date | null;
  end_date: Date | null;
  status: LeaveStatus;
}

export interface CreateLeavePayload {
  staff_id: string;
  reason: string;
  start_date: string; // ISO date
  end_date: string; // ISO date
}

export interface AttendanceRecord {
  id: string;
  organization_id: string;
  staff_id: string;
  staff_name?: string;
  date: Date | null;
  present: boolean;
}

export interface StaffEvaluation {
  id: string;
  organization_id: string;
  staff_id: string;
  staff_name?: string;
  period: string;
  rating: number; // 1-5
  comments: string;
  evaluated_at: Date | null;
}

export interface CreateStaffEvaluationPayload {
  staff_id: string;
  period: string;
  rating: number;
  comments: string;
}

// ============================================
// ENUMS - ANTENNES ET SECTIONS
// ============================================
export enum StructureLevel {
  HEADQUARTER = "headquarters",
  REGIONAL = "regional",
  PREFECTORAL = "prefectoral",
  COMMUNAL = "communal",
  NEIGHBORHOOD = "neighborhood",
}

// ============================================
// INTERFACES - ANTENNES ET SECTIONS
// ============================================
export interface Antenna {
  id: string;
  organization_id: string;
  parent_id: string | null; // null = rattaché au siège (structure mère)
  name: string;
  level: StructureLevel;
  city: string;
  address?: string;
  responsible?: string;
  member_count: number;
  created_at: Date | null;
}

export interface CreateAntennaPayload {
  name: string;
  level: StructureLevel;
  city: string;
  parent_id?: string | null;
  address?: string;
  responsible?: string;
}

// ============================================
// ENUMS - SIGNATURE ÉLECTRONIQUE
// ============================================
export enum SignatureDocumentType {
  LOAN = "loan",
  EXPENSE = "expense",
  MINUTES = "minutes",
  EXCEPTIONAL_WITHDRAWAL = "exceptional_withdrawal",
}

export enum SignatureStatus {
  PENDING = "pending",
  SIGNED = "signed",
  REJECTED = "rejected",
}

// ============================================
// INTERFACES - SIGNATURE ÉLECTRONIQUE
// ============================================
export interface Signatory {
  id: string;
  name: string;
  role: string;
  signed_at: Date | null; // null = pas encore signé
}

export interface SignatureRequest {
  id: string;
  organization_id: string;
  type: SignatureDocumentType;
  title: string;
  description: string;
  amount?: number;
  requested_by: string;
  signatories: Signatory[];
  status: SignatureStatus;
  created_at: Date | null;
}

export interface CreateSignatureRequestPayload {
  type: SignatureDocumentType;
  title: string;
  description: string;
  amount?: number;
  requested_by: string;
  signatories: { name: string; role: string }[];
}

// ============================================
// ENUMS - ASSOCIATIONS AFFILIÉES
// ============================================
export enum AffiliationStatus {
  PENDING = "pending",
  ACTIVE = "active",
  SUSPENDED = "suspended",
}

// ============================================
// INTERFACES - ASSOCIATIONS AFFILIÉES
// ============================================
export interface Affiliation {
  id: string;
  organization_id: string;
  affiliate_id: string;
  affiliate_name?: string;
  status: AffiliationStatus;
  share_members: boolean;
  share_finances: boolean;
  shared_member_count: number;
  linked_at: Date | null;
}

export interface LinkAffiliationPayload {
  affiliate_id: string;
  share_members: boolean;
  share_finances: boolean;
}

export interface UpdateAffiliationPayload {
  status?: AffiliationStatus;
  share_members?: boolean;
  share_finances?: boolean;
}

// ============================================
// ENUMS - ADHÉSION PARTAGÉE
// ============================================
export enum SharedMembershipStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

// ============================================
// INTERFACES - ADHÉSION PARTAGÉE
// ============================================
export interface SharedMembershipRequest {
  id: string;
  organization_id: string;
  member_name: string;
  email?: string;
  phone?: string;
  source_affiliation_id: string;
  source_organization_name?: string;
  fee_exempt: boolean;
  status: SharedMembershipStatus;
  requested_at: Date | null;
}

export interface CreateSharedMembershipPayload {
  member_name: string;
  email?: string;
  phone?: string;
  source_affiliation_id: string;
  fee_exempt: boolean;
}

// ============================================
// ENUMS - DÉCLARATION DE DÉMÉNAGEMENT
// ============================================
export enum RelocationStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
}

// ============================================
// INTERFACES - DÉCLARATION DE DÉMÉNAGEMENT
// ============================================
export interface MemberRelocation {
  id: string;
  organization_id: string;
  member_id: string;
  member_name?: string;
  old_address: string;
  new_address: string;
  new_city: string;
  reason?: string;
  status: RelocationStatus;
  requested_at: Date | null;
  confirmed_at: Date | null;
}

export interface CreateRelocationPayload {
  member_id: string;
  old_address: string;
  new_address: string;
  new_city: string;
  reason?: string;
}

// ============================================
// ENUMS - MOBILITÉ (RAPPORT + DÉCISION DE TRANSFERT)
// ============================================
export enum TransferDecisionStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
}

// ============================================
// INTERFACES - RAPPORT DE MOBILITÉ (COM-49)
// ============================================
export interface MobilityIndicators {
  contributions_count: number;
  meetings_attended: number;
}

export interface MobilityReport {
  id: string;
  organization_id: string;
  relocation_id: string;
  member_id: string;
  member_name?: string;
  engagement: EngagementLevel;
  trust_score: number;
  indicators: MobilityIndicators;
  generated_at: Date | null;
}

export interface GenerateMobilityReportPayload {
  member_id: string;
  member_name?: string;
}

// ============================================
// INTERFACES - DÉCISION D'ADHÉSION SUR TRANSFERT (COM-50)
// ============================================
export interface TransferDecision {
  id: string;
  organization_id: string;
  relocation_id: string;
  member_id: string;
  member_name?: string;
  status: TransferDecisionStatus;
  sponsorship?: string;
  decision_note?: string;
  decided_at: Date | null;
  decided_by?: string;
}

export interface DecideTransferPayload {
  status: TransferDecisionStatus;
  sponsorship?: string;
  decision_note?: string;
  decided_by?: string;
}
