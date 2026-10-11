import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  AddPaymentMethodPayload,
  PaymentSettings,
  ReconciliationEntry,
  ReconciliationStatus,
  Transaction,
  TransactionStatus,
  TransactionType,
  TopupPayload,
  TransferPayload,
  TransferRecipient,
  Wallet,
  WalletType,
  WithdrawPayload,
} from "@/types/modules/pay";
import { PAY_CONFIG } from "@/utils/constants";

type WalletDTO = Omit<Wallet, "updated_at"> & {
  updated_at: string;
};

type TransactionDTO = Omit<Transaction, "created_at"> & {
  created_at: string;
};

type ReconciliationDTO = Omit<ReconciliationEntry, "created_at"> & {
  created_at: string;
};

const BUNDLE_URL = /^\/pay\/bundle$/;
const TOPUP_URL = /^\/pay\/topup$/;
const WITHDRAW_URL = /^\/pay\/withdraw$/;
const TRANSFER_URL = /^\/pay\/transfer$/;
const RECIPIENTS_URL = /^\/pay\/recipients$/;

// Membres des organisations de l'utilisateur de démo (cf. mock des membres).
const recipients: TransferRecipient[] = [
  { member_id: "m-2", user_id: "u-2", name: "Mamadou Bah", organization_id: "org-1", organization_name: "Association de démonstration" },
  { member_id: "m-3", user_id: "u-3", name: "Fatoumata Camara", organization_id: "org-1", organization_name: "Association de démonstration" },
];
const METHODS_URL = /^\/pay\/methods$/;
const MATCH_URL = /^\/pay\/reconciliation\/([^/]+)\/match$/;
const SETTINGS_URL = /^\/pay\/settings$/;

let refCounter = 200;

function now(): string {
  return new Date().toISOString();
}

