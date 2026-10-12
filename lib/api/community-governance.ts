import type { SupabaseClient } from "@supabase/supabase-js";
import { RpcError, rpcRow, throwRpcError } from "@/lib/api/pay-rpc";
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

// Fonction SQL election_declare_candidacy (0027) : un membre actif se déclare
// lui-même ; le bureau peut déclarer un autre membre.
export async function declareCandidacy(
  supabase: SupabaseClient,
  electionId: string,
  memberId: string,
): Promise<Election | null> {
  const { error } = await supabase.rpc("election_declare_candidacy", {
    p_election_id: electionId,
    p_member_id: memberId,
  });
  if (error) throwRpcError(error);
  return fetchElection(supabase, electionId);
}

// Fonction SQL election_cast_vote (0027) : un vote par membre et par scrutin,
// compté en base, définitif.
export async function castVote(
  supabase: SupabaseClient,
  electionId: string,
  candidateId: string,
): Promise<Election | null> {
  const { error } = await supabase.rpc("election_cast_vote", {
    p_election_id: electionId,
    p_candidate_id: candidateId,
  });
  if (error) throwRpcError(error);
  return fetchElection(supabase, electionId);
}

// Fonction SQL election_close (0027). RG-C06 : un scrutin clôturé n'est plus
// modifiable.
export async function closeElection(
  supabase: SupabaseClient,
  electionId: string,
): Promise<Election | null> {
  const { error } = await supabase.rpc("election_close", {
    p_election_id: electionId,
  });
  if (error) throwRpcError(error);
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

// Fonction SQL atomique signature_create (0027) : demande et signataires créés
// ensemble, par le bureau. Chaque signataire est un membre actif disposant
// d'un compte : c'est ce compte, et lui seul, qui pourra signer sa ligne.
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
    signatory_member_ids?: string[];
  },
): Promise<SignatureRequest> {
  let memberIds = payload.signatory_member_ids ?? [];
  if (memberIds.length === 0 && payload.signatories.length > 0) {
    // L'écran web de référence saisit des noms : on retrouve les membres.
    const names = payload.signatories.map((s) => s.name.trim()).filter(Boolean);
    const { data: members, error: membersError } = await supabase
      .from("members")
      .select("id, name")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .in("name", names);
    if (membersError) throw new Error(membersError.message);
    const found = (members ?? []) as { id: string; name: string }[];
    const missing = names.filter((n) => !found.some((m) => m.name === n));
    if (missing.length > 0) {
      throw new RpcError(
        "Signataire introuvable parmi les membres actifs : " + missing.join(", "),
        400,
      );
    }
    memberIds = found.map((m) => m.id);
  }

  const { data, error } = await supabase.rpc("signature_create", {
    p_organization_id: organizationId,
    p_type: payload.type,
    p_title: payload.title,
    p_signatory_member_ids: memberIds,
    p_description: payload.description ?? "",
    p_amount: payload.amount ?? null,
  });
  if (error) throwRpcError(error);

  const request = rpcRow<{ id: string }>(data);
  const created = request ? await fetchSignature(supabase, request.id) : null;
  if (!created) throw new Error("Demande introuvable après création");
  return created;
}

// Fonction SQL signature_sign (0027) : l'appelant signe SA ligne ; la demande
// se clôt d'elle-même quand toutes les lignes sont signées.
export async function signSignature(
  supabase: SupabaseClient,
  signatureId: string,
): Promise<SignatureRequest | null> {
  const { error } = await supabase.rpc("signature_sign", {
    p_request_id: signatureId,
  });
  if (error) throwRpcError(error);
  return fetchSignature(supabase, signatureId);
}

// Fonction SQL signature_reject (0027) : refus par l'un des signataires désignés.
export async function rejectSignature(
  supabase: SupabaseClient,
  signatureId: string,
): Promise<SignatureRequest | null> {
  const { error } = await supabase.rpc("signature_reject", {
    p_request_id: signatureId,
  });
  if (error) throwRpcError(error);
  return fetchSignature(supabase, signatureId);
}
