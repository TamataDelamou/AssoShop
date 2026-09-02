import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AccountingBundle,
  AccountingEntry,
  BudgetLine,
  ConsolidationMovement,
  ReconciliationLine,
  TreasuryAccount,
  TreasuryAccountType,
} from "@/types/modules/accounting";
import { TreasuryTransaction } from "@/types/modules/community";
import { ACCOUNTING_CONFIG } from "@/utils/constants";

// ============================================
// TYPES LIGNES (sorties SQL)
// ============================================
interface EntryRow {
  id: string;
  organization_id: string;
  source: string;
  account_type: string;
  entry_type: string;
  label: string;
  amount: number | string;
  payer_name: string;
  beneficiary_name: string;
  justification: string | null;
  status: string;
  requires_double_validation: boolean;
  validated_by: string | null;
  second_validated_by: string | null;
  created_at: string | null;
  validated_at: string | null;
}

interface MovementRow {
  id: string;
  source: string;
  label: string;
  account_type: string;
  entry_type: string;
  amount: number | string;
  payer_name: string;
  beneficiary_name: string;
  date: string | null;
  consolidated: boolean;
}

interface LineRow {
  id: string;
  account_type: string;
  label: string;
  amount: number | string;
  date: string | null;
  matched_entry_id: string | null;
}

interface BudgetRow {
  source: string;
  planned_income: number | string;
  planned_expense: number | string;
}

interface TransactionRow {
  id: string;
  organization_id: string;
  type: string;
  label: string;
  amount: number | string;
  account: string;
  date: string | null;
  reference: string;
  created_at: string | null;
}

// ============================================
// SÉRIALISATION
// ============================================
export function serializeEntry(row: EntryRow): AccountingEntry {
  return {
    id: row.id,
    organization_id: row.organization_id,
    source: row.source as AccountingEntry["source"],
    account_type: row.account_type as AccountingEntry["account_type"],
    entry_type: row.entry_type as AccountingEntry["entry_type"],
    label: row.label,
    amount: Number(row.amount),
    payer_name: row.payer_name,
    beneficiary_name: row.beneficiary_name,
    justification: row.justification ?? null,
    status: row.status as AccountingEntry["status"],
    requires_double_validation: row.requires_double_validation,
    validated_by: row.validated_by ?? null,
    second_validated_by: row.second_validated_by ?? null,
    created_at: row.created_at ? new Date(row.created_at) : null,
    validated_at: row.validated_at ? new Date(row.validated_at) : null,
  };
}

function serializeMovement(row: MovementRow): ConsolidationMovement {
  return {
    id: row.id,
    source: row.source as ConsolidationMovement["source"],
    label: row.label,
    account_type: row.account_type as ConsolidationMovement["account_type"],
    entry_type: row.entry_type as ConsolidationMovement["entry_type"],
    amount: Number(row.amount),
    payer_name: row.payer_name,
    beneficiary_name: row.beneficiary_name,
    date: row.date ? new Date(row.date) : null,
    consolidated: row.consolidated,
  };
}

function serializeLine(row: LineRow): ReconciliationLine {
  return {
    id: row.id,
    account_type: row.account_type as ReconciliationLine["account_type"],
    label: row.label,
    amount: Number(row.amount),
    date: row.date ? new Date(row.date) : null,
    matched_entry_id: row.matched_entry_id ?? null,
  };
}

function serializeBudget(row: BudgetRow): BudgetLine {
  return {
    source: row.source as BudgetLine["source"],
    planned_income: Number(row.planned_income),
    planned_expense: Number(row.planned_expense),
  };
}

export function serializeTransaction(row: TransactionRow): TreasuryTransaction {
  return {
    id: row.id,
    organization_id: row.organization_id,
    type: row.type as TreasuryTransaction["type"],
    label: row.label,
    amount: Number(row.amount),
    account: row.account as TreasuryTransaction["account"],
    date: row.date ? new Date(row.date) : null,
    reference: row.reference ?? "",
    created_at: row.created_at ? new Date(row.created_at) : null,
  };
}

