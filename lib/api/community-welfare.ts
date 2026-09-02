import type { SupabaseClient } from "@supabase/supabase-js";
import {
  Asset,
  Beneficiary,
  Contribution,
  ProjectEvaluation,
  SocialCase,
} from "@/types/modules/community";

interface ContributionRow {
  id: string;
  organization_id: string;
  member_id: string;
  amount: number | string;
  period_label: string;
  due_date: string | null;
  status: string;
  method: string | null;
  paid_at: string | null;
  paid_by: string | null;
  validated_by: string | null;
}

interface ContributorRow {
  id: string;
  name: string;
  amount: number | string;
  anonymous: boolean;
  contributed_at: string | null;
}

interface SocialCaseRow {
  id: string;
  organization_id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  beneficiary_name: string;
  target_amount: number | string;
  collected_amount: number | string;
  currency: string;
  contributors_visible: boolean;
  committee_note: string | null;
  disbursed_at: string | null;
  created_at: string | null;
  contributors: ContributorRow[] | null;
}

interface BeneficiaryRow {
  id: string;
  organization_id: string;
  project_id: string;
  name: string;
  category: string;
  status: string;
  registered_at: string | null;
}

interface EvaluationRow {
  id: string;
  organization_id: string;
  project_id: string;
  objectives: string;
  results: string;
  impact: string;
  rating: number | string;
  evaluated_at: string | null;
}

interface AssetRow {
  id: string;
  organization_id: string;
  name: string;
  category: string;
  status: string;
  quantity: number | string;
  acquisition_value: number | string;
  acquisition_date: string | null;
  location: string;
  assigned_to: string;
}

const CONTRIBUTION_COLUMNS = [
  "id",
  "organization_id",
  "member_id",
  "amount",
  "period_label",
  "due_date",
  "status",
  "method",
  "paid_at",
  "paid_by",
  "validated_by",
].join(", ");

const SOCIAL_CASE_COLUMNS = [
  "id",
  "organization_id",
  "title",
  "description",
  "type",
  "status",
  "beneficiary_name",
  "target_amount",
  "collected_amount",
  "currency",
  "contributors_visible",
  "committee_note",
  "disbursed_at",
  "created_at",
  "contributors:social_case_contributors(id, name, amount, anonymous, contributed_at)",
].join(", ");

const BENEFICIARY_COLUMNS = [
  "id",
  "organization_id",
  "project_id",
  "name",
  "category",
  "status",
  "registered_at",
].join(", ");

const EVALUATION_COLUMNS = [
  "id",
  "organization_id",
  "project_id",
  "objectives",
  "results",
  "impact",
  "rating",
  "evaluated_at",
].join(", ");

const ASSET_COLUMNS = [
  "id",
  "organization_id",
  "name",
  "category",
  "status",
  "quantity",
  "acquisition_value",
  "acquisition_date",
  "location",
  "assigned_to",
].join(", ");

export function serializeContribution(row: ContributionRow): Contribution {
  return {
    id: row.id,
    organization_id: row.organization_id,
    member_id: row.member_id,
    amount: Number(row.amount),
    period_label: row.period_label,
    due_date: row.due_date ? new Date(row.due_date) : null,
    status: row.status as Contribution["status"],
    method: row.method ? (row.method as Contribution["method"]) : null,
    paid_at: row.paid_at ? new Date(row.paid_at) : null,
    paid_by: null,
    validated_by: row.validated_by ?? null,
  };
}

function serializeSocialCase(row: SocialCaseRow): SocialCase {
  return {
    id: row.id,
    organization_id: row.organization_id,
    title: row.title,
    description: row.description,
    type: row.type as SocialCase["type"],
    status: row.status as SocialCase["status"],
    beneficiary_name: row.beneficiary_name,
    target_amount: Number(row.target_amount),
    collected_amount: Number(row.collected_amount),
    currency: row.currency,
    contributors_visible: row.contributors_visible,
    committee_note: row.committee_note ?? null,
    disbursed_at: row.disbursed_at ? new Date(row.disbursed_at) : null,
    created_at: row.created_at ? new Date(row.created_at) : null,
    contributors: (row.contributors ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      amount: Number(c.amount),
      anonymous: c.anonymous,
      contributed_at: c.contributed_at ? new Date(c.contributed_at) : null,
    })),
  };
}

