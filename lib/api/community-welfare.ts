import type { SupabaseClient } from "@supabase/supabase-js";
import { rpcRow, throwRpcError } from "@/lib/api/pay-rpc";
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

// Fonction SQL contribution_declare (0028) : la cotisation déclarée reste
// « pending » jusqu'à validation par la trésorerie, quelle que soit la méthode.
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
  const { data, error } = await supabase.rpc("contribution_declare", {
    p_organization_id: organizationId,
    p_member_id: payload.beneficiary_member_id,
    p_amount: payload.amount,
    p_method: payload.method,
    p_contribution_id: payload.contribution_id ?? null,
  });
  if (error) throwRpcError(error);

  const map = await getMembersMap(supabase, organizationId);
  const item = serializeContribution(rpcRow<ContributionRow>(data) as ContributionRow);
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

async function resolveBeneficiaryUserId(
  supabase: SupabaseClient,
  organizationId: string,
  beneficiaryName: string,
): Promise<string | null> {
  const needle = beneficiaryName.trim().toLowerCase();
  if (!needle) return null;
  const { data } = await supabase
    .from("members")
    .select("user_id, name, email")
    .eq("organization_id", organizationId);
  const match = (data ?? []).find(
    (m: { user_id: string | null; name: string; email: string | null }) =>
      m.user_id &&
      ((m.name ?? "").toLowerCase() === needle ||
        (m.email ?? "").toLowerCase() === needle),
  );
  return match?.user_id ?? null;
}

// Fonction SQL social_case_create (0027) : déclaration par un membre, toujours
// « submitted », montant collecté à zéro.
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
    beneficiary_user_id?: string | null;
  },
): Promise<SocialCase> {
  const beneficiaryUserId =
    payload.beneficiary_user_id ??
    (await resolveBeneficiaryUserId(
      supabase,
      organizationId,
      payload.beneficiary_name,
    ));

  const { data, error } = await supabase.rpc("social_case_create", {
    p_organization_id: organizationId,
    p_title: payload.title,
    p_target_amount: payload.target_amount,
    p_description: payload.description ?? "",
    p_type: payload.type,
    p_beneficiary_name: payload.beneficiary_name ?? "",
    p_beneficiary_user_id: beneficiaryUserId ?? null,
    p_contributors_visible: payload.contributors_visible,
  });
  if (error) throwRpcError(error);

  const row = rpcRow<{ id: string }>(data);
  const created = row ? await fetchSocialCase(supabase, row.id) : null;
  if (!created) throw new Error("Cas introuvable après création");
  return created;
}

// Fonction SQL social_case_review (0027). RG-C05 : validation par le comité
// (bureau), jamais par le bénéficiaire.
export async function validateSocialCase(
  supabase: SupabaseClient,
  caseId: string,
  decision: string,
  committeeNote: string | null,
): Promise<SocialCase | null> {
  const { error } = await supabase.rpc("social_case_review", {
    p_case_id: caseId,
    p_approve: decision === "approve",
    p_note: committeeNote,
  });
  if (error) throwRpcError(error);
  return fetchSocialCase(supabase, caseId);
}

// Fonction SQL social_case_disburse (0027). RG-C05 : décaissement par le
// président ou la trésorerie, une fois l'objectif atteint.
export async function disburseSocialCase(
  supabase: SupabaseClient,
  caseId: string,
): Promise<SocialCase | null> {
  const { error } = await supabase.rpc("social_case_disburse", {
    p_case_id: caseId,
  });
  if (error) throwRpcError(error);
  return fetchSocialCase(supabase, caseId);
}

// Fonction SQL atomique social_case_contribute (0027) : contribution et
// montant collecté mis à jour ensemble. Le nom du contributeur est celui de
// l'appelant, établi en base.
export async function contributeSocialCase(
  supabase: SupabaseClient,
  caseId: string,
  payload: { name: string; amount: number; anonymous: boolean },
): Promise<SocialCase | null> {
  const { error } = await supabase.rpc("social_case_contribute", {
    p_case_id: caseId,
    p_amount: payload.amount,
    p_anonymous: payload.anonymous,
  });
  if (error) throwRpcError(error);
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