// ============================================
// COLONNES DE SÉLECTION
// ============================================
const ENTRY_COLUMNS = [
  "id",
  "organization_id",
  "source",
  "account_type",
  "entry_type",
  "label",
  "amount",
  "payer_name",
  "beneficiary_name",
  "justification",
  "status",
  "requires_double_validation",
  "validated_by",
  "second_validated_by",
  "created_at",
  "validated_at",
].join(", ");

const MOVEMENT_COLUMNS = [
  "id",
  "source",
  "label",
  "account_type",
  "entry_type",
  "amount",
  "payer_name",
  "beneficiary_name",
  "date",
  "consolidated",
].join(", ");

const LINE_COLUMNS = [
  "id",
  "account_type",
  "label",
  "amount",
  "date",
  "matched_entry_id",
].join(", ");

const BUDGET_COLUMNS = [
  "source",
  "planned_income",
  "planned_expense",
].join(", ");

const TRANSACTION_COLUMNS = [
  "id",
  "organization_id",
  "type",
  "label",
  "amount",
  "account",
  "date",
  "reference",
  "created_at",
].join(", ");

const ACCOUNT_TYPES: TreasuryAccountType[] = [
  TreasuryAccountType.CASH,
  TreasuryAccountType.BANK,
  TreasuryAccountType.MOBILE_MONEY,
];

