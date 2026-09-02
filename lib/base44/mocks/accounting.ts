import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  AccountingEntry,
  AccountingEntrySource,
  AccountingEntryStatus,
  AccountingEntryType,
  BudgetLine,
  ConsolidationMovement,
  CreateAccountingEntryPayload,
  ReconciliationLine,
  TreasuryAccount,
  TreasuryAccountType,
  ValidateAccountingEntryPayload,
} from "@/types/modules/accounting";
import { ACCOUNTING_CONFIG } from "@/utils/constants";

// Représentation sérialisable (dates en chaînes ISO) renvoyée par le mock.
type EntryDTO = Omit<AccountingEntry, "created_at" | "validated_at"> & {
  created_at: string | null;
  validated_at: string | null;
};

type MovementDTO = Omit<ConsolidationMovement, "date"> & {
  date: string | null;
};

type StatementDTO = Omit<ReconciliationLine, "date"> & {
  date: string | null;
};

const THRESHOLD = ACCOUNTING_CONFIG.DOUBLE_VALIDATION_THRESHOLD;

const store: EntryDTO[] = [
  {
    id: "acc-1",
    organization_id: "org-1",
    source: AccountingEntrySource.MANUAL,
    account_type: TreasuryAccountType.CASH,
    entry_type: AccountingEntryType.INCOME,
    label: "Cotisations en espèces — janvier",
    amount: 250000,
    payer_name: "Aminata Bah",
    beneficiary_name: "Caisse de l'association",
    justification: "Reçu n°0012",
    status: AccountingEntryStatus.CONFIRMED,
    requires_double_validation: false,
    validated_by: "Trésorier",
    second_validated_by: null,
    created_at: "2026-01-15T00:00:00.000Z",
    validated_at: "2026-01-15T00:00:00.000Z",
  },
  {
    id: "acc-2",
    organization_id: "org-1",
    source: AccountingEntrySource.MANUAL,
    account_type: TreasuryAccountType.CASH,
    entry_type: AccountingEntryType.EXPENSE,
    label: "Achat équipement agricole",
    amount: 6500000,
    payer_name: "Caisse de l'association",
    beneficiary_name: "Fournisseur AgriPlus",
    justification: "Facture n°2026-118",
    status: AccountingEntryStatus.PENDING,
    requires_double_validation: true,
    validated_by: null,
    second_validated_by: null,
    created_at: "2026-02-12T00:00:00.000Z",
    validated_at: null,
  },
  {
    id: "acc-3",
    organization_id: "org-1",
    source: AccountingEntrySource.MANUAL,
    account_type: TreasuryAccountType.CASH,
    entry_type: AccountingEntryType.INCOME,
    label: "Dons en espèces",
    amount: 120000,
    payer_name: "Mécène anonyme",
    beneficiary_name: "Caisse de l'association",
    justification: null,
    status: AccountingEntryStatus.PENDING,
    requires_double_validation: false,
    validated_by: null,
    second_validated_by: null,
    created_at: "2026-02-20T00:00:00.000Z",
    validated_at: null,
  },
  {
    id: "acc-4",
    organization_id: "org-1",
    source: AccountingEntrySource.MANUAL,
    account_type: TreasuryAccountType.BANK,
    entry_type: AccountingEntryType.INCOME,
    label: "Subvention ONG partenaire",
    amount: 2000000,
    payer_name: "ONG Horizon",
    beneficiary_name: "Compte bancaire de l'association",
    justification: "Ordre de virement",
    status: AccountingEntryStatus.CONFIRMED,
    requires_double_validation: false,
    validated_by: null,
    second_validated_by: null,
    created_at: "2026-01-28T00:00:00.000Z",
    validated_at: "2026-01-28T00:00:00.000Z",
  },
  {
    id: "acc-5",
    organization_id: "org-1",
    source: AccountingEntrySource.MANUAL,
    account_type: TreasuryAccountType.BANK,
    entry_type: AccountingEntryType.EXPENSE,
    label: "Loyer du siège — février",
    amount: 500000,
    payer_name: "Compte bancaire de l'association",
    beneficiary_name: "Propriétaire du local",
    justification: "Quittance de loyer",
    status: AccountingEntryStatus.CONFIRMED,
    requires_double_validation: false,
    validated_by: null,
    second_validated_by: null,
    created_at: "2026-02-02T00:00:00.000Z",
    validated_at: "2026-02-02T00:00:00.000Z",
  },
  {
    id: "acc-6",
    organization_id: "org-1",
    source: AccountingEntrySource.MANUAL,
    account_type: TreasuryAccountType.MOBILE_MONEY,
    entry_type: AccountingEntryType.INCOME,
    label: "Cotisations en ligne — février",
    amount: 300000,
    payer_name: "Mamadou Sow",
    beneficiary_name: "Compte Mobile Money de l'association",
    justification: "Réf. MM-88421",
    status: AccountingEntryStatus.CONFIRMED,
    requires_double_validation: false,
    validated_by: null,
    second_validated_by: null,
    created_at: "2026-02-08T00:00:00.000Z",
    validated_at: "2026-02-08T00:00:00.000Z",
  },
  {
    id: "acc-7",
    organization_id: "org-1",
    source: AccountingEntrySource.MANUAL,
    account_type: TreasuryAccountType.MOBILE_MONEY,
    entry_type: AccountingEntryType.EXPENSE,
    label: "Facture internet",
    amount: 80000,
    payer_name: "Compte Mobile Money de l'association",
    beneficiary_name: "Fournisseur d'accès",
    justification: "Facture février",
    status: AccountingEntryStatus.CONFIRMED,
    requires_double_validation: false,
    validated_by: null,
    second_validated_by: null,
    created_at: "2026-02-05T00:00:00.000Z",
    validated_at: "2026-02-05T00:00:00.000Z",
  },
  {
    id: "acc-8",
    organization_id: "org-1",
    source: AccountingEntrySource.MANUAL,
    account_type: TreasuryAccountType.BANK,
    entry_type: AccountingEntryType.INCOME,
    label: "Virement entrant — donateur",
    amount: 150000,
    payer_name: "Donateur particulier",
    beneficiary_name: "Compte bancaire de l'association",
    justification: "Ordre de virement",
    status: AccountingEntryStatus.CONFIRMED,
    requires_double_validation: false,
    validated_by: null,
    second_validated_by: null,
    created_at: "2026-03-05T00:00:00.000Z",
    validated_at: "2026-03-05T00:00:00.000Z",
  },
];

