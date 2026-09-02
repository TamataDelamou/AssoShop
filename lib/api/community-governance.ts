import type { SupabaseClient } from "@supabase/supabase-js";
import {
  Election,
  Mandate,
  SignatureRequest,
} from "@/types/modules/community";

interface CandidateRow {
  id: string;
  member_id: string;
  votes: number | string;
}

interface ElectionRow {
  id: string;
  organization_id: string;
  title: string;
  position: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  candidates: CandidateRow[] | null;
}

interface OfficeHolderRow {
  role: string;
  member_name: string;
}

interface MandateRow {
  id: string;
  organization_id: string;
  label: string;
  start_date: string | null;
  end_date: string | null;
  office_holders: OfficeHolderRow[] | null;
}

interface SignatoryRow {
  id: string;
  name: string;
  role: string;
  signed_at: string | null;
}

interface SignatureRow {
  id: string;
  organization_id: string;
  type: string;
  title: string;
  description: string;
  amount: number | string | null;
  requested_by: string;
  status: string;
  created_at: string | null;
  signatories: SignatoryRow[] | null;
}

const ELECTION_COLUMNS = [
  "id",
  "organization_id",
  "title",
  "position",
  "status",
  "start_date",
  "end_date",
  "candidates:election_candidates(id, member_id, votes)",
].join(", ");

const MANDATE_COLUMNS = [
  "id",
  "organization_id",
  "label",
  "start_date",
  "end_date",
  "office_holders:mandate_office_holders(role, member_name)",
].join(", ");

const SIGNATURE_COLUMNS = [
  "id",
  "organization_id",
  "type",
  "title",
  "description",
  "amount",
  "requested_by",
  "status",
  "created_at",
  "signatories:signature_signatories(id, name, role, signed_at)",
].join(", ");

export function serializeElection(row: ElectionRow): Election {
  return {
    id: row.id,
    organization_id: row.organization_id,
    title: row.title,
    position: row.position as Election["position"],
    status: row.status as Election["status"],
    start_date: row.start_date ? new Date(row.start_date) : null,
    end_date: row.end_date ? new Date(row.end_date) : null,
    candidates: (row.candidates ?? []).map((c) => ({
      id: c.id,
      member_id: c.member_id,
      votes: Number(c.votes),
    })),
  };
}

function serializeMandate(row: MandateRow): Mandate {
  return {
    id: row.id,
    organization_id: row.organization_id,
    label: row.label,
    start_date: row.start_date ? new Date(row.start_date) : null,
    end_date: row.end_date ? new Date(row.end_date) : null,
    office_holders: (row.office_holders ?? []).map((h) => ({
      role: h.role as Mandate["office_holders"][number]["role"],
      member_name: h.member_name,
    })),
  };
}

export function serializeSignature(row: SignatureRow): SignatureRequest {
  return {
    id: row.id,
    organization_id: row.organization_id,
    type: row.type as SignatureRequest["type"],
    title: row.title,
    description: row.description,
    amount: row.amount == null ? undefined : Number(row.amount),
    requested_by: row.requested_by,
    signatories: (row.signatories ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      role: s.role,
      signed_at: s.signed_at ? new Date(s.signed_at) : null,
    })),
    status: row.status as SignatureRequest["status"],
    created_at: row.created_at ? new Date(row.created_at) : null,
  };
}