// ============================================
// COMPTABILITÉ
// ============================================
async function fetchEntry(
  supabase: SupabaseClient,
  entryId: string,
): Promise<AccountingEntry | null> {
  const { data, error } = await supabase
    .from("accounting_entries")
    .select(ENTRY_COLUMNS)
    .eq("id", entryId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? serializeEntry(data as unknown as EntryRow) : null;
}

export async function getAccounting(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<AccountingBundle> {
  const { data, error } = await supabase
    .from("accounting_entries")
    .select(ENTRY_COLUMNS)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const entries = (data as unknown as EntryRow[]).map(serializeEntry);

  const accounts: TreasuryAccount[] = ACCOUNT_TYPES.map((type) => {
    const ofType = entries.filter((e) => e.account_type === type);
    const confirmed = ofType.filter((e) => e.status === "confirmed");
    const pending = ofType.filter((e) => e.status === "pending");

    const balance = confirmed.reduce(
      (sum, e) => sum + (e.entry_type === "income" ? e.amount : -e.amount),
      0,
    );
    const pendingIn = pending
      .filter((e) => e.entry_type === "income")
      .reduce((sum, e) => sum + e.amount, 0);
    const pendingOut = pending
      .filter((e) => e.entry_type === "expense")
      .reduce((sum, e) => sum + e.amount, 0);

    return { type, balance, pending_in: pendingIn, pending_out: pendingOut };
  });

  return { accounts, entries };
}

export async function createEntry(
  supabase: SupabaseClient,
  organizationId: string,
  payload: {
    account_type: string;
    entry_type: string;
    label: string;
    amount: number;
    payer_name: string;
    beneficiary_name: string;
    justification?: string | null;
  },
): Promise<AccountingEntry> {
  const threshold = ACCOUNTING_CONFIG.DOUBLE_VALIDATION_THRESHOLD;
  const isCash = payload.account_type === TreasuryAccountType.CASH;
  const isLargeExpense =
    payload.entry_type === "expense" && payload.amount > threshold;
  const status = isCash || isLargeExpense ? "pending" : "confirmed";

  const { data, error } = await supabase
    .from("accounting_entries")
    .insert({
      organization_id: organizationId,
      source: "manual",
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
      validated_at: status === "confirmed" ? new Date().toISOString() : null,
    })
    .select(ENTRY_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return serializeEntry(data as unknown as EntryRow);
}

export async function validateEntry(
  supabase: SupabaseClient,
  entryId: string,
  payload: { decision: "approve" | "reject"; validator_name: string },
): Promise<AccountingEntry | null> {
  const { data: entry, error } = await supabase
    .from("accounting_entries")
    .select("*")
    .eq("id", entryId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!entry) return null;

  const now = new Date().toISOString();
  let patch: Record<string, unknown>;

  if (payload.decision === "reject") {
    patch = {
      status: "rejected",
      validated_by: entry.validated_by ?? payload.validator_name,
      validated_at: now,
    };
  } else if (entry.requires_double_validation && !entry.validated_by) {
    patch = { validated_by: payload.validator_name };
  } else if (entry.requires_double_validation) {
    patch = {
      second_validated_by: payload.validator_name,
      status: "confirmed",
      validated_at: now,
    };
  } else {
    patch = {
      validated_by: payload.validator_name,
      status: "confirmed",
      validated_at: now,
    };
  }

  const { error: updateError } = await supabase
    .from("accounting_entries")
    .update(patch)
    .eq("id", entryId);
  if (updateError) throw new Error(updateError.message);

  return fetchEntry(supabase, entryId);
}

export async function getConsolidation(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<ConsolidationMovement[]> {
  const { data, error } = await supabase
    .from("consolidation_movements")
    .select(MOVEMENT_COLUMNS)
    .eq("organization_id", organizationId)
    .order("date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as unknown as MovementRow[]).map(serializeMovement);
}

export async function consolidate(
  supabase: SupabaseClient,
  organizationId: string,
  movementIds: string[],
): Promise<AccountingEntry[]> {
  const created: AccountingEntry[] = [];

  for (const movementId of movementIds) {
    const { data: movement, error } = await supabase
      .from("consolidation_movements")
      .select("*")
      .eq("id", movementId)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!movement || movement.consolidated) continue;

    const { error: markError } = await supabase
      .from("consolidation_movements")
      .update({ consolidated: true })
      .eq("id", movementId);
    if (markError) throw new Error(markError.message);

    const { data: entry, error: insertError } = await supabase
      .from("accounting_entries")
      .insert({
        organization_id: organizationId,
        source: movement.source,
        account_type: movement.account_type,
        entry_type: movement.entry_type,
        label: movement.label,
        amount: movement.amount,
        payer_name: movement.payer_name,
        beneficiary_name: movement.beneficiary_name,
        justification: null,
        status: "confirmed",
        requires_double_validation: false,
        validated_by: null,
        second_validated_by: null,
        created_at: movement.date,
        validated_at: movement.date,
      })
      .select(ENTRY_COLUMNS)
      .single();
    if (insertError) throw new Error(insertError.message);

    created.push(serializeEntry(entry as unknown as EntryRow));
  }

  return created;
}

export async function getReconciliation(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<ReconciliationLine[]> {
  const { data, error } = await supabase
    .from("reconciliation_lines")
    .select(LINE_COLUMNS)
    .eq("organization_id", organizationId)
    .order("date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as unknown as LineRow[]).map(serializeLine);
}

export async function reconcileLine(
  supabase: SupabaseClient,
  lineId: string,
  entryId: string | null,
): Promise<ReconciliationLine | null> {
  const { data, error } = await supabase
    .from("reconciliation_lines")
    .update({ matched_entry_id: entryId ?? null })
    .eq("id", lineId)
    .select(LINE_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? serializeLine(data as unknown as LineRow) : null;
}

export async function getBudget(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<BudgetLine[]> {
  const { data, error } = await supabase
    .from("budget_lines")
    .select(BUDGET_COLUMNS)
    .eq("organization_id", organizationId)
    .order("source", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as unknown as BudgetRow[]).map(serializeBudget);
}

// ============================================
// TRÉSORERIE
// ============================================
export async function listTransactions(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<TreasuryTransaction[]> {
  const { data, error } = await supabase
    .from("treasury_transactions")
    .select(TRANSACTION_COLUMNS)
    .eq("organization_id", organizationId)
    .order("date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as unknown as TransactionRow[]).map(serializeTransaction);
}

export async function createTransaction(
  supabase: SupabaseClient,
  organizationId: string,
  payload: {
    type: string;
    label: string;
    amount: number;
    account: string;
    date?: string | null;
    reference?: string;
  },
): Promise<TreasuryTransaction> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("treasury_transactions")
    .insert({
      organization_id: organizationId,
      type: payload.type,
      label: payload.label,
      amount: payload.amount,
      account: payload.account,
      date: payload.date ? new Date(payload.date).toISOString() : now,
      reference: payload.reference ?? "",
    })
    .select(TRANSACTION_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return serializeTransaction(data as unknown as TransactionRow);
}
