import type { SupabaseClient } from "@supabase/supabase-js";
import { EngagementLevel } from "@/types/modules/finance";
import {
  MemberProfile,
  MobilityReport,
  TransferDecision,
} from "@/types/modules/community";

interface ReportRow {
  id: string;
  organization_id: string;
  relocation_id: string;
  member_id: string;
  engagement: string;
  trust_score: number | string;
  contributions_count: number | string;
  meetings_attended: number | string;
  generated_at: string | null;
}

interface DecisionRow {
  id: string;
  organization_id: string;
  relocation_id: string;
  member_id: string;
  status: string;
  sponsorship: string | null;
  decision_note: string | null;
  decided_by: string | null;
  decided_at: string | null;
}

const REPORT_COLUMNS = [
  "id",
  "organization_id",
  "relocation_id",
  "member_id",
  "engagement",
  "trust_score",
  "contributions_count",
  "meetings_attended",
  "generated_at",
].join(", ");

const DECISION_COLUMNS = [
  "id",
  "organization_id",
  "relocation_id",
  "member_id",
  "status",
  "sponsorship",
  "decision_note",
  "decided_by",
  "decided_at",
].join(", ");

function serializeReport(row: ReportRow): MobilityReport {
  return {
    id: row.id,
    organization_id: row.organization_id,
    relocation_id: row.relocation_id,
    member_id: row.member_id,
    engagement: row.engagement as EngagementLevel,
    trust_score: Number(row.trust_score),
    indicators: {
      contributions_count: Number(row.contributions_count),
      meetings_attended: Number(row.meetings_attended),
    },
    generated_at: row.generated_at ? new Date(row.generated_at) : null,
  };
}

function serializeDecision(row: DecisionRow): TransferDecision {
  return {
    id: row.id,
    organization_id: row.organization_id,
    relocation_id: row.relocation_id,
    member_id: row.member_id,
    status: row.status as TransferDecision["status"],
    sponsorship: row.sponsorship ?? undefined,
    decision_note: row.decision_note ?? undefined,
    decided_at: row.decided_at ? new Date(row.decided_at) : null,
    decided_by: row.decided_by ?? undefined,
  };
}

// Profil d'engagement déterministe (même source que le mock, basée sur
// le hash du member_id pour rester stable entre appels).
interface EngagementProfile {
  engagement: EngagementLevel;
  trust_score: number;
  contributions_count: number;
  meetings_attended: number;
  social_aids_received: number;
  tontines_count: number;
  savings_active: boolean;
  purchases_count: number;
}

function hashString(value: string): number {
  let hash = 0;
  for (const ch of value) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  return hash;
}

function profileFor(memberId: string): EngagementProfile {
  const hash = hashString(memberId);
  const trust = 55 + (hash % 36); // 55..90
  const engagement =
    trust >= 85
      ? EngagementLevel.EXEMPLARY
      : trust >= 70
        ? EngagementLevel.RELIABLE
        : EngagementLevel.IRREGULAR;
  return {
    engagement,
    trust_score: trust,
    contributions_count: 3 + (hash % 12),
    meetings_attended: 4 + (hash % 14),
    social_aids_received: hash % 3,
    tontines_count: hash % 3,
    savings_active: hash % 2 === 0,
    purchases_count: hash % 9,
  };
}

async function getMemberName(
  supabase: SupabaseClient,
  memberId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("members")
    .select("name")
    .eq("id", memberId)
    .maybeSingle();
  return (data as { name: string } | null)?.name ?? null;
}