// Flux validés dans les autres modules, en attente de consolidation.
const movements: MovementDTO[] = [
  {
    id: "mov-1",
    source: AccountingEntrySource.CONTRIBUTION,
    label: "Cotisations en ligne — mars",
    account_type: TreasuryAccountType.MOBILE_MONEY,
    entry_type: AccountingEntryType.INCOME,
    amount: 450000,
    payer_name: "Membres cotisants",
    beneficiary_name: "Compte Mobile Money de l'association",
    date: "2026-03-05T00:00:00.000Z",
    consolidated: false,
  },
  {
    id: "mov-2",
    source: AccountingEntrySource.CONTRIBUTION,
    label: "Cotisations en espèces — mars",
    account_type: TreasuryAccountType.CASH,
    entry_type: AccountingEntryType.INCOME,
    amount: 200000,
    payer_name: "Membres cotisants",
    beneficiary_name: "Caisse de l'association",
    date: "2026-03-06T00:00:00.000Z",
    consolidated: false,
  },
  {
    id: "mov-3",
    source: AccountingEntrySource.SOCIAL_CASE,
    label: "Décaissement aide — soutien médical",
    account_type: TreasuryAccountType.BANK,
    entry_type: AccountingEntryType.EXPENSE,
    amount: 300000,
    payer_name: "Compte bancaire de l'association",
    beneficiary_name: "Bénéficiaire du cas social",
    date: "2026-03-08T00:00:00.000Z",
    consolidated: false,
  },
  {
    id: "mov-4",
    source: AccountingEntrySource.TONTINE,
    label: "Versements tontine — collecte de mars",
    account_type: TreasuryAccountType.CASH,
    entry_type: AccountingEntryType.INCOME,
    amount: 200000,
    payer_name: "Membres du groupe",
    beneficiary_name: "Caisse de l'association",
    date: "2026-03-10T00:00:00.000Z",
    consolidated: false,
  },
  {
    id: "mov-5",
    source: AccountingEntrySource.LOAN,
    label: "Décaissement prêt interne",
    account_type: TreasuryAccountType.CASH,
    entry_type: AccountingEntryType.EXPENSE,
    amount: 150000,
    payer_name: "Caisse de l'association",
    beneficiary_name: "Emprunteur",
    date: "2026-03-12T00:00:00.000Z",
    consolidated: false,
  },
  {
    id: "mov-6",
    source: AccountingEntrySource.LOAN,
    label: "Remboursement prêt — échéance 1",
    account_type: TreasuryAccountType.CASH,
    entry_type: AccountingEntryType.INCOME,
    amount: 50000,
    payer_name: "Emprunteur",
    beneficiary_name: "Caisse de l'association",
    date: "2026-03-15T00:00:00.000Z",
    consolidated: false,
  },
  {
    id: "mov-7",
    source: AccountingEntrySource.SOLIDARITY,
    label: "Indemnisation sinistre — inondation",
    account_type: TreasuryAccountType.BANK,
    entry_type: AccountingEntryType.EXPENSE,
    amount: 150000,
    payer_name: "Fonds de Garantie Solidaire",
    beneficiary_name: "Membre indemnisé",
    date: "2026-03-16T00:00:00.000Z",
    consolidated: false,
  },
];

