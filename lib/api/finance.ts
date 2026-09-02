import type { SupabaseClient } from "@supabase/supabase-js";
import {
  FinancialGroup,
  GroupLoan,
  GroupSettings,
  GroupStatistics,
  GroupTransaction,
  GroupTransactionKind,
  InsuranceClaim,
  InsuranceEnrollment,
  LoanInstallment,
  SolidarityBundle,
  SponsorshipRequest,
} from "@/types/modules/finance";

// ============================================
// TYPES LIGNES (sorties SQL)
// ============================================
interface GroupMemberRow {
  id: string;
  name: string;
  role: string;
  engagement: string;
  joined_at: string | null;
  last_payment_at: string | null;
}

interface PaymentRow {
  id: string;
  member_id: string | null;
  member_name: string;
  method: string;
  amount: number | string;
  paid_for_member_name: string | null;
  status: string;
  paid_at: string | null;
}

interface TurnRow {
  id: string;
  member_id: string | null;
  member_name: string;
  position: number;
  expected_date: string | null;
  received: boolean;
  received_at: string | null;
}

interface GroupRow {
  id: string;
  organization_id: string;
  name: string;
  type: string;
  status: string;
  amount: number | string;
  periodicity: string;
  max_members: number;
  goal_amount: number | string | null;
  interest_rate: number | string | null;
  start_date: string | null;
  raised_amount: number | string;
  created_at: string | null;
  members: GroupMemberRow[] | null;
  payments: PaymentRow[] | null;
  turns: TurnRow[] | null;
}

interface SponsorshipRow {
  id: string;
  group_id: string;
  sponsor_id: string | null;
  sponsor_name: string | null;
  invitee_name: string;
  invitee_phone: string | null;
  status: string;
  created_at: string | null;
  financial_groups: { name: string } | null;
}

interface InstallmentRow {
  id: string;
  position: number;
  due_date: string | null;
  amount: number | string;
  status: string;
  paid_at: string | null;
}

interface LoanRow {
  id: string;
  group_id: string;
  member_id: string;
  member_name: string;
  sponsor_name: string | null;
  amount: number | string;
  suggested_amount: number | string;
  interest_rate: number | string;
  total_due: number | string;
  repaid_amount: number | string;
  status: string;
  requested_at: string | null;
  sponsor_confirmed_at: string | null;
  decision_at: string | null;
  financial_groups: { name: string } | null;
  installments: InstallmentRow[] | null;
}

interface SettingsRow {
  group_id: string;
  visibility: string;
  allow_join_requests: boolean;
  notify_payment_reminders: boolean;
}

// ============================================
// SÉRIALISATION
// ============================================
function serializeMember(row: GroupMemberRow) {
  return {
    id: row.id,
    name: row.name,
    role: row.role as FinancialGroup["members"][number]["role"],
    engagement:
      row.engagement as FinancialGroup["members"][number]["engagement"],
    joined_at: row.joined_at ? new Date(row.joined_at) : null,
    last_payment_at: row.last_payment_at
      ? new Date(row.last_payment_at)
      : null,
  };
}

function serializePayment(row: PaymentRow) {
  return {
    id: row.id,
    member_id: row.member_id ?? "",
    member_name: row.member_name,
    method: row.method as FinancialGroup["payments"][number]["method"],
    amount: Number(row.amount),
    paid_for_member_name: row.paid_for_member_name ?? null,
    status: row.status as FinancialGroup["payments"][number]["status"],
    paid_at: row.paid_at ? new Date(row.paid_at) : null,
  };
}

function serializeTurn(row: TurnRow) {
  return {
    id: row.id,
    member_id: row.member_id ?? "",
    member_name: row.member_name,
    position: Number(row.position),
    expected_date: row.expected_date ? new Date(row.expected_date) : null,
    received: row.received,
    received_at: row.received_at ? new Date(row.received_at) : null,
  };
}

