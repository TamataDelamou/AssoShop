// ============================================
// ENUMS - COMPTABILITÉ D'ASSOCIATION (COM-41)
// ============================================
export enum TreasuryAccountType {
  CASH = "cash",
  BANK = "bank",
  MOBILE_MONEY = "mobile_money",
}

export enum AccountingEntryType {
  INCOME = "income",
  EXPENSE = "expense",
}

export enum AccountingEntryStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  REJECTED = "rejected",
}

export enum AccountingEntrySource {
  MANUAL = "manual",
  CONTRIBUTION = "contribution",
  SOCIAL_CASE = "social_case",
  TONTINE = "tontine",
  LOAN = "loan",
  SOLIDARITY = "solidarity",
}

// ============================================
// INTERFACES - COMPTABILITÉ D'ASSOCIATION
// ============================================
export interface TreasuryAccount {
  type: TreasuryAccountType;
  balance: number;
  pending_in: number;
  pending_out: number;
}

export interface AccountingEntry {
  id: string;
  organization_id: string;
  source: AccountingEntrySource;
  account_type: TreasuryAccountType;
  entry_type: AccountingEntryType;
  label: string;
  amount: number;
  payer_name: string;
  beneficiary_name: string;
  justification: string | null;
  status: AccountingEntryStatus;
  requires_double_validation: boolean;
  validated_by: string | null;
  second_validated_by: string | null;
  created_at: Date | null;
  validated_at: Date | null;
}

export interface AccountingBundle {
  accounts: TreasuryAccount[];
  entries: AccountingEntry[];
}

export interface CreateAccountingEntryPayload {
  account_type: TreasuryAccountType;
  entry_type: AccountingEntryType;
  label: string;
  amount: number;
  payer_name: string;
  beneficiary_name: string;
  justification?: string | null;
}

export interface ValidateAccountingEntryPayload {
  decision: "approve" | "reject";
  validator_name: string;
}

// ============================================
// CONSOLIDATION AUTOMATIQUE (flux des autres modules)
// ============================================
export interface ConsolidationMovement {
  id: string;
  source: AccountingEntrySource;
  label: string;
  account_type: TreasuryAccountType;
  entry_type: AccountingEntryType;
  amount: number;
  payer_name: string;
  beneficiary_name: string;
  date: Date | null;
  consolidated: boolean;
}

// ============================================
// RAPPROCHEMENT BANCAIRE + BUDGET PRÉVISIONNEL
// ============================================
export interface ReconciliationLine {
  id: string;
  account_type: TreasuryAccountType;
  label: string;
  amount: number;
  date: Date | null;
  matched_entry_id: string | null;
}

export interface BudgetLine {
  source: AccountingEntrySource;
  planned_income: number;
  planned_expense: number;
}