async function fetchElection(
  supabase: SupabaseClient,
  electionId: string,
): Promise<Election | null> {
  const { data, error } = await supabase
    .from("elections")
    .select(ELECTION_COLUMNS)
    .eq("id", electionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? serializeElection(data as unknown as ElectionRow) : null;
}

async function fetchSignature(
  supabase: SupabaseClient,
  signatureId: string,
): Promise<SignatureRequest | null> {
  const { data, error } = await supabase
    .from("signature_requests")
    .select(SIGNATURE_COLUMNS)
    .eq("id", signatureId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? serializeSignature(data as unknown as SignatureRow) : null;
}

export async function listElections(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<Election[]> {
  const { data, error } = await supabase
    .from("elections")
    .select(ELECTION_COLUMNS)
    .eq("organization_id", organizationId)
    .order("start_date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as unknown as ElectionRow[]).map(serializeElection);
}

export async function declareCandidacy(
  supabase: SupabaseClient,
  electionId: string,
  memberId: string,
): Promise<Election | null> {
  const { data: election, error } = await supabase
    .from("elections")
    .select("*")
    .eq("id", electionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!election) return null;
  if (election.status !== "open") throw new Error("Élection clôturée");

  const { data: duplicate } = await supabase
    .from("election_candidates")
    .select("id")
    .eq("election_id", electionId)
    .eq("member_id", memberId)
    .maybeSingle();
  if (duplicate) throw new Error("Candidature déjà déclarée");

  const { error: insertError } = await supabase
    .from("election_candidates")
    .insert({ election_id: electionId, member_id: memberId, votes: 0 });
  if (insertError) throw new Error(insertError.message);

  return fetchElection(supabase, electionId);
}

export async function castVote(
  supabase: SupabaseClient,
  electionId: string,
  candidateId: string,
): Promise<Election | null> {
  const { data: election, error } = await supabase
    .from("elections")
    .select("*")
    .eq("id", electionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!election) return null;
  if (election.status !== "open") throw new Error("Élection clôturée");

  const { data: candidate } = await supabase
    .from("election_candidates")
    .select("*")
    .eq("id", candidateId)
    .eq("election_id", electionId)
    .maybeSingle();
  if (!candidate) throw new Error("Candidat introuvable");

  const { error: updateError } = await supabase
    .from("election_candidates")
    .update({ votes: Number(candidate.votes) + 1 })
    .eq("id", candidateId);
  if (updateError) throw new Error(updateError.message);

  return fetchElection(supabase, electionId);
}

export async function closeElection(
  supabase: SupabaseClient,
  electionId: string,
): Promise<Election | null> {
  const { data: election, error } = await supabase
    .from("elections")
    .select("*")
    .eq("id", electionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!election) return null;
  if (election.status === "closed") throw new Error("Élection déjà clôturée");

  const { error: updateError } = await supabase
    .from("elections")
    .update({ status: "closed", end_date: new Date().toISOString() })
    .eq("id", electionId);
  if (updateError) throw new Error(updateError.message);

  return fetchElection(supabase, electionId);
}

export async function listMandates(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<Mandate[]> {
  const { data, error } = await supabase
    .from("mandates")
    .select(MANDATE_COLUMNS)
    .eq("organization_id", organizationId)
    .order("start_date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as unknown as MandateRow[]).map(serializeMandate);
}

export async function listSignatures(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<SignatureRequest[]> {
  const { data, error } = await supabase
    .from("signature_requests")
    .select(SIGNATURE_COLUMNS)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as unknown as SignatureRow[]).map(serializeSignature);
}

export async function createSignature(
  supabase: SupabaseClient,
  organizationId: string,
  payload: {
    type: string;
    title: string;
    description: string;
    amount?: number;
    requested_by: string;
    signatories: { name: string; role: string }[];
  },
): Promise<SignatureRequest> {
  const { data: request, error } = await supabase
    .from("signature_requests")
    .insert({
      organization_id: organizationId,
      type: payload.type,
      title: payload.title,
      description: payload.description,
      amount: payload.amount ?? null,
      requested_by: payload.requested_by,
      status: "pending",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  if (payload.signatories.length > 0) {
    const { error: insertError } = await supabase
      .from("signature_signatories")
      .insert(
        payload.signatories.map((s) => ({
          request_id: request.id,
          name: s.name,
          role: s.role,
          signed_at: null,
        })),
      );
    if (insertError) throw new Error(insertError.message);
  }

  const created = await fetchSignature(supabase, request.id);
  if (!created) throw new Error("Demande introuvable après création");
  return created;
}

export async function signSignature(
  supabase: SupabaseClient,
  signatureId: string,
  signatoryId: string,
): Promise<SignatureRequest | null> {
  const { data: request, error } = await supabase
    .from("signature_requests")
    .select("*")
    .eq("id", signatureId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!request) return null;
  if (request.status !== "pending")
    throw new Error("Cette demande n'est plus en attente de signature");

  const { data: signatory } = await supabase
    .from("signature_signatories")
    .select("*")
    .eq("id", signatoryId)
    .eq("request_id", signatureId)
    .maybeSingle();
  if (!signatory) throw new Error("Signataire introuvable");

  const { error: signError } = await supabase
    .from("signature_signatories")
    .update({ signed_at: new Date().toISOString() })
    .eq("id", signatoryId);
  if (signError) throw new Error(signError.message);

  const { data: all } = await supabase
    .from("signature_signatories")
    .select("signed_at")
    .eq("request_id", signatureId);
  const allSigned = (all as { signed_at: string | null }[]).every(
    (s) => s.signed_at != null,
  );
  if (allSigned) {
    const { error: statusError } = await supabase
      .from("signature_requests")
      .update({ status: "signed" })
      .eq("id", signatureId);
    if (statusError) throw new Error(statusError.message);
  }

  return fetchSignature(supabase, signatureId);
}

export async function rejectSignature(
  supabase: SupabaseClient,
  signatureId: string,
): Promise<SignatureRequest | null> {
  const { data: request, error } = await supabase
    .from("signature_requests")
    .select("*")
    .eq("id", signatureId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!request) return null;

  if (request.status === "pending") {
    const { error: updateError } = await supabase
      .from("signature_requests")
      .update({ status: "rejected" })
      .eq("id", signatureId);
    if (updateError) throw new Error(updateError.message);
  }

  return fetchSignature(supabase, signatureId);
}