// Relevé bancaire (lignes à rapprocher des écritures du journal).
const statements: StatementDTO[] = [
  {
    id: "stmt-1",
    account_type: TreasuryAccountType.BANK,
    label: "Virement ONG Horizon",
    amount: 2000000,
    date: "2026-01-28T00:00:00.000Z",
    matched_entry_id: "acc-4",
  },
  {
    id: "stmt-2",
    account_type: TreasuryAccountType.BANK,
    label: "Prélèvement loyer du siège",
    amount: 500000,
    date: "2026-02-02T00:00:00.000Z",
    matched_entry_id: "acc-5",
  },
  {
    id: "stmt-3",
    account_type: TreasuryAccountType.BANK,
    label: "Virement entrant — donateur",
    amount: 150000,
    date: "2026-03-05T00:00:00.000Z",
    matched_entry_id: null,
  },
];

// Budget prévisionnel par origine.
const budget: BudgetLine[] = [
  {
    source: AccountingEntrySource.MANUAL,
    planned_income: 2500000,
    planned_expense: 1500000,
  },
  {
    source: AccountingEntrySource.CONTRIBUTION,
    planned_income: 800000,
    planned_expense: 0,
  },
  {
    source: AccountingEntrySource.SOCIAL_CASE,
    planned_income: 0,
    planned_expense: 400000,
  },
  {
    source: AccountingEntrySource.TONTINE,
    planned_income: 300000,
    planned_expense: 0,
  },
  {
    source: AccountingEntrySource.LOAN,
    planned_income: 200000,
    planned_expense: 300000,
  },
  {
    source: AccountingEntrySource.SOLIDARITY,
    planned_income: 100000,
    planned_expense: 200000,
  },
];

const BUNDLE_URL = /^\/organizations\/[^/]+\/accounting$/;
const ENTRIES_URL = /^\/organizations\/[^/]+\/accounting\/entries$/;
const VALIDATE_URL =
  /^\/organizations\/[^/]+\/accounting\/entries\/([^/]+)\/validation$/;
const CONSOLIDATION_URL =
  /^\/organizations\/[^/]+\/accounting\/consolidation$/;
const RECONCILIATION_URL =
  /^\/organizations\/[^/]+\/accounting\/reconciliation$/;
const BUDGET_URL = /^\/organizations\/[^/]+\/accounting\/budget$/;

const ACCOUNT_TYPES = [
  TreasuryAccountType.CASH,
  TreasuryAccountType.BANK,
  TreasuryAccountType.MOBILE_MONEY,
];

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

function signedAmount(entries: EntryDTO[]): number {
  return entries.reduce((sum, e) => {
    const sign = e.entry_type === AccountingEntryType.INCOME ? 1 : -1;
    return sum + sign * e.amount;
  }, 0);
}

function computeAccounts(): TreasuryAccount[] {
  return ACCOUNT_TYPES.map((type) => {
    const accountEntries = store.filter((e) => e.account_type === type);
    const confirmed = accountEntries.filter(
      (e) => e.status === AccountingEntryStatus.CONFIRMED,
    );
    const pending = accountEntries.filter(
      (e) => e.status === AccountingEntryStatus.PENDING,
    );
    const pendingIn = pending
      .filter((e) => e.entry_type === AccountingEntryType.INCOME)
      .reduce((sum, e) => sum + e.amount, 0);
    const pendingOut = pending
      .filter((e) => e.entry_type === AccountingEntryType.EXPENSE)
      .reduce((sum, e) => sum + e.amount, 0);
    return {
      type,
      balance: signedAmount(confirmed),
      pending_in: pendingIn,
      pending_out: pendingOut,
    };
  });
}

interface BundleDTO {
  accounts: TreasuryAccount[];
  entries: EntryDTO[];
}

function getBundle(): BundleDTO {
  return {
    accounts: computeAccounts(),
    entries: clone(store),
  };
}

