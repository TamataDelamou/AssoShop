import type { SupabaseClient } from "@supabase/supabase-js";
import {
  Affiliation,
  Antenna,
  CommunityEvent,
  MemberRelocation,
  SharedMembershipRequest,
} from "@/types/modules/community";

interface AntennaRow {
  id: string;
  organization_id: string;
  parent_id: string | null;
  name: string;
  level: string;
  city: string;
  address: string | null;
  responsible: string | null;
  member_count: number | string;
  created_at: string | null;
}

interface AffiliationRow {
  id: string;
  organization_id: string;
  affiliate_id: string;
  status: string;
  share_members: boolean;
  share_finances: boolean;
  shared_member_count: number | string;
  linked_at: string | null;
}

interface EventRow {
  id: string;
  organization_id: string;
  title: string;
  type: string;
  description: string | null;
  start_at: string | null;
  end_at: string | null;
  location: string;
  created_at: string | null;
}

interface SharedMembershipRow {
  id: string;
  organization_id: string;
  member_name: string;
  email: string | null;
  phone: string | null;
  source_affiliation_id: string;
  fee_exempt: boolean;
  status: string;
  requested_at: string | null;
}

interface RelocationRow {
  id: string;
  organization_id: string;
  member_id: string;
  old_address: string;
  new_address: string;
  new_city: string;
  reason: string | null;
  status: string;
  requested_at: string | null;
  confirmed_at: string | null;
}

const ANTENNA_COLUMNS = [
  "id",
  "organization_id",
  "parent_id",
  "name",
  "level",
  "city",
  "address",
  "responsible",
  "member_count",
  "created_at",
].join(", ");

const AFFILIATION_COLUMNS = [
  "id",
  "organization_id",
  "affiliate_id",
  "status",
  "share_members",
  "share_finances",
  "shared_member_count",
  "linked_at",
].join(", ");

const EVENT_COLUMNS = [
  "id",
  "organization_id",
  "title",
  "type",
  "description",
  "start_at",
  "end_at",
  "location",
  "created_at",
].join(", ");

const SHARED_COLUMNS = [
  "id",
  "organization_id",
  "member_name",
  "email",
  "phone",
  "source_affiliation_id",
  "fee_exempt",
  "status",
  "requested_at",
].join(", ");

const RELOCATION_COLUMNS = [
  "id",
  "organization_id",
  "member_id",
  "old_address",
  "new_address",
  "new_city",
  "reason",
  "status",
  "requested_at",
  "confirmed_at",
].join(", ");

function serializeAntenna(row: AntennaRow): Antenna {
  return {
    id: row.id,
    organization_id: row.organization_id,
    parent_id: row.parent_id ?? null,
    name: row.name,
    level: row.level as Antenna["level"],
    city: row.city,
    address: row.address ?? undefined,
    responsible: row.responsible ?? undefined,
    member_count: Number(row.member_count),
    created_at: row.created_at ? new Date(row.created_at) : null,
  };
}

function serializeAffiliation(row: AffiliationRow): Affiliation {
  return {
    id: row.id,
    organization_id: row.organization_id,
    affiliate_id: row.affiliate_id,
    status: row.status as Affiliation["status"],
    share_members: row.share_members,
    share_finances: row.share_finances,
    shared_member_count: Number(row.shared_member_count),
    linked_at: row.linked_at ? new Date(row.linked_at) : null,
  };
}

function serializeEvent(row: EventRow): CommunityEvent {
  return {
    id: row.id,
    organization_id: row.organization_id,
    title: row.title,
    type: row.type as CommunityEvent["type"],
    description: row.description,
    start_at: row.start_at ? new Date(row.start_at) : null,
    end_at: row.end_at ? new Date(row.end_at) : null,
    location: row.location,
    created_at: row.created_at ? new Date(row.created_at) : null,
  };
}

function serializeSharedMembership(
  row: SharedMembershipRow,
): SharedMembershipRequest {
  return {
    id: row.id,
    organization_id: row.organization_id,
    member_name: row.member_name,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    source_affiliation_id: row.source_affiliation_id,
    fee_exempt: row.fee_exempt,
    status: row.status as SharedMembershipRequest["status"],
    requested_at: row.requested_at ? new Date(row.requested_at) : null,
  };
}

