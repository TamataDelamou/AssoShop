// Types du module AssoShop Pay (orchestration des paiements).

export enum WalletType {
  PERSONAL = "personal",
  ASSOCIATION = "association",
  COOPERATIVE = "cooperative",
  FAMILY = "family",
  COMPANY = "company",
}

export enum TransactionType {
  TOPUP = "topup",
  WITHDRAWAL = "withdrawal",
  TRANSFER = "transfer",
  PAYMENT = "payment",
  RECEIPT = "receipt",
  COMMISSION = "commission",
}

export enum TransactionStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  FAILED = "failed",
}

export enum ReconciliationStatus {
  MATCHED = "matched",
  UNMATCHED = "unmatched",
  FLAGGED = "flagged",
}

export interface Wallet {
  id: string;
  type: WalletType;
  label: string;
  currency: string;
  balance: number;
  last_known_balance: number;
  updated_at: Date;
}

export interface PaymentMethod {
  id: string;
  provider: string;
  phone: string;
  is_default: boolean;
  country: string;
}

export interface Transaction {
  id: string;
  wallet_id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: string;
  counterparty: string;
  description: string;
  // RG-P03 : commission de service, affichée avant validation.
  commission: number;
  // RG-P02 : identifiant de transaction unique.
  reference: string;
  module: string;
  created_at: Date;
}

export interface ReconciliationEntry {
  id: string;
  transaction_id: string;
  reference: string;
  amount: number;
  currency: string;
  operator: string;
  operator_reference: string;
  status: ReconciliationStatus;
  ai_note: string | null;
  created_at: Date;
}

export interface FinancialSituation {
  contributions: number;
  savings: number;
  tontine: number;
  aids_received: number;
  loans_outstanding: number;
  currency: string;
}

export interface PaymentSettings {
  default_provider: string;
  max_transaction_amount: number;
  alerts_enabled: boolean;
}

export interface PayBundle {
  wallets: Wallet[];
  transactions: Transaction[];
  methods: PaymentMethod[];
  reconciliation: ReconciliationEntry[];
  situation: FinancialSituation;
  settings: PaymentSettings;
}

export interface TopupPayload {
  wallet_id: string;
  provider: string;
  phone: string;
  amount: number;
}

export interface WithdrawPayload {
  wallet_id: string;
  provider: string;
  phone: string;
  amount: number;
}

export interface TransferPayload {
  from_wallet_id: string;
  to_member: string;
  amount: number;
}

export interface AddPaymentMethodPayload {
  provider: string;
  phone: string;
}