export function serializeGroup(row: GroupRow): FinancialGroup {
  return {
    id: row.id,
    organization_id: row.organization_id,
    name: row.name,
    type: row.type as FinancialGroup["type"],
    status: row.status as FinancialGroup["status"],
    amount: Number(row.amount),
    periodicity: row.periodicity as FinancialGroup["periodicity"],
    max_members: Number(row.max_members),
    goal_amount: row.goal_amount == null ? null : Number(row.goal_amount),
    interest_rate:
      row.interest_rate == null ? null : Number(row.interest_rate),
    start_date: row.start_date ? new Date(row.start_date) : null,
    created_at: row.created_at ? new Date(row.created_at) : null,
    raised_amount: Number(row.raised_amount),
    members: (row.members ?? []).map(serializeMember),
    payments: (row.payments ?? []).map(serializePayment),
    turns: (row.turns ?? []).map(serializeTurn),
  };
}

function serializeInstallment(row: InstallmentRow): LoanInstallment {
  return {
    id: row.id,
    position: Number(row.position),
    due_date: row.due_date ? new Date(row.due_date) : null,
    amount: Number(row.amount),
    status: row.status as LoanInstallment["status"],
    paid_at: row.paid_at ? new Date(row.paid_at) : null,
  };
}

export function serializeLoan(row: LoanRow): GroupLoan {
  return {
    id: row.id,
    group_id: row.group_id,
    group_name: row.financial_groups?.name ?? "Groupe",
    member_id: row.member_id,
    member_name: row.member_name,
    sponsor_name: row.sponsor_name ?? "",
    amount: Number(row.amount),
    suggested_amount: Number(row.suggested_amount),
    interest_rate: Number(row.interest_rate),
    total_due: Number(row.total_due),
    repaid_amount: Number(row.repaid_amount),
    status: row.status as GroupLoan["status"],
    requested_at: row.requested_at ? new Date(row.requested_at) : null,
    sponsor_confirmed_at: row.sponsor_confirmed_at
      ? new Date(row.sponsor_confirmed_at)
      : null,
    decision_at: row.decision_at ? new Date(row.decision_at) : null,
    installments: (row.installments ?? []).map(serializeInstallment),
  };
}

function serializeSponsorship(
  row: SponsorshipRow,
): SponsorshipRequest {
  return {
    id: row.id,
    group_id: row.group_id,
    group_name: row.financial_groups?.name ?? "Groupe",
    sponsor_id: row.sponsor_id ?? "",
    sponsor_name: row.sponsor_name ?? "",
    invitee_name: row.invitee_name,
    invitee_phone: row.invitee_phone ?? null,
    status: row.status as SponsorshipRequest["status"],
    created_at: row.created_at ? new Date(row.created_at) : null,
  };
}

function serializeSettings(row: SettingsRow): GroupSettings {
  return {
    group_id: row.group_id,
    visibility: row.visibility as GroupSettings["visibility"],
    allow_join_requests: row.allow_join_requests,
    notify_payment_reminders: row.notify_payment_reminders,
  };
}

// ============================================
// COLONNES DE SÉLECTION
// ============================================
const GROUP_COLUMNS = [
  "id",
  "organization_id",
  "name",
  "type",
  "status",
  "amount",
  "periodicity",
  "max_members",
  "goal_amount",
  "interest_rate",
  "start_date",
  "raised_amount",
  "created_at",
  "members:group_members(id, name, role, engagement, joined_at, last_payment_at)",
  "payments:group_payments(id, member_id, member_name, method, amount, paid_for_member_name, status, paid_at)",
  "turns:group_turns(id, member_id, member_name, position, expected_date, received, received_at)",
].join(", ");

const LOAN_COLUMNS = [
  "id",
  "group_id",
  "member_id",
  "member_name",
  "sponsor_name",
  "amount",
  "suggested_amount",
  "interest_rate",
  "total_due",
  "repaid_amount",
  "status",
  "requested_at",
  "sponsor_confirmed_at",
  "decision_at",
  "financial_groups!inner(name, organization_id)",
  "installments:loan_installments(id, position, due_date, amount, status, paid_at)",
].join(", ");

const SPONSORSHIP_COLUMNS = [
  "id",
  "group_id",
  "sponsor_id",
  "sponsor_name",
  "invitee_name",
  "invitee_phone",
  "status",
  "created_at",
  "financial_groups!inner(name, organization_id)",
].join(", ");