// ============================================
// MOBILITÉ (COM-49 / COM-50)
// ============================================
export async function listMobility(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<{ reports: MobilityReport[]; decisions: TransferDecision[] }> {
  const { data: reports, error: reportsError } = await supabase
    .from("mobility_reports")
    .select(REPORT_COLUMNS)
    .eq("organization_id", organizationId)
    .order("generated_at", { ascending: false });
  if (reportsError) throw new Error(reportsError.message);

  const { data: decisions, error: decisionsError } = await supabase
    .from("transfer_decisions")
    .select(DECISION_COLUMNS)
    .eq("organization_id", organizationId)
    .order("decided_at", { ascending: false });
  if (decisionsError) throw new Error(decisionsError.message);

  return {
    reports: (reports as unknown as ReportRow[]).map(serializeReport),
    decisions: (decisions as unknown as DecisionRow[]).map(serializeDecision),
  };
}

export async function generateMobilityReport(
  supabase: SupabaseClient,
  organizationId: string,
  relocationId: string,
  payload: { member_id: string; member_name?: string },
): Promise<MobilityReport> {
  const { data: existing } = await supabase
    .from("mobility_reports")
    .select(REPORT_COLUMNS)
    .eq("relocation_id", relocationId)
    .maybeSingle();
  if (existing) return serializeReport(existing as unknown as ReportRow);

  const profile = profileFor(payload.member_id);
  const memberName = payload.member_name ?? (await getMemberName(supabase, payload.member_id));

  const { data, error } = await supabase
    .from("mobility_reports")
    .insert({
      organization_id: organizationId,
      relocation_id: relocationId,
      member_id: payload.member_id,
      engagement: profile.engagement,
      trust_score: profile.trust_score,
      contributions_count: profile.contributions_count,
      meetings_attended: profile.meetings_attended,
      generated_at: new Date().toISOString(),
    })
    .select(REPORT_COLUMNS)
    .single();
  if (error) throw new Error(error.message);

  const report = serializeReport(data as unknown as ReportRow);
  if (memberName) report.member_name = memberName;
  return report;
}

export async function decideTransfer(
  supabase: SupabaseClient,
  organizationId: string,
  relocationId: string,
  payload: {
    status: string;
    sponsorship?: string;
    decision_note?: string;
    decided_by?: string;
  },
): Promise<TransferDecision> {
  const { data: existingRaw } = await supabase
    .from("transfer_decisions")
    .select(DECISION_COLUMNS)
    .eq("relocation_id", relocationId)
    .maybeSingle();
  const existing = existingRaw as unknown as DecisionRow | null;

  const decidedAt = new Date().toISOString();
  if (existing) {
    const { error: updateError } = await supabase
      .from("transfer_decisions")
      .update({
        status: payload.status,
        sponsorship: payload.sponsorship ?? null,
        decision_note: payload.decision_note ?? null,
        decided_by: payload.decided_by ?? null,
        decided_at: decidedAt,
      })
      .eq("id", existing.id);
    if (updateError) throw new Error(updateError.message);

    const { data: updated } = await supabase
      .from("transfer_decisions")
      .select(DECISION_COLUMNS)
      .eq("id", existing.id)
      .maybeSingle();
    return serializeDecision(updated as unknown as DecisionRow);
  }

  const { data: report } = await supabase
    .from("mobility_reports")
    .select("member_id")
    .eq("relocation_id", relocationId)
    .maybeSingle();

  const { data: created, error } = await supabase
    .from("transfer_decisions")
    .insert({
      organization_id: organizationId,
      relocation_id: relocationId,
      member_id: (report as { member_id: string } | null)?.member_id ?? "",
      status: payload.status,
      sponsorship: payload.sponsorship ?? null,
      decision_note: payload.decision_note ?? null,
      decided_by: payload.decided_by ?? null,
      decided_at: decidedAt,
    })
    .select(DECISION_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return serializeDecision(created as unknown as DecisionRow);
}

// ============================================
// PROFIL COMPLET DU MEMBRE (COM-11)
// ============================================
export async function getMemberProfile(
  supabase: SupabaseClient,
  organizationId: string,
  memberId: string,
): Promise<MemberProfile | null> {
  const { data: member, error } = await supabase
    .from("members")
    .select("id, name")
    .eq("id", memberId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!member) return null;

  const profile = profileFor(memberId);
  return {
    member_id: memberId,
    organization_id: organizationId,
    member_name: (member as { name: string }).name,
    engagement: profile.engagement,
    trust_score: profile.trust_score,
    history: {
      contributions_count: profile.contributions_count,
      meetings_attended: profile.meetings_attended,
      social_aids_received: profile.social_aids_received,
      tontines_count: profile.tontines_count,
      savings_active: profile.savings_active,
      purchases_count: profile.purchases_count,
    },
  };
}