function serializeRelocation(row: RelocationRow): MemberRelocation {
  return {
    id: row.id,
    organization_id: row.organization_id,
    member_id: row.member_id,
    old_address: row.old_address,
    new_address: row.new_address,
    new_city: row.new_city,
    reason: row.reason ?? undefined,
    status: row.status as MemberRelocation["status"],
    requested_at: row.requested_at ? new Date(row.requested_at) : null,
    confirmed_at: row.confirmed_at ? new Date(row.confirmed_at) : null,
  };
}

// ============================================
// ANTENNES
// ============================================
export async function listAntennas(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<Antenna[]> {
  const { data, error } = await supabase
    .from("antennas")
    .select(ANTENNA_COLUMNS)
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as unknown as AntennaRow[]).map(serializeAntenna);
}

export async function createAntenna(
  supabase: SupabaseClient,
  organizationId: string,
  payload: {
    name: string;
    level: string;
    city: string;
    parent_id?: string | null;
    address?: string;
    responsible?: string;
  },
): Promise<Antenna> {
  const { data, error } = await supabase
    .from("antennas")
    .insert({
      organization_id: organizationId,
      parent_id: payload.parent_id ?? null,
      name: payload.name,
      level: payload.level,
      city: payload.city,
      address: payload.address ?? "",
      responsible: payload.responsible ?? "",
      member_count: 0,
    })
    .select(ANTENNA_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return serializeAntenna(data as unknown as AntennaRow);
}

// ============================================
// AFFILIATIONS
// ============================================
export async function listAffiliations(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<Affiliation[]> {
  const { data, error } = await supabase
    .from("affiliations")
    .select(AFFILIATION_COLUMNS)
    .eq("organization_id", organizationId)
    .order("linked_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as unknown as AffiliationRow[]).map(serializeAffiliation);
}

export async function linkAffiliation(
  supabase: SupabaseClient,
  organizationId: string,
  payload: { affiliate_id: string; share_members: boolean; share_finances: boolean },
): Promise<Affiliation> {
  if (payload.affiliate_id === organizationId) {
    throw new Error("Impossible de s'affilier à soi-même.");
  }
  const { data: duplicate } = await supabase
    .from("affiliations")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("affiliate_id", payload.affiliate_id)
    .maybeSingle();
  if (duplicate) throw new Error("Cette association est déjà affiliée.");

  const { data, error } = await supabase
    .from("affiliations")
    .insert({
      organization_id: organizationId,
      affiliate_id: payload.affiliate_id,
      status: "pending",
      share_members: payload.share_members,
      share_finances: payload.share_finances,
      shared_member_count: 0,
      linked_at: new Date().toISOString(),
    })
    .select(AFFILIATION_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return serializeAffiliation(data as unknown as AffiliationRow);
}

export async function updateAffiliation(
  supabase: SupabaseClient,
  affiliationId: string,
  payload: { status?: string; share_members?: boolean; share_finances?: boolean },
): Promise<Affiliation | null> {
  const { data, error } = await supabase
    .from("affiliations")
    .update(payload)
    .eq("id", affiliationId)
    .select(AFFILIATION_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? serializeAffiliation(data as unknown as AffiliationRow) : null;
}

export async function unlinkAffiliation(
  supabase: SupabaseClient,
  affiliationId: string,
): Promise<boolean> {
  const { data: existing, error } = await supabase
    .from("affiliations")
    .select("id")
    .eq("id", affiliationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!existing) throw new Error("Affiliation introuvable");

  const { error: deleteError } = await supabase
    .from("affiliations")
    .delete()
    .eq("id", affiliationId);
  if (deleteError) throw new Error(deleteError.message);
  return true;
}

// ============================================
// ÉVÉNEMENTS
// ============================================
export async function listEvents(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<CommunityEvent[]> {
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("organization_id", organizationId)
    .order("start_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as unknown as EventRow[]).map(serializeEvent);
}

export async function createEvent(
  supabase: SupabaseClient,
  organizationId: string,
  payload: {
    title: string;
    type: string;
    description?: string;
    start_at: string;
    end_at?: string;
    location: string;
  },
): Promise<CommunityEvent> {
  const { data, error } = await supabase
    .from("events")
    .insert({
      organization_id: organizationId,
      title: payload.title,
      type: payload.type,
      description: payload.description ?? null,
      start_at: new Date(payload.start_at).toISOString(),
      end_at: payload.end_at ? new Date(payload.end_at).toISOString() : null,
      location: payload.location,
    })
    .select(EVENT_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return serializeEvent(data as unknown as EventRow);
}

// ============================================
// ADHÉSIONS PARTAGÉES
// ============================================
export async function listSharedMemberships(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<SharedMembershipRequest[]> {
  const { data, error } = await supabase
    .from("shared_memberships")
    .select(SHARED_COLUMNS)
    .eq("organization_id", organizationId)
    .order("requested_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as unknown as SharedMembershipRow[]).map(serializeSharedMembership);
}

export async function createSharedMembership(
  supabase: SupabaseClient,
  organizationId: string,
  payload: {
    member_name: string;
    email?: string;
    phone?: string;
    source_affiliation_id: string;
    fee_exempt: boolean;
  },
): Promise<SharedMembershipRequest> {
  const { data, error } = await supabase
    .from("shared_memberships")
    .insert({
      organization_id: organizationId,
      member_name: payload.member_name,
      email: payload.email ?? null,
      phone: payload.phone ?? null,
      source_affiliation_id: payload.source_affiliation_id,
      fee_exempt: payload.fee_exempt,
      status: "pending",
      requested_at: new Date().toISOString(),
    })
    .select(SHARED_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return serializeSharedMembership(data as unknown as SharedMembershipRow);
}

export async function decideSharedMembership(
  supabase: SupabaseClient,
  sharedMembershipId: string,
  approve: boolean,
): Promise<SharedMembershipRequest | null> {
  const { data: existing, error } = await supabase
    .from("shared_memberships")
    .select("*")
    .eq("id", sharedMembershipId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!existing) return null;

  if (existing.status === "pending") {
    const { error: updateError } = await supabase
      .from("shared_memberships")
      .update({ status: approve ? "approved" : "rejected" })
      .eq("id", sharedMembershipId);
    if (updateError) throw new Error(updateError.message);
  }

  const { data: updated } = await supabase
    .from("shared_memberships")
    .select(SHARED_COLUMNS)
    .eq("id", sharedMembershipId)
    .maybeSingle();
  return updated
    ? serializeSharedMembership(updated as unknown as SharedMembershipRow)
    : null;
}

// ============================================
// DÉMÉNAGEMENTS
// ============================================
export async function listRelocations(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<MemberRelocation[]> {
  const { data, error } = await supabase
    .from("relocations")
    .select(RELOCATION_COLUMNS)
    .eq("organization_id", organizationId)
    .order("requested_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as unknown as RelocationRow[]).map(serializeRelocation);
}

export async function createRelocation(
  supabase: SupabaseClient,
  organizationId: string,
  payload: {
    member_id: string;
    old_address: string;
    new_address: string;
    new_city: string;
    reason?: string;
  },
): Promise<MemberRelocation> {
  const { data, error } = await supabase
    .from("relocations")
    .insert({
      organization_id: organizationId,
      member_id: payload.member_id,
      old_address: payload.old_address,
      new_address: payload.new_address,
      new_city: payload.new_city,
      reason: payload.reason ?? null,
      status: "pending",
      requested_at: new Date().toISOString(),
      confirmed_at: null,
    })
    .select(RELOCATION_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return serializeRelocation(data as unknown as RelocationRow);
}

export async function confirmRelocation(
  supabase: SupabaseClient,
  relocationId: string,
): Promise<MemberRelocation | null> {
  const { data: existing, error } = await supabase
    .from("relocations")
    .select("*")
    .eq("id", relocationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!existing) return null;

  if (existing.status === "pending") {
    const { data: updated, error: updateError } = await supabase
      .from("relocations")
      .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
      .eq("id", relocationId)
      .select(RELOCATION_COLUMNS)
      .maybeSingle();
    if (updateError) throw new Error(updateError.message);
    if (updated) return serializeRelocation(updated as unknown as RelocationRow);
  }

  const { data: current } = await supabase
    .from("relocations")
    .select(RELOCATION_COLUMNS)
    .eq("id", relocationId)
    .maybeSingle();
  return current ? serializeRelocation(current as unknown as RelocationRow) : null;
}
