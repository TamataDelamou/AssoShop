// Types du back-office web AssoShop (administration Global Service Groupe).
// 26 écrans WEB-01 → WEB-26.

export enum ReviewStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export enum DisputeStatus {
  OPEN = "open",
  IN_PROGRESS = "in_progress",
  RESOLVED = "resolved",
}

export enum AuditSeverity {
  INFO = "info",
  WARNING = "warning",
  CRITICAL = "critical",
}

export enum PlatformUserStatus {
  ACTIVE = "active",
  SUSPENDED = "suspended",
}

export enum AdminModule {
  COMMUNITY = "community",
  FINANCE = "finance",
  MARKET = "market",
  PAY = "pay",
  HUB = "hub",
  PLATFORM = "platform",
}

export interface AdminDashboardStats {
  active_users: number;
  associations_count: number;
  groups_count: number;
  monthly_volume: number;
  pending_validations: number;
  disputes_open: number;
  revenue: number;
  currency: string;
}

export interface ModuleKpi {
  module: AdminModule;
  label: string;
  metric: string;
  value: number;
  trend: number;
}

export interface CountrySnapshot {
  country: string;
  associations: number;
  members: number;
  volume: number;
}

export interface GlobalReport {
  period: string;
  modules: ModuleKpi[];
  top_countries: CountrySnapshot[];
}

export interface NationalStat {
  country: string;
  associations: number;
  members: number;
  groups: number;
  cotisations_volume: number;
  projects_financed: number;
}

export interface AuditLogEntry {
  id: string;
  actor: string;
  action: string;
  module: AdminModule;
  severity: AuditSeverity;
  created_at: Date;
}

export interface SecurityAuditEntry {
  id: string;
  actor: string;
  ip: string;
  action: string;
  result: string;
  created_at: Date;
}

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: PlatformUserStatus;
  created_at: Date;
}

export interface KycApplication {
  id: string;
  user_name: string;
  document_type: string;
  status: ReviewStatus;
  submitted_at: Date;
}

export interface InternalRole {
  id: string;
  name: string;
  permissions: string[];
  assigned_agents: number;
}

export interface Dispute {
  id: string;
  type: string;
  claimant: string;
  respondent: string;
  description: string;
  status: DisputeStatus;
  opened_at: Date;
}

export interface SupervisedAssociation {
  id: string;
  name: string;
  type: string;
  country: string;
  members_count: number;
  status: string;
  reports: number;
}

export interface SupervisedGroup {
  id: string;
  name: string;
  type: string;
  country: string;
  members_count: number;
  anomaly: boolean;
}

export interface OrgHierarchyNode {
  id: string;
  name: string;
  type: string;
  parent_id: string | null;
  country: string;
  children_count: number;
}

export interface SolidarityFundStatus {
  total_collected: number;
  covered_cases: number;
  available: number;
  currency: string;
}

export interface InsurancePartnership {
  id: string;
  insurer: string;
  country: string;
  commission_rate: number;
  status: string;
  active_since: Date;
}

export interface ResellerApplication {
  id: string;
  applicant_name: string;
  business_name: string;
  country: string;
  status: ReviewStatus;
  submitted_at: Date;
}

export interface CatalogCategory {
  id: string;
  name: string;
  parent: string | null;
  products_count: number;
}

export interface ModerationItem {
  id: string;
  type: string;
  title: string;
  author: string;
  reason: string;
  status: ReviewStatus;
  reported_at: Date;
}

export interface InvestmentProject {
  id: string;
  name: string;
  promoter: string;
  target_amount: number;
  raised_amount: number;
  status: string;
  currency: string;
  // Date limite de collecte (ISO) ; null pour un projet sans échéance.
  deadline: string | null;
  // Solde du compte de séquestre du projet.
  escrow_balance: number;
  investors_count: number;
}

// Bénéfice déclaré par un porteur de projet, à valider (WEB-25).
export interface InvestmentDistribution {
  id: string;
  project_id: string;
  project_name: string;
  profit_sharing_rules: string;
  amount: number;
  distributed_amount: number | null;
  currency: string;
  status: ReviewStatus;
  declared_at: Date;
}

export interface CommissionRule {
  id: string;
  service: string;
  rate: number;
  currency: string;
}

export interface SubscriptionPlan {
  id: string;
  tier: string;
  monthly_price: number;
  member_limit: number;
  currency: string;
}

export interface SubscriptionInvoice {
  id: string;
  organization: string;
  plan: string;
  amount: number;
  status: string;
  due_at: Date;
}

export interface PlatformConfig {
  platform_name: string;
  support_email: string;
  maintenance_mode: boolean;
  cgu_version: string;
  legal_text: string;
}

export interface CountryConfig {
  id: string;
  code: string;
  name: string;
  currency: string;
  language: string;
  timezone: string;
  tva_rate: number;
  status: string;
}

export interface MobileOperator {
  id: string;
  name: string;
  country: string;
  status: string;
}

export interface ApiIntegration {
  id: string;
  name: string;
  partner: string;
  api_key: string;
  webhook_url: string;
  status: string;
}

export interface AdminBundle {
  dashboard: AdminDashboardStats;
  reports: GlobalReport;
  national: NationalStat[];
  audit_logs: AuditLogEntry[];
  security_audit: SecurityAuditEntry[];
  users: PlatformUser[];
  kyc: KycApplication[];
  roles: InternalRole[];
  disputes: Dispute[];
  associations: SupervisedAssociation[];
  groups: SupervisedGroup[];
  hierarchy: OrgHierarchyNode[];
  solidarity: SolidarityFundStatus;
  insurance: InsurancePartnership[];
  resellers: ResellerApplication[];
  categories: CatalogCategory[];
  moderation: ModerationItem[];
  investments: InvestmentProject[];
  investment_distributions: InvestmentDistribution[];
  // Total bloqué sur les comptes de séquestre des projets.
  escrow_total: number;
  commissions: CommissionRule[];
  // Portefeuille plateforme (commissions encaissées) ; null s'il n'existe pas.
  platform_wallet: { balance: number; currency: string } | null;
  plans: SubscriptionPlan[];
  invoices: SubscriptionInvoice[];
  config: PlatformConfig;
  countries: CountryConfig[];
  operators: MobileOperator[];
  integrations: ApiIntegration[];
}
