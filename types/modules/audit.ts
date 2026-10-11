// ============================================
// ENUMS - JOURNAL D'AUDIT (cahier v6 §14)
// ============================================

// Doit rester identique à la contrainte event_type de
// supabase/migrations (0018, étendue par 0019 ; vérifié par tests/unit/audit.test.ts).
export enum AuditEventType {
  PAY_PAYMENT = "pay.payment",
  PAY_TOPUP = "pay.topup",
  PAY_TOPUP_CONFIRMED = "pay.topup_confirmed",
  PAY_WITHDRAWAL = "pay.withdrawal",
  PAY_TRANSFER = "pay.transfer",
  MARKET_ORDER_PAID = "market.order_paid",
  CONTRIBUTION_VALIDATED = "contribution.validated",
  CONTRIBUTION_REJECTED = "contribution.rejected",
  LOAN_APPROVED = "loan.approved",
  LOAN_REJECTED = "loan.rejected",
  LOAN_REPAID = "loan.repaid",
  LOAN_INSTALLMENT_REPAID = "loan.installment_repaid",
  GROUP_PAYMENT_VALIDATED = "group_payment.validated",
  SOCIAL_CASE_UNDER_REVIEW = "social_case.under_review",
  SOCIAL_CASE_APPROVED = "social_case.approved",
  SOCIAL_CASE_FUNDED = "social_case.funded",
  SOCIAL_CASE_DISBURSED = "social_case.disbursed",
  SOCIAL_CASE_REJECTED = "social_case.rejected",
  ACCOUNTING_ENTRY_VALIDATED = "accounting_entry.validated",
  ACCOUNTING_ENTRY_REJECTED = "accounting_entry.rejected",
  MEMBER_ROLE_CHANGED = "member.role_changed",
  MEMBER_STATUS_CHANGED = "member.status_changed",
  MEMBER_REMOVED = "member.removed",
  SIGNATURE_SIGNED = "signature.signed",
  SIGNATURE_REJECTED = "signature.rejected",
}

export enum AuditEntityType {
  PAY_TRANSACTION = "pay_transaction",
  MARKET_ORDER = "market_order",
  CONTRIBUTION = "contribution",
  LOAN = "loan",
  LOAN_INSTALLMENT = "loan_installment",
  GROUP_PAYMENT = "group_payment",
  SOCIAL_CASE = "social_case",
  ACCOUNTING_ENTRY = "accounting_entry",
  MEMBER = "member",
  SIGNATURE_REQUEST = "signature_request",
}

export enum AuditPeriod {
  LAST_7_DAYS = "7d",
  LAST_30_DAYS = "30d",
  LAST_90_DAYS = "90d",
  ALL = "all",
}

// ============================================
// INTERFACES - JOURNAL D'AUDIT
// ============================================

// État tracé avant / après l'action : statut, rôle et identifiants techniques
// uniquement (jamais de nom, de téléphone ni de pièce KYC).
export type AuditSnapshot = Record<string, string | number | boolean | null>;

export interface AuditEvent {
  id: string;
  organization_id: string | null;
  actor_id: string | null;
  // Nom de l'auteur, joint côté client depuis l'annuaire des membres.
  actor_name?: string;
  event_type: AuditEventType;
  entity_type: AuditEntityType;
  entity_id: string;
  amount: number | null;
  currency: string | null;
  before: AuditSnapshot | null;
  after: AuditSnapshot | null;
  created_at: Date | null;
}

export interface AuditEventsFilters {
  event_type?: AuditEventType | null;
  // Borne basse incluse (ISO 8601).
  since?: string | null;
  // Curseur de pagination : événements strictement antérieurs (ISO 8601).
  before?: string | null;
  limit?: number;
}

export interface AuditEventsPage {
  events: AuditEvent[];
  // À repasser dans `before` pour la page suivante ; null s'il n'y en a pas.
  next_before: string | null;
  has_more: boolean;
}