// ============================================
// GROUPES FINANCIERS
// ============================================
async function fetchGroup(
  supabase: SupabaseClient,
  groupId: string,
): Promise<FinancialGroup | null> {
  const { data, error } = await supabase
    .from("financial_groups")
    .select(GROUP_COLUMNS)
    .eq("id", groupId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? serializeGroup(data as unknown as GroupRow) : null;
}

export async function listGroups(
  supabase: SupabaseClient,
  organizationId: string,
  search: string,
  type: string,
): Promise<FinancialGroup[]> {
  let query = supabase
    .from("financial_groups")
    .select(GROUP_COLUMNS)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (search) query = query.ilike("name", `%${search}%`);
  if (type && type !== "all") query = query.eq("type", type);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as unknown as GroupRow[]).map(serializeGroup);
}

export async function createGroup(
  supabase: SupabaseClient,
  organizationId: string,
  payload: {
    name: string;
    type: string;
    amount: number;
    periodicity: string;
    max_members: number;
    goal_amount?: number | null;
    interest_rate?: number | null;
    start_date?: string | null;
    turn_member_names?: string[];
  },
): Promise<FinancialGroup> {
  const nowIso = new Date().toISOString();
  const startDate = payload.start_date
    ? new Date(`${payload.start_date}T00:00:00.000Z`).toISOString()
    : null;
  const intervalDays = payload.periodicity === "weekly" ? 7 : 30;

  const { data: group, error } = await supabase
    .from("financial_groups")
    .insert({
      organization_id: organizationId,
      name: payload.name,
      type: payload.type,
      status: "forming",
      amount: payload.amount,
      periodicity: payload.periodicity,
      max_members: payload.max_members,
      goal_amount: payload.goal_amount ?? null,
      interest_rate: payload.interest_rate ?? null,
      start_date: startDate,
      raised_amount: 0,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  // FIN-3 : membres + ordre de passage.
  const names =
    payload.type === "tontine"
      ? (payload.turn_member_names ?? []).slice(
          0,
          Math.max(0, payload.max_members - 1),
        )
      : [];

  const memberRows = [
    {
      group_id: group.id,
      name: "Bureau de l'association",
      role: "creator",
      engagement: "reliable",
      joined_at: nowIso,
      last_payment_at: null,
    },
    ...names.map((name) => ({
      group_id: group.id,
      name,
      role: "member",
      engagement: "reliable",
      joined_at: nowIso,
      last_payment_at: null,
    })),
  ];

  const { data: members, error: memberError } = await supabase
    .from("group_members")
    .insert(memberRows)
    .select();
  if (memberError) throw new Error(memberError.message);

  if (names.length > 0) {
    const base = startDate ? new Date(startDate).getTime() : Date.now();
    const turnRows = names.map((name, index) => ({
      group_id: group.id,
      member_id: members[index + 1].id,
      member_name: name,
      position: index + 1,
      expected_date: new Date(
        base + index * intervalDays * 86_400_000,
      ).toISOString(),
      received: false,
      received_at: null,
    }));
    const { error: turnError } = await supabase
      .from("group_turns")
      .insert(turnRows);
    if (turnError) throw new Error(turnError.message);
  }

  const { error: settingsError } = await supabase.from("group_settings").insert({
    group_id: group.id,
    visibility: "private",
    allow_join_requests: false,
    notify_payment_reminders: true,
  });
  if (settingsError) throw new Error(settingsError.message);

  const created = await fetchGroup(supabase, group.id);
  if (!created) throw new Error("Groupe introuvable après création");
  return created;
}

export async function declarePayment(
  supabase: SupabaseClient,
  groupId: string,
  payload: {
    member_id: string;
    amount: number;
    paid_for_member_id?: string | null;
    method: string;
  },
): Promise<FinancialGroup | null> {
  const group = await fetchGroup(supabase, groupId);
  if (!group) return null;

  const member = group.members.find((m) => m.id === payload.member_id);
  const beneficiary = payload.paid_for_member_id
    ? group.members.find((m) => m.id === payload.paid_for_member_id)
    : undefined;
  const confirmed = payload.method === "mobile";

  const { error } = await supabase.from("group_payments").insert({
    group_id: groupId,
    member_id: payload.member_id,
    member_name: member?.name ?? "Membre",
    method: payload.method,
    amount: payload.amount,
    paid_for_member_name: beneficiary?.name ?? null,
    status: confirmed ? "confirmed" : "pending",
    paid_at: confirmed ? new Date().toISOString() : null,
  });
  if (error) throw new Error(error.message);

  if (confirmed) {
    const { error: updateError } = await supabase
      .from("financial_groups")
      .update({ raised_amount: group.raised_amount + payload.amount })
      .eq("id", groupId);
    if (updateError) throw new Error(updateError.message);
  }

  return fetchGroup(supabase, groupId);
}

export async function validatePayment(
  supabase: SupabaseClient,
  groupId: string,
  paymentId: string,
): Promise<FinancialGroup | null> {
  const { data: payment, error } = await supabase
    .from("group_payments")
    .select("*")
    .eq("id", paymentId)
    .eq("group_id", groupId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!payment) return null;

  if (payment.status === "pending") {
    const { error: updateError } = await supabase
      .from("group_payments")
      .update({ status: "confirmed", paid_at: new Date().toISOString() })
      .eq("id", paymentId);
    if (updateError) throw new Error(updateError.message);

    const group = await fetchGroup(supabase, groupId);
    const { error: groupError } = await supabase
      .from("financial_groups")
      .update({
        raised_amount: (group?.raised_amount ?? 0) + Number(payment.amount),
      })
      .eq("id", groupId);
    if (groupError) throw new Error(groupError.message);
  }

  return fetchGroup(supabase, groupId);
}

export async function getTransactions(
  supabase: SupabaseClient,
  groupId: string,
): Promise<GroupTransaction[] | null> {
  const group = await fetchGroup(supabase, groupId);
  if (!group) return null;

  const transactions: GroupTransaction[] = [
    {
      id: `${groupId}-tx-0`,
      group_id: groupId,
      kind: GroupTransactionKind.CREATION,
      label: "Ouverture du groupe",
      amount: 0,
      member_name: null,
      date: group.created_at ? new Date(group.created_at) : null,
    },
  ];

  for (const p of group.payments) {
    const confirmed = p.status === "confirmed";
    transactions.push({
      id: p.id,
      group_id: groupId,
      kind: confirmed
        ? GroupTransactionKind.PAYMENT
        : GroupTransactionKind.PAYMENT_DECLARED,
      label: confirmed
        ? "Versement confirmé"
        : "Versement déclaré (en attente)",
      amount: confirmed ? p.amount : 0,
      member_name: p.paid_for_member_name
        ? `${p.member_name} (pour ${p.paid_for_member_name})`
        : p.member_name,
      date: p.paid_at ? new Date(p.paid_at) : null,
    });
  }

  for (const t of group.turns) {
    if (t.received) {
      transactions.push({
        id: t.id,
        group_id: groupId,
        kind: GroupTransactionKind.TURN_PAYOUT,
        label: `Tour ${t.position} versé à ${t.member_name}`,
        amount: -group.amount,
        member_name: t.member_name,
        date: t.received_at ? new Date(t.received_at) : null,
      });
    }
  }

  transactions.sort((a, b) => {
    const ad = a.date ? a.date.getTime() : 0;
    const bd = b.date ? b.date.getTime() : 0;
    return bd - ad;
  });

  return transactions;
}

export async function getStatistics(
  supabase: SupabaseClient,
  groupId: string,
): Promise<GroupStatistics | null> {
  const group = await fetchGroup(supabase, groupId);
  if (!group) return null;

  const payments = group.payments ?? [];
  const confirmed = payments.filter((p) => p.status === "confirmed").length;
  const pending = payments.filter((p) => p.status === "pending").length;
  const lastPaid = payments
    .filter((p) => p.paid_at)
    .map((p) => new Date(p.paid_at as unknown as string).getTime())
    .sort((a, b) => b - a)[0];

  return {
    group_id: groupId,
    total_raised: group.raised_amount,
    payments_count: payments.length,
    pending_count: pending,
    confirmed_count: confirmed,
    members_count: group.members?.length ?? 0,
    turns_total: group.turns?.length ?? 0,
    turns_received: group.turns?.filter((t) => t.received).length ?? 0,
    regularity_rate:
      payments.length === 0
        ? 0
        : Math.round((confirmed / payments.length) * 100),
    last_payment_at: lastPaid ? new Date(lastPaid) : null,
  };
}

export async function getSettings(
  supabase: SupabaseClient,
  groupId: string,
): Promise<GroupSettings> {
  const { data, error } = await supabase
    .from("group_settings")
    .select("*")
    .eq("group_id", groupId)
    .maybeSingle();
  if (error) throw new Error(error.message);

  const row = (data as SettingsRow | null) ?? {
    group_id: groupId,
    visibility: "private",
    allow_join_requests: false,
    notify_payment_reminders: true,
  };
  return serializeSettings(row);
}

export async function updateSettings(
  supabase: SupabaseClient,
  groupId: string,
  payload: {
    visibility?: string;
    allow_join_requests?: boolean;
    notify_payment_reminders?: boolean;
  },
): Promise<GroupSettings> {
  const { data, error } = await supabase
    .from("group_settings")
    .upsert(
      {
        group_id: groupId,
        visibility: payload.visibility ?? "private",
        allow_join_requests: payload.allow_join_requests ?? false,
        notify_payment_reminders: payload.notify_payment_reminders ?? true,
      },
      { onConflict: "group_id" },
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return serializeSettings(data as SettingsRow);
}

export async function closeGroup(
  supabase: SupabaseClient,
  groupId: string,
): Promise<FinancialGroup | null> {
  const { error } = await supabase
    .from("financial_groups")
    .update({ status: "closed" })
    .eq("id", groupId);
  if (error) throw new Error(error.message);
  return fetchGroup(supabase, groupId);
}

// ============================================
// PARRAINAGE
// ============================================
export async function getSponsorship(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<{ requests: SponsorshipRequest[]; open_groups: FinancialGroup[] }> {
  const { data: requests, error } = await supabase
    .from("sponsorship_requests")
    .select(SPONSORSHIP_COLUMNS)
    .eq("financial_groups.organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const allGroups = await listGroups(supabase, organizationId, "", "");
  const { data: settingsRows, error: settingsError } = await supabase
    .from("group_settings")
    .select(
      "group_id, visibility, allow_join_requests, notify_payment_reminders, financial_groups!inner(organization_id)",
    )
    .eq("financial_groups.organization_id", organizationId);
  if (settingsError) throw new Error(settingsError.message);

  const openMap = new Map(
    (settingsRows as unknown as SettingsRow[]).map((s) => [s.group_id, s]),
  );
  const openGroups = allGroups.filter((g) => {
    if (g.status === "closed") return false;
    const s = openMap.get(g.id);
    if (!s) return false;
    return s.allow_join_requests || s.visibility !== "private";
  });

  return {
    requests: (requests as unknown as SponsorshipRow[]).map(serializeSponsorship),
    open_groups: openGroups,
  };
}

export async function createSponsorshipRequest(
  supabase: SupabaseClient,
  payload: {
    group_id: string;
    sponsor_id: string;
    invitee_name: string;
    invitee_phone?: string | null;
  },
): Promise<SponsorshipRequest | null> {
  const group = await fetchGroup(supabase, payload.group_id);
  if (!group) return null;

  const sponsor = group.members.find((m) => m.id === payload.sponsor_id);

  const { data, error } = await supabase
    .from("sponsorship_requests")
    .insert({
      group_id: payload.group_id,
      sponsor_id: payload.sponsor_id,
      sponsor_name: sponsor?.name ?? "Parrain",
      invitee_name: payload.invitee_name,
      invitee_phone: payload.invitee_phone ?? null,
      status: "pending",
    })
    .select(SPONSORSHIP_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return serializeSponsorship(data as unknown as SponsorshipRow);
}

export async function respondSponsorship(
  supabase: SupabaseClient,
  requestId: string,
  decision: "accept" | "decline",
): Promise<SponsorshipRequest | null> {
  const { data, error } = await supabase
    .from("sponsorship_requests")
    .update({
      status: decision === "accept" ? "sponsor_accepted" : "declined",
    })
    .eq("id", requestId)
    .select(SPONSORSHIP_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? serializeSponsorship(data as unknown as SponsorshipRow) : null;
}

export async function confirmSponsorship(
  supabase: SupabaseClient,
  requestId: string,
): Promise<SponsorshipRequest | null> {
  const { data: request, error } = await supabase
    .from("sponsorship_requests")
    .select("id, group_id, invitee_name, status")
    .eq("id", requestId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!request) return null;

  const { data: memberExists } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", request.group_id)
    .eq("name", request.invitee_name)
    .maybeSingle();

  if (!memberExists) {
    const { error: insertError } = await supabase.from("group_members").insert({
      group_id: request.group_id,
      name: request.invitee_name,
      role: "member",
      engagement: "reliable",
      joined_at: new Date().toISOString(),
      last_payment_at: null,
    });
    if (insertError) throw new Error(insertError.message);
  }

  const { data, error: updateError } = await supabase
    .from("sponsorship_requests")
    .update({ status: "confirmed" })
    .eq("id", requestId)
    .select(SPONSORSHIP_COLUMNS)
    .maybeSingle();
  if (updateError) throw new Error(updateError.message);
  return data ? serializeSponsorship(data as unknown as SponsorshipRow) : null;
}

// ============================================
// PRÊTS INTERNES
// ============================================
async function fetchLoan(
  supabase: SupabaseClient,
  loanId: string,
): Promise<GroupLoan | null> {
  const { data, error } = await supabase
    .from("loans")
    .select(LOAN_COLUMNS)
    .eq("id", loanId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? serializeLoan(data as unknown as LoanRow) : null;
}

export async function listLoans(
  supabase: SupabaseClient,
  organizationId: string,
  search = "",
  status = "",
): Promise<GroupLoan[]> {
  let query = supabase
    .from("loans")
    .select(LOAN_COLUMNS)
    .eq("financial_groups.organization_id", organizationId)
    .order("requested_at", { ascending: false });

  if (status && status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let loans = (data as unknown as LoanRow[]).map(serializeLoan);

  if (search) {
    const needle = search.toLowerCase();
    loans = loans.filter(
      (l) =>
        l.member_name.toLowerCase().includes(needle) ||
        l.group_name.toLowerCase().includes(needle),
    );
  }

  return loans;
}

export async function requestLoan(
  supabase: SupabaseClient,
  groupId: string,
  payload: { member_id: string; amount: number },
): Promise<GroupLoan | null> {
  const group = await fetchGroup(supabase, groupId);
  if (!group) return null;

  const member = group.members.find((m) => m.id === payload.member_id);
  const creator = group.members.find((m) => m.role === "creator");

  const { data, error } = await supabase
    .from("loans")
    .insert({
      group_id: groupId,
      member_id: payload.member_id,
      member_name: member?.name ?? "Membre",
      sponsor_name: creator?.name ?? "Bureau de l'association",
      amount: payload.amount,
      suggested_amount: Math.round((payload.amount * 0.75) / 1000) * 1000,
      interest_rate: group.interest_rate ?? 5,
      total_due: 0,
      repaid_amount: 0,
      status: "requested",
      requested_at: new Date().toISOString(),
      sponsor_confirmed_at: null,
      decision_at: null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  return fetchLoan(supabase, data.id);
}

export async function confirmLoanSponsor(
  supabase: SupabaseClient,
  loanId: string,
): Promise<GroupLoan | null> {
  const { data: loan, error } = await supabase
    .from("loans")
    .select("*")
    .eq("id", loanId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!loan) return null;

  if (loan.status === "requested") {
    const { error: updateError } = await supabase
      .from("loans")
      .update({
        status: "sponsor_confirmed",
        sponsor_confirmed_at: new Date().toISOString(),
      })
      .eq("id", loanId);
    if (updateError) throw new Error(updateError.message);
  }

  return fetchLoan(supabase, loanId);
}

export async function decideLoan(
  supabase: SupabaseClient,
  loanId: string,
  approved: boolean,
): Promise<GroupLoan | null> {
  const { data: loan, error } = await supabase
    .from("loans")
    .select("*")
    .eq("id", loanId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!loan) return null;

  if (loan.status !== "sponsor_confirmed") {
    return fetchLoan(supabase, loanId);
  }

  if (!approved) {
    const { error: updateError } = await supabase
      .from("loans")
      .update({ status: "rejected", decision_at: new Date().toISOString() })
      .eq("id", loanId);
    if (updateError) throw new Error(updateError.message);
    return fetchLoan(supabase, loanId);
  }

  const total = Math.round(
    Number(loan.amount) * (1 + Number(loan.interest_rate) / 100),
  );
  const count = 3;
  const per = Math.floor(total / count);
  const remainder = total - per * count;

  const { error: updateError } = await supabase
    .from("loans")
    .update({
      status: "approved",
      total_due: total,
      decision_at: new Date().toISOString(),
    })
    .eq("id", loanId);
  if (updateError) throw new Error(updateError.message);

  const now = Date.now();
  const installments = Array.from({ length: count }, (_, i) => ({
    loan_id: loanId,
    position: i + 1,
    due_date: new Date(
      now + (i + 1) * 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    amount: per + (i === count - 1 ? remainder : 0),
    status: "pending",
    paid_at: null,
  }));
  const { error: installmentsError } = await supabase
    .from("loan_installments")
    .insert(installments);
  if (installmentsError) throw new Error(installmentsError.message);

  return fetchLoan(supabase, loanId);
}

export async function repayInstallment(
  supabase: SupabaseClient,
  loanId: string,
  installmentId: string,
): Promise<GroupLoan | null> {
  const { data: installment, error } = await supabase
    .from("loan_installments")
    .select("*")
    .eq("id", installmentId)
    .eq("loan_id", loanId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!installment) return null;

  if (installment.status === "pending") {
    const { error: updateError } = await supabase
      .from("loan_installments")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", installmentId);
    if (updateError) throw new Error(updateError.message);

    const { data: loan } = await supabase
      .from("loans")
      .select("*")
      .eq("id", loanId)
      .maybeSingle();
    if (loan) {
      const repaid = Number(loan.repaid_amount) + Number(installment.amount);
      const { error: loanError } = await supabase
        .from("loans")
        .update({
          repaid_amount: repaid,
          status:
            repaid >= Number(loan.total_due) ? "repaid" : loan.status,
        })
        .eq("id", loanId);
      if (loanError) throw new Error(loanError.message);
    }
  }

  return fetchLoan(supabase, loanId);
}

// ============================================
// SOLIDARITÉ / ASSURANCE COMMUNAUTAIRE
// ============================================
export async function getSolidarity(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<SolidarityBundle> {
  const { data: fund, error: fundError } = await supabase
    .from("guarantee_fund")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (fundError) throw new Error(fundError.message);

  const { data: enrollments, error: enrollmentsError } = await supabase
    .from("insurance_enrollments")
    .select("id, member_id, member_name, status, joined_at")
    .eq("organization_id", organizationId)
    .order("joined_at", { ascending: false });
  if (enrollmentsError) throw new Error(enrollmentsError.message);

  const { data: claims, error: claimsError } = await supabase
    .from("insurance_claims")
    .select(
      "id, member_id, member_name, description, amount, indemnity, status, submitted_at, decided_at",
    )
    .eq("organization_id", organizationId)
    .order("submitted_at", { ascending: false });
  if (claimsError) throw new Error(claimsError.message);

  return {
    fund: {
      balance: fund ? Number(fund.balance) : 0,
      levy_rate: fund ? Number(fund.levy_rate) : 0.004,
      cap_amount: fund ? Number(fund.cap_amount) : 1000,
      total_collected: fund ? Number(fund.total_collected) : 0,
      total_used: fund ? Number(fund.total_used) : 0,
    },
    enrollments: (enrollments as InsuranceEnrollment[]).map((e) => ({
      id: e.id,
      member_id: e.member_id,
      member_name: e.member_name,
      status: e.status,
      joined_at: e.joined_at ?? null,
    })),
    claims: (claims as InsuranceClaim[]).map((c) => ({
      id: c.id,
      member_id: c.member_id,
      member_name: c.member_name,
      description: c.description ?? "",
      amount: Number(c.amount),
      indemnity: Number(c.indemnity),
      status: c.status,
      submitted_at: c.submitted_at ?? null,
      decided_at: c.decided_at ?? null,
    })),
  };
}

export async function enrollInsurance(
  supabase: SupabaseClient,
  organizationId: string,
  payload: { member_id: string; member_name: string },
): Promise<InsuranceEnrollment> {
  const { data, error } = await supabase
    .from("insurance_enrollments")
    .insert({
      organization_id: organizationId,
      member_id: payload.member_id,
      member_name: payload.member_name,
      status: "active",
      joined_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return {
    id: data.id,
    member_id: data.member_id,
    member_name: data.member_name,
    status: data.status,
    joined_at: data.joined_at ?? null,
  };
}

export async function declareClaim(
  supabase: SupabaseClient,
  organizationId: string,
  payload: {
    member_id: string;
    member_name: string;
    description: string;
    amount: number;
  },
): Promise<InsuranceClaim> {
  const { data, error } = await supabase
    .from("insurance_claims")
    .insert({
      organization_id: organizationId,
      member_id: payload.member_id,
      member_name: payload.member_name,
      description: payload.description,
      amount: payload.amount,
      indemnity: 0,
      status: "submitted",
      submitted_at: new Date().toISOString(),
      decided_at: null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return {
    id: data.id,
    member_id: data.member_id,
    member_name: data.member_name,
    description: data.description ?? "",
    amount: Number(data.amount),
    indemnity: Number(data.indemnity),
    status: data.status,
    submitted_at: data.submitted_at ?? null,
    decided_at: data.decided_at ?? null,
  };
}

export async function decideClaim(
  supabase: SupabaseClient,
  organizationId: string,
  claimId: string,
  approved: boolean,
): Promise<InsuranceClaim | null> {
  const { data: claim, error } = await supabase
    .from("insurance_claims")
    .select("*")
    .eq("id", claimId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!claim) return null;

  if (claim.status !== "submitted" && claim.status !== "under_review") {
    return {
      id: claim.id,
      member_id: claim.member_id,
      member_name: claim.member_name,
      description: claim.description ?? "",
      amount: Number(claim.amount),
      indemnity: Number(claim.indemnity),
      status: claim.status,
      submitted_at: claim.submitted_at ?? null,
      decided_at: claim.decided_at ?? null,
    };
  }

  const { data: updated, error: updateError } = await supabase
    .from("insurance_claims")
    .update({
      status: approved ? "approved" : "rejected",
      indemnity: approved ? claim.amount : 0,
      decided_at: new Date().toISOString(),
    })
    .eq("id", claimId)
    .select()
    .single();
  if (updateError) throw new Error(updateError.message);

  if (approved) {
    const { data: fund } = await supabase
      .from("guarantee_fund")
      .select("*")
      .eq("organization_id", organizationId)
      .maybeSingle();
    const current = fund ?? {
      organization_id: organizationId,
      balance: 0,
      levy_rate: 0.004,
      cap_amount: 1000,
      total_collected: 0,
      total_used: 0,
    };
    const { error: fundError } = await supabase
      .from("guarantee_fund")
      .upsert(
        {
          organization_id: organizationId,
          balance: Number(current.balance) - Number(claim.amount),
          levy_rate: Number(current.levy_rate),
          cap_amount: Number(current.cap_amount),
          total_collected: Number(current.total_collected),
          total_used: Number(current.total_used) + Number(claim.amount),
        },
        { onConflict: "organization_id" },
      );
    if (fundError) throw new Error(fundError.message);
  }

  return {
    id: updated.id,
    member_id: updated.member_id,
    member_name: updated.member_name,
    description: updated.description ?? "",
    amount: Number(updated.amount),
    indemnity: Number(updated.indemnity),
    status: updated.status,
    submitted_at: updated.submitted_at ?? null,
    decided_at: updated.decided_at ?? null,
  };
}