function serializeBeneficiary(row: BeneficiaryRow): Beneficiary {
  return {
    id: row.id,
    organization_id: row.organization_id,
    project_id: row.project_id,
    name: row.name,
    category: row.category as Beneficiary["category"],
    status: row.status as Beneficiary["status"],
    registered_at: row.registered_at ? new Date(row.registered_at) : null,
  };
}

function serializeEvaluation(row: EvaluationRow): ProjectEvaluation {
  return {
    id: row.id,
    organization_id: row.organization_id,
    project_id: row.project_id,
    objectives: row.objectives,
    results: row.results,
    impact: row.impact,
    rating: Number(row.rating),
    evaluated_at: row.evaluated_at ? new Date(row.evaluated_at) : null,
  };
}

function serializeAsset(row: AssetRow): Asset {
  return {
    id: row.id,
    organization_id: row.organization_id,
    name: row.name,
    category: row.category as Asset["category"],
    status: row.status as Asset["status"],
    quantity: Number(row.quantity),
    acquisition_value: Number(row.acquisition_value),
    acquisition_date: row.acquisition_date
      ? new Date(row.acquisition_date)
      : null,
    location: row.location,
    assigned_to: row.assigned_to,
  };
}

async function fetchSocialCase(
  supabase: SupabaseClient,
  caseId: string,
): Promise<SocialCase | null> {
  const { data, error } = await supabase
    .from("social_cases")
    .select(SOCIAL_CASE_COLUMNS)
    .eq("id", caseId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? serializeSocialCase(data as unknown as SocialCaseRow) : null;
}

function currentPeriodLabel(): string {
  const label = new Date().toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

interface MemberInfo {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

async function getMembersMap(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<Map<string, MemberInfo>> {
  const { data } = await supabase
    .from("members")
    .select("id, name, email, phone")
    .eq("organization_id", organizationId);
  const map = new Map<string, MemberInfo>();
  for (const m of (data ?? []) as {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  }[]) {
    map.set(m.id, {
      id: m.id,
      name: m.name,
      email: m.email ?? undefined,
      phone: m.phone ?? undefined,
    });
  }
  return map;
}

// ============================================
// COTISATIONS
// ============================================
export async function listContributions(
  supabase: SupabaseClient,
  organizationId: string,
  search = "",
  status = "",
): Promise<Contribution[]> {
  let query = supabase
    .from("contributions")
    .select(CONTRIBUTION_COLUMNS)
    .eq("organization_id", organizationId)
    .order("due_date", { ascending: false });

  if (status && status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const map = await getMembersMap(supabase, organizationId);
  let items = (data as unknown as ContributionRow[]).map((r) => ({
    ...serializeContribution(r),
    member: map.get(r.member_id),
  }));

  if (search) {
    const needle = search.toLowerCase();
    items = items.filter(
      (c) =>
        (c.member?.name ?? "").toLowerCase().includes(needle) ||
        (c.member?.email ?? "").toLowerCase().includes(needle),
    );
  }

  return items;
}

export async function payContribution(
  supabase: SupabaseClient,
  organizationId: string,
  payload: {
    contribution_id?: string;
    beneficiary_member_id: string;
    amount: number;
    method: string;
  },
): Promise<Contribution> {
  const now = new Date().toISOString();
  const paid = payload.method === "online";
  const values = {
    organization_id: organizationId,
    member_id: payload.beneficiary_member_id,
    amount: payload.amount,
    period_label: currentPeriodLabel(),
    due_date: now,
    status: paid ? "paid" : "pending",
    method: payload.method,
    paid_at: paid ? now : null,
    paid_by: null,
    validated_by: null,
  };

  let rowId: string | null = null;
  if (payload.contribution_id) {
    const { data: existing } = await supabase
      .from("contributions")
      .select("id")
      .eq("id", payload.contribution_id)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (existing) {
      rowId = existing.id;
      const { error } = await supabase
        .from("contributions")
        .update(values)
        .eq("id", rowId);
      if (error) throw new Error(error.message);
    }
  }

  if (!rowId) {
    const { data: created, error } = await supabase
      .from("contributions")
      .insert(values)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    rowId = created.id;
  }

  const { data: row } = await supabase
    .from("contributions")
    .select(CONTRIBUTION_COLUMNS)
    .eq("id", rowId)
    .maybeSingle();
  const map = await getMembersMap(supabase, organizationId);
  const item = serializeContribution(row as unknown as ContributionRow);
  return { ...item, member: map.get(item.member_id) };
}

export async function validateContribution(
  supabase: SupabaseClient,
  contributionId: string,
  payload: { decision: "approve" | "reject"; validator_name: string },
): Promise<Contribution | null> {
  const { data: existing, error } = await supabase
    .from("contributions")
    .select("*")
    .eq("id", contributionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!existing) return null;

  const approve = payload.decision === "approve";
  const { error: updateError } = await supabase
    .from("contributions")
    .update({
      status: approve ? "paid" : "rejected",
      paid_at: approve ? new Date().toISOString() : existing.paid_at,
      validated_by: payload.validator_name,
    })
    .eq("id", contributionId);
  if (updateError) throw new Error(updateError.message);

  const { data: updated } = await supabase
    .from("contributions")
    .select(CONTRIBUTION_COLUMNS)
    .eq("id", contributionId)
    .maybeSingle();
  if (!updated) return null;
  const map = await getMembersMap(supabase, existing.organization_id);
  const item = serializeContribution(updated as unknown as ContributionRow);
  return { ...item, member: map.get(item.member_id) };
}

// ============================================
// CAS SOCIAUX
// ============================================
export async function listSocialCases(
  supabase: SupabaseClient,
  organizationId: string,
  search = "",
  status = "",
): Promise<SocialCase[]> {
  let query = supabase
    .from("social_cases")
    .select(SOCIAL_CASE_COLUMNS)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (status && status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let items = (data as unknown as SocialCaseRow[]).map(serializeSocialCase);

  if (search) {
    const needle = search.toLowerCase();
    items = items.filter(
      (c) =>
        c.title.toLowerCase().includes(needle) ||
        c.beneficiary_name.toLowerCase().includes(needle),
    );
  }

  return items;
}

export async function createSocialCase(
  supabase: SupabaseClient,
  organizationId: string,
  payload: {
    title: string;
    description: string;
    type: string;
    beneficiary_name: string;
    target_amount: number;
    contributors_visible: boolean;
  },
): Promise<SocialCase> {
  const { data, error } = await supabase
    .from("social_cases")
    .insert({
      organization_id: organizationId,
      title: payload.title,
      description: payload.description,
      type: payload.type,
      status: "submitted",
      beneficiary_name: payload.beneficiary_name,
      target_amount: payload.target_amount,
      collected_amount: 0,
      currency: "GNF",
      contributors_visible: payload.contributors_visible,
      committee_note: null,
      disbursed_at: null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const created = await fetchSocialCase(supabase, data.id);
  if (!created) throw new Error("Cas introuvable après création");
  return created;
}

export async function validateSocialCase(
  supabase: SupabaseClient,
  caseId: string,
  decision: string,
  committeeNote: string | null,
): Promise<SocialCase | null> {
  const { data: existing, error } = await supabase
    .from("social_cases")
    .select("*")
    .eq("id", caseId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!existing) return null;

  const { error: updateError } = await supabase
    .from("social_cases")
    .update({
      status: decision === "approve" ? "approved" : "rejected",
      committee_note: committeeNote,
    })
    .eq("id", caseId);
  if (updateError) throw new Error(updateError.message);

  return fetchSocialCase(supabase, caseId);
}

export async function disburseSocialCase(
  supabase: SupabaseClient,
  caseId: string,
): Promise<SocialCase | null> {
  const { data: existing, error } = await supabase
    .from("social_cases")
    .select("*")
    .eq("id", caseId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!existing) return null;

  if (existing.status === "funded") {
    const { error: updateError } = await supabase
      .from("social_cases")
      .update({
        status: "disbursed",
        disbursed_at: new Date().toISOString(),
      })
      .eq("id", caseId);
    if (updateError) throw new Error(updateError.message);
  }

  return fetchSocialCase(supabase, caseId);
}

export async function contributeSocialCase(
  supabase: SupabaseClient,
  caseId: string,
  payload: { name: string; amount: number; anonymous: boolean },
): Promise<SocialCase | null> {
  const { data: existing, error } = await supabase
    .from("social_cases")
    .select("*")
    .eq("id", caseId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!existing) return null;

  const { error: contributionError } = await supabase
    .from("social_case_contributors")
    .insert({
      case_id: caseId,
      name: payload.anonymous ? "Donateur anonyme" : payload.name,
      amount: payload.amount,
      anonymous: payload.anonymous,
      contributed_at: new Date().toISOString(),
    });
  if (contributionError) throw new Error(contributionError.message);

  const collected = Number(existing.collected_amount) + payload.amount;
  const { error: updateError } = await supabase
    .from("social_cases")
    .update({
      collected_amount: collected,
      status:
        existing.status === "approved" && collected >= Number(existing.target_amount)
          ? "funded"
          : existing.status,
    })
    .eq("id", caseId);
  if (updateError) throw new Error(updateError.message);

  return fetchSocialCase(supabase, caseId);
}

// ============================================
// BÉNÉFICIAIRES & ÉVALUATIONS
// ============================================
export async function listBeneficiaries(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<Beneficiary[]> {
  const { data, error } = await supabase
    .from("beneficiaries")
    .select(BENEFICIARY_COLUMNS)
    .eq("organization_id", organizationId)
    .order("registered_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as unknown as BeneficiaryRow[]).map(serializeBeneficiary);
}

export async function createBeneficiary(
  supabase: SupabaseClient,
  organizationId: string,
  payload: { project_id: string; name: string; category: string },
): Promise<Beneficiary> {
  const { data, error } = await supabase
    .from("beneficiaries")
    .insert({
      organization_id: organizationId,
      project_id: payload.project_id,
      name: payload.name,
      category: payload.category,
      status: "supported",
      registered_at: new Date().toISOString(),
    })
    .select(BENEFICIARY_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return serializeBeneficiary(data as unknown as BeneficiaryRow);
}

export async function updateBeneficiaryStatus(
  supabase: SupabaseClient,
  beneficiaryId: string,
  status: string,
): Promise<Beneficiary | null> {
  const { data, error } = await supabase
    .from("beneficiaries")
    .update({ status })
    .eq("id", beneficiaryId)
    .select(BENEFICIARY_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? serializeBeneficiary(data as unknown as BeneficiaryRow) : null;
}

export async function listEvaluations(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<ProjectEvaluation[]> {
  const { data, error } = await supabase
    .from("project_evaluations")
    .select(EVALUATION_COLUMNS)
    .eq("organization_id", organizationId)
    .order("evaluated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as unknown as EvaluationRow[]).map(serializeEvaluation);
}

export async function createEvaluation(
  supabase: SupabaseClient,
  organizationId: string,
  payload: {
    project_id: string;
    objectives: string;
    results: string;
    impact: string;
    rating: number;
  },
): Promise<ProjectEvaluation> {
  const { data, error } = await supabase
    .from("project_evaluations")
    .insert({
      organization_id: organizationId,
      project_id: payload.project_id,
      objectives: payload.objectives,
      results: payload.results,
      impact: payload.impact,
      rating: payload.rating,
      evaluated_at: new Date().toISOString(),
    })
    .select(EVALUATION_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return serializeEvaluation(data as unknown as EvaluationRow);
}

// ============================================
// ACTIFS
// ============================================
export async function listAssets(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<Asset[]> {
  const { data, error } = await supabase
    .from("assets")
    .select(ASSET_COLUMNS)
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as unknown as AssetRow[]).map(serializeAsset);
}

export async function createAsset(
  supabase: SupabaseClient,
  organizationId: string,
  payload: {
    name: string;
    category: string;
    quantity: number;
    acquisition_value: number;
    acquisition_date?: string;
    location: string;
    assigned_to: string;
  },
): Promise<Asset> {
  const { data, error } = await supabase
    .from("assets")
    .insert({
      organization_id: organizationId,
      name: payload.name,
      category: payload.category,
      status: "available",
      quantity: payload.quantity,
      acquisition_value: payload.acquisition_value,
      acquisition_date: payload.acquisition_date
        ? new Date(`${payload.acquisition_date}T00:00:00.000Z`).toISOString()
        : null,
      location: payload.location,
      assigned_to: payload.assigned_to,
    })
    .select(ASSET_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return serializeAsset(data as unknown as AssetRow);
}

export async function updateAssetStatus(
  supabase: SupabaseClient,
  assetId: string,
  status: string,
): Promise<Asset | null> {
  const { data, error } = await supabase
    .from("assets")
    .update({ status })
    .eq("id", assetId)
    .select(ASSET_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? serializeAsset(data as unknown as AssetRow) : null;
}