function createEntry(config: InternalAxiosRequestConfig): EntryDTO {
  const payload = (config.data ?? {}) as CreateAccountingEntryPayload;
  const isCash = payload.account_type === TreasuryAccountType.CASH;
  const isLargeExpense =
    payload.entry_type === AccountingEntryType.EXPENSE &&
    payload.amount > THRESHOLD;
  const status =
    isCash || isLargeExpense
      ? AccountingEntryStatus.PENDING
      : AccountingEntryStatus.CONFIRMED;

  const record: EntryDTO = {
    id: `acc-${Date.now()}`,
    organization_id: "org-1",
    source: AccountingEntrySource.MANUAL,
    account_type: payload.account_type,
    entry_type: payload.entry_type,
    label: payload.label,
    amount: payload.amount,
    payer_name: payload.payer_name,
    beneficiary_name: payload.beneficiary_name,
    justification: payload.justification ?? null,
    status,
    requires_double_validation: isLargeExpense,
    validated_by: null,
    second_validated_by: null,
    created_at: new Date().toISOString(),
    validated_at:
      status === AccountingEntryStatus.CONFIRMED
        ? new Date().toISOString()
        : null,
  };

  store.unshift(record);
  return clone(record);
}

function validateEntry(config: InternalAxiosRequestConfig): EntryDTO | null {
  const match = config.url?.match(VALIDATE_URL);
  if (!match) return null;

  const entry = store.find((e) => e.id === match[1]);
  if (!entry) return null;

  const payload = (config.data ?? {}) as ValidateAccountingEntryPayload;
  if (payload.decision === "reject") {
    entry.status = AccountingEntryStatus.REJECTED;
    entry.validated_by = entry.validated_by ?? payload.validator_name;
    entry.validated_at = new Date().toISOString();
    return clone(entry);
  }

  if (entry.requires_double_validation && !entry.validated_by) {
    // Première signature (trésorier) : reste en attente de la seconde.
    entry.validated_by = payload.validator_name;
    return clone(entry);
  }

  if (entry.requires_double_validation) {
    entry.second_validated_by = payload.validator_name;
  } else {
    entry.validated_by = payload.validator_name;
  }
  entry.status = AccountingEntryStatus.CONFIRMED;
  entry.validated_at = new Date().toISOString();
  return clone(entry);
}

function consolidateMovements(config: InternalAxiosRequestConfig): EntryDTO[] {
  const body = (config.data ?? {}) as { movement_ids?: string[] };
  const created: EntryDTO[] = [];

  for (const movementId of body.movement_ids ?? []) {
    const movement = movements.find((m) => m.id === movementId);
    if (!movement || movement.consolidated) continue;

    movement.consolidated = true;
    const record: EntryDTO = {
      id: `acc-${Date.now()}-${movementId}`,
      organization_id: "org-1",
      source: movement.source,
      account_type: movement.account_type,
      entry_type: movement.entry_type,
      label: movement.label,
      amount: movement.amount,
      payer_name: movement.payer_name,
      beneficiary_name: movement.beneficiary_name,
      justification: null,
      status: AccountingEntryStatus.CONFIRMED,
      requires_double_validation: false,
      validated_by: null,
      second_validated_by: null,
      created_at: movement.date,
      validated_at: movement.date,
    };
    store.unshift(record);
    created.push(clone(record));
  }

  return created;
}

function reconcileLine(config: InternalAxiosRequestConfig): StatementDTO | null {
  const body = (config.data ?? {}) as {
    line_id?: string;
    entry_id?: string;
  };
  const line = statements.find((l) => l.id === body.line_id);
  if (!line) return null;
  line.matched_entry_id = body.entry_id ?? null;
  return clone(line);
}

export function accountingMockAdapter(
  config: InternalAxiosRequestConfig,
): AxiosAdapter | null {
  const method = (config.method ?? "get").toLowerCase();
  const url = config.url ?? "";

  if (method === "get" && BUNDLE_URL.test(url)) {
    return async () => toResponse(getBundle());
  }
  if (method === "post" && ENTRIES_URL.test(url)) {
    return async (cfg) => toResponse(createEntry(cfg));
  }
  if (method === "post" && VALIDATE_URL.test(url)) {
    return async (cfg) => toResponse(validateEntry(cfg));
  }
  if (method === "get" && CONSOLIDATION_URL.test(url)) {
    return async () => toResponse(clone(movements));
  }
  if (method === "post" && CONSOLIDATION_URL.test(url)) {
    return async (cfg) => toResponse(consolidateMovements(cfg));
  }
  if (method === "get" && RECONCILIATION_URL.test(url)) {
    return async () => toResponse(clone(statements));
  }
  if (method === "post" && RECONCILIATION_URL.test(url)) {
    return async (cfg) => toResponse(reconcileLine(cfg));
  }
  if (method === "get" && BUDGET_URL.test(url)) {
    return async () => toResponse(clone(budget));
  }

  return null;
}