function nextRef(): string {
  refCounter += 1;
  return `PAY-2026-${String(refCounter).padStart(4, "0")}`;
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

const wallets: WalletDTO[] = [
  {
    id: "w-1",
    type: WalletType.PERSONAL,
    label: "Portefeuille personnel",
    currency: "GNF",
    balance: 5200000,
    last_known_balance: 5200000,
    updated_at: "2026-08-30T10:00:00.000Z",
  },
  {
    id: "w-2",
    type: WalletType.ASSOCIATION,
    label: "Association GSG Conakry",
    currency: "GNF",
    balance: 12800000,
    last_known_balance: 12800000,
    updated_at: "2026-08-30T10:00:00.000Z",
  },
  {
    id: "w-3",
    type: WalletType.COOPERATIVE,
    label: "Coopérative agricole de Kindia",
    currency: "XOF",
    balance: 2450000,
    last_known_balance: 2450000,
    updated_at: "2026-08-30T09:30:00.000Z",
  },
  {
    id: "w-4",
    type: WalletType.FAMILY,
    label: "Caisse familiale Diallo",
    currency: "GNF",
    balance: 980000,
    last_known_balance: 980000,
    updated_at: "2026-08-29T18:00:00.000Z",
  },
];

const transactions: TransactionDTO[] = [
  {
    id: "t-1",
    wallet_id: "w-1",
    type: TransactionType.RECEIPT,
    status: TransactionStatus.CONFIRMED,
    amount: 250000,
    currency: "GNF",
    counterparty: "Cotisation mensuelle",
    description: "Encaissement cotisation",
    commission: 0,
    reference: "PAY-2026-0001",
    module: "community",
    created_at: "2026-08-29T09:00:00.000Z",
  },
  {
    id: "t-2",
    wallet_id: "w-1",
    type: TransactionType.PAYMENT,
    status: TransactionStatus.CONFIRMED,
    amount: 360000,
    currency: "GNF",
    counterparty: "Mode & Style",
    description: "Commande marketplace",
    commission: 1800,
    reference: "PAY-2026-0002",
    module: "market",
    created_at: "2026-08-28T14:00:00.000Z",
  },
  {
    id: "t-3",
    wallet_id: "w-1",
    type: TransactionType.TOPUP,
    status: TransactionStatus.CONFIRMED,
    amount: 1000000,
    currency: "GNF",
    counterparty: "Orange Money",
    description: "Recharge du portefeuille",
    commission: 5000,
    reference: "PAY-2026-0003",
    module: "pay",
    created_at: "2026-08-27T11:00:00.000Z",
  },
  {
    id: "t-4",
    wallet_id: "w-1",
    type: TransactionType.TRANSFER,
    status: TransactionStatus.CONFIRMED,
    amount: 150000,
    currency: "GNF",
    counterparty: "Mamadou Sow",
    description: "Transfert entre membres",
    commission: 0,
    reference: "PAY-2026-0004",
    module: "pay",
    created_at: "2026-08-26T16:00:00.000Z",
  },
  {
    id: "t-5",
    wallet_id: "w-1",
    type: TransactionType.WITHDRAWAL,
    status: TransactionStatus.CONFIRMED,
    amount: 500000,
    currency: "GNF",
    counterparty: "Orange Money",
    description: "Retrait vers Mobile Money",
    commission: 2500,
    reference: "PAY-2026-0005",
    module: "pay",
    created_at: "2026-08-25T10:00:00.000Z",
  },
  {
    id: "t-6",
    wallet_id: "w-1",
    type: TransactionType.RECEIPT,
    status: TransactionStatus.CONFIRMED,
    amount: 200000,
    currency: "GNF",
    counterparty: "Aide communautaire",
    description: "Aide reçue",
    commission: 0,
    reference: "PAY-2026-0006",
    module: "community",
    created_at: "2026-08-24T09:00:00.000Z",
  },
  {
    id: "t-7",
    wallet_id: "w-1",
    type: TransactionType.PAYMENT,
    status: TransactionStatus.CONFIRMED,
    amount: 100000,
    currency: "GNF",
    counterparty: "Échéance de prêt",
    description: "Remboursement de prêt",
    commission: 0,
    reference: "PAY-2026-0007",
    module: "finance",
    created_at: "2026-08-23T08:00:00.000Z",
  },
  {
    id: "t-8",
    wallet_id: "w-3",
    type: TransactionType.TOPUP,
    status: TransactionStatus.CONFIRMED,
    amount: 500000,
    currency: "XOF",
    counterparty: "Wave",
    description: "Recharge coopérative",
    commission: 2500,
    reference: "PAY-2026-0008",
    module: "pay",
    created_at: "2026-08-22T12:00:00.000Z",
  },
  {
    id: "t-9",
    wallet_id: "w-1",
    type: TransactionType.COMMISSION,
    status: TransactionStatus.CONFIRMED,
    amount: 1800,
    currency: "GNF",
    counterparty: "AssoShop Pay",
    description: "Commission de service",
    commission: 0,
    reference: "PAY-2026-0009",
    module: "pay",
    created_at: "2026-08-21T15:00:00.000Z",
  },
  {
    id: "t-10",
    wallet_id: "w-1",
    type: TransactionType.PAYMENT,
    status: TransactionStatus.CONFIRMED,
    amount: 500000,
    currency: "GNF",
    counterparty: "Verger de manguiers",
    description: "Investissement communautaire",
    commission: 0,
    reference: "PAY-2026-0010",
    module: "market",
    created_at: "2026-08-20T10:00:00.000Z",
  },
  {
    id: "t-11",
    wallet_id: "w-1",
    type: TransactionType.TRANSFER,
    status: TransactionStatus.CONFIRMED,
    amount: 120000,
    currency: "GNF",
    counterparty: "Aïssatou Barry",
    description: "Transfert reçu",
    commission: 0,
    reference: "PAY-2026-0011",
    module: "pay",
    created_at: "2026-08-19T13:00:00.000Z",
  },
  {
    id: "t-12",
    wallet_id: "w-1",
    type: TransactionType.TOPUP,
    status: TransactionStatus.PENDING,
    amount: 250000,
    currency: "GNF",
    counterparty: "MTN Mobile Money",
    description: "Recharge en attente",
    commission: 1250,
    reference: "PAY-2026-0012",
    module: "pay",
    created_at: "2026-08-30T08:00:00.000Z",
  },
];

const methods = [
  {
    id: "m-1",
    provider: "Orange Money",
    phone: "+224 620 00 00 01",
    is_default: true,
    country: "Guinée",
  },
  {
    id: "m-2",
    provider: "MTN Mobile Money",
    phone: "+224 660 00 00 02",
    is_default: false,
    country: "Guinée",
  },
  {
    id: "m-3",
    provider: "Wave",
    phone: "+221 770 00 00 03",
    is_default: false,
    country: "Sénégal",
  },
];

const reconciliation: ReconciliationDTO[] = [
  {
    id: "r-1",
    transaction_id: "t-3",
    reference: "PAY-2026-0003",
    amount: 1000000,
    currency: "GNF",
    operator: "Orange Money",
    operator_reference: "OM-GN-88421",
    status: ReconciliationStatus.MATCHED,
    ai_note: null,
    created_at: "2026-08-27T11:05:00.000Z",
  },
  {
    id: "r-2",
    transaction_id: "t-5",
    reference: "PAY-2026-0005",
    amount: 500000,
    currency: "GNF",
    operator: "Orange Money",
    operator_reference: "OM-GN-88440",
    status: ReconciliationStatus.MATCHED,
    ai_note: null,
    created_at: "2026-08-25T10:05:00.000Z",
  },
  {
    id: "r-3",
    transaction_id: "t-12",
    reference: "PAY-2026-0012",
    amount: 250000,
    currency: "GNF",
    operator: "MTN Mobile Money",
    operator_reference: "",
    status: ReconciliationStatus.FLAGGED,
    ai_note:
      "Écart inhabituel : montant en attente sans référence opérateur correspondante.",
    created_at: "2026-08-30T08:05:00.000Z",
  },
  {
    id: "r-4",
    transaction_id: "t-8",
    reference: "PAY-2026-0008",
    amount: 500000,
    currency: "XOF",
    operator: "Wave",
    operator_reference: "",
    status: ReconciliationStatus.UNMATCHED,
    ai_note: null,
    created_at: "2026-08-22T12:05:00.000Z",
  },
];

const situation = {
  contributions: 2750000,
  savings: 1800000,
  tontine: 1500000,
  aids_received: 450000,
  loans_outstanding: 2000000,
  currency: "GNF",
};

let settings: PaymentSettings = {
  default_provider: "Orange Money",
  max_transaction_amount: 5000000,
  alerts_enabled: true,
};

function getBundle() {
  return {
    wallets: clone(wallets),
    transactions: clone(transactions),
    methods: clone(methods),
    reconciliation: clone(reconciliation),
    situation: clone(situation),
    settings: clone(settings),
  };
}

// RG-P03 : commission de service appliquée et toujours affichée avant validation.
function applyCommission(amount: number): number {
  return Math.round(amount * PAY_CONFIG.SERVICE_FEE_RATE);
}

function topup(config: InternalAxiosRequestConfig): TransactionDTO | null {
  const payload = (config.data ?? {}) as TopupPayload;
  if (!payload.amount || payload.amount <= 0) return null;

  const wallet = wallets.find((w) => w.id === payload.wallet_id);
  if (!wallet) return null;

  const commission = applyCommission(payload.amount);
  wallet.balance += payload.amount - commission;
  wallet.last_known_balance = wallet.balance;
  wallet.updated_at = now();

  const record: TransactionDTO = {
    id: `t-${Date.now()}`,
    wallet_id: wallet.id,
    type: TransactionType.TOPUP,
    status: TransactionStatus.CONFIRMED,
    amount: payload.amount,
    currency: wallet.currency,
    counterparty: payload.provider,
    description: "Recharge du portefeuille",
    commission,
    reference: nextRef(),
    module: "pay",
    created_at: now(),
  };

  transactions.unshift(record);
  return clone(record);
}

function withdraw(config: InternalAxiosRequestConfig): TransactionDTO | null {
  const payload = (config.data ?? {}) as WithdrawPayload;
  if (!payload.amount || payload.amount <= 0) return null;

  const wallet = wallets.find((w) => w.id === payload.wallet_id);
  if (!wallet) return null;

  const commission = applyCommission(payload.amount);
  if (wallet.balance < payload.amount + commission) return null;

  wallet.balance -= payload.amount + commission;
  wallet.last_known_balance = wallet.balance;
  wallet.updated_at = now();

  const record: TransactionDTO = {
    id: `t-${Date.now()}`,
    wallet_id: wallet.id,
    type: TransactionType.WITHDRAWAL,
    status: TransactionStatus.CONFIRMED,
    amount: payload.amount,
    currency: wallet.currency,
    counterparty: payload.provider,
    description: "Retrait vers Mobile Money",
    commission,
    reference: nextRef(),
    module: "pay",
    created_at: now(),
  };

  transactions.unshift(record);
  return clone(record);
}

// RG-P06 : pas de transfert direct entre deux portefeuilles sans opération tracée.
function transfer(config: InternalAxiosRequestConfig): TransactionDTO | null {
  const payload = (config.data ?? {}) as TransferPayload;
  if (!payload.amount || payload.amount <= 0) return null;

  // Le destinataire doit être un membre connu, jamais un libellé libre.
  const recipient = recipients.find(
    (r) => r.member_id === payload.to_member_id || r.user_id === payload.to_user_id,
  );
  if (!recipient) return null;

  const wallet = wallets.find((w) => w.id === payload.from_wallet_id);
  if (!wallet) return null;
  if (wallet.balance < payload.amount) return null;

  wallet.balance -= payload.amount;
  wallet.last_known_balance = wallet.balance;
  wallet.updated_at = now();

  const record: TransactionDTO = {
    id: `t-${Date.now()}`,
    wallet_id: wallet.id,
    type: TransactionType.TRANSFER,
    status: TransactionStatus.CONFIRMED,
    amount: payload.amount,
    currency: wallet.currency,
    counterparty: recipient.name,
    description: "Transfert entre membres",
    commission: 0,
    reference: nextRef(),
    module: "pay",
    created_at: now(),
  };

  transactions.unshift(record);
  return clone(record);
}

function addMethod(
  config: InternalAxiosRequestConfig,
): { id: string; provider: string; phone: string; is_default: boolean; country: string } | null {
  const payload = (config.data ?? {}) as AddPaymentMethodPayload;
  if (!payload.provider?.trim() || !payload.phone?.trim()) return null;

  const record = {
    id: `m-${Date.now()}`,
    provider: payload.provider,
    phone: payload.phone,
    is_default: false,
    country: "Guinée",
  };

  methods.push(record);
  return clone(record);
}

function matchEntry(config: InternalAxiosRequestConfig): ReconciliationDTO | null {
  const match = config.url?.match(MATCH_URL);
  if (!match) return null;

  const entry = reconciliation.find((e) => e.id === match[1]);
  if (!entry) return null;

  entry.status = ReconciliationStatus.MATCHED;
  entry.ai_note = null;
  return clone(entry);
}

function updateSettings(config: InternalAxiosRequestConfig): PaymentSettings {
  const payload = (config.data ?? {}) as PaymentSettings;
  settings = {
    default_provider: payload.default_provider,
    max_transaction_amount: payload.max_transaction_amount,
    alerts_enabled: payload.alerts_enabled,
  };
  return clone(settings);
}

export function payMockAdapter(
  config: InternalAxiosRequestConfig,
): AxiosAdapter | null {
  const method = (config.method ?? "get").toLowerCase();
  const url = config.url ?? "";

  if (method === "get" && BUNDLE_URL.test(url)) {
    return async () => toResponse(getBundle());
  }
  if (method === "post" && TOPUP_URL.test(url)) {
    return async (cfg) => toResponse(topup(cfg));
  }
  if (method === "post" && WITHDRAW_URL.test(url)) {
    return async (cfg) => toResponse(withdraw(cfg));
  }
  if (method === "get" && RECIPIENTS_URL.test(url)) {
    return async () => toResponse(clone(recipients));
  }
  if (method === "post" && TRANSFER_URL.test(url)) {
    return async (cfg) => toResponse(transfer(cfg));
  }
  if (method === "post" && METHODS_URL.test(url)) {
    return async (cfg) => toResponse(addMethod(cfg));
  }
  if (method === "post" && MATCH_URL.test(url)) {
    return async (cfg) => toResponse(matchEntry(cfg));
  }
  if (method === "post" && SETTINGS_URL.test(url)) {
    return async (cfg) => toResponse(updateSettings(cfg));
  }

  return null;
}
