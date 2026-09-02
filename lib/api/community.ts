import type { SupabaseClient } from "@supabase/supabase-js";
import {
  Announcement,
  AssociationDocument,
  CommunityProject,
  Meeting,
} from "@/types/modules/community";

// ============================================
// TYPES LIGNES (sorties SQL)
// ============================================
interface ContributionRow {
  id: string;
  contributor_name: string;
  amount: number | string;
  anonymous: boolean;
  contributed_at: string | null;
}

interface ProjectRow {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  goal_amount: number | string;
  raised_amount: number | string;
  status: string;
  relayed_from: string | null;
  relayed_to_affiliates: boolean;
  start_date: string | null;
  created_at: string | null;
  contributions: ContributionRow[] | null;
}

interface AttendeeRow {
  id: string;
  name: string;
  status: string;
  checked_in_at: string | null;
}

interface MeetingRow {
  id: string;
  organization_id: string;
  title: string;
  date: string | null;
  location: string;
  agenda: string;
  status: string;
  minutes: string | null;
  reminder_enabled: boolean;
  created_at: string | null;
  attendees: AttendeeRow[] | null;
}

interface AnnouncementRow {
  id: string;
  organization_id: string;
  author_name: string;
  title: string;
  content: string;
  audience: string;
  pinned: boolean;
  relayed_from: string | null;
  created_at: string | null;
}

interface DocumentRow {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  category: string;
  file_name: string;
  file_type: string;
  file_size: number | string;
  uploaded_by: string;
  created_at: string | null;
}

// ============================================
// SÉRIALISATION
// ============================================
export function serializeProject(row: ProjectRow): CommunityProject {
  return {
    id: row.id,
    organization_id: row.organization_id,
    name: row.name,
    description: row.description,
    goal_amount: Number(row.goal_amount),
    raised_amount: Number(row.raised_amount),
    status: row.status as CommunityProject["status"],
    relayed_from: row.relayed_from ?? null,
    relayed_to_affiliates: row.relayed_to_affiliates,
    start_date: row.start_date ? new Date(row.start_date) : null,
    created_at: row.created_at ? new Date(row.created_at) : null,
    contributions: (row.contributions ?? []).map((c) => ({
      id: c.id,
      contributor_name: c.contributor_name,
      amount: Number(c.amount),
      anonymous: c.anonymous,
      contributed_at: c.contributed_at ? new Date(c.contributed_at) : null,
    })),
  };
}

export function serializeMeeting(row: MeetingRow): Meeting {
  return {
    id: row.id,
    organization_id: row.organization_id,
    title: row.title,
    date: row.date ? new Date(row.date) : null,
    location: row.location,
    agenda: row.agenda,
    status: row.status as Meeting["status"],
    minutes: row.minutes ?? null,
    reminder_enabled: row.reminder_enabled,
    created_at: row.created_at ? new Date(row.created_at) : null,
    attendees: (row.attendees ?? []).map((a) => ({
      id: a.id,
      name: a.name,
      status: a.status as Meeting["attendees"][number]["status"],
      checked_in_at: a.checked_in_at ? new Date(a.checked_in_at) : null,
    })),
  };
}

export function serializeAnnouncement(row: AnnouncementRow): Announcement {
  return {
    id: row.id,
    organization_id: row.organization_id,
    author_name: row.author_name,
    title: row.title,
    content: row.content,
    audience: row.audience as Announcement["audience"],
    pinned: row.pinned,
    relayed_from: row.relayed_from ?? null,
    created_at: row.created_at ? new Date(row.created_at) : null,
  };
}

export function serializeDocument(row: DocumentRow): AssociationDocument {
  return {
    id: row.id,
    organization_id: row.organization_id,
    name: row.name,
    description: row.description ?? null,
    category: row.category as AssociationDocument["category"],
    file_name: row.file_name,
    file_type: row.file_type,
    file_size: Number(row.file_size),
    uploaded_by: row.uploaded_by,
    created_at: row.created_at ? new Date(row.created_at) : null,
  };
}

// ============================================
// COLONNES DE SÉLECTION
// ============================================
const PROJECT_COLUMNS = [
  "id",
  "organization_id",
  "name",
  "description",
  "goal_amount",
  "raised_amount",
  "status",
  "relayed_from",
  "relayed_to_affiliates",
  "start_date",
  "created_at",
  "contributions:project_contributions(id, contributor_name, amount, anonymous, contributed_at)",
].join(", ");

const MEETING_COLUMNS = [
  "id",
  "organization_id",
  "title",
  "date",
  "location",
  "agenda",
  "status",
  "minutes",
  "reminder_enabled",
  "created_at",
  "attendees:meeting_attendees(id, name, status, checked_in_at)",
].join(", ");

const ANNOUNCEMENT_COLUMNS = [
  "id",
  "organization_id",
  "author_name",
  "title",
  "content",
  "audience",
  "pinned",
  "relayed_from",
  "created_at",
].join(", ");

const DOCUMENT_COLUMNS = [
  "id",
  "organization_id",
  "name",
  "description",
  "category",
  "file_name",
  "file_type",
  "file_size",
  "uploaded_by",
  "created_at",
].join(", ");

// ============================================
// PROJETS
// ============================================
async function fetchProject(
  supabase: SupabaseClient,
  projectId: string,
): Promise<CommunityProject | null> {
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_COLUMNS)
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? serializeProject(data as unknown as ProjectRow) : null;
}

export async function listProjects(
  supabase: SupabaseClient,
  organizationId: string,
  search = "",
  status = "",
): Promise<CommunityProject[]> {
  let query = supabase
    .from("projects")
    .select(PROJECT_COLUMNS)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (status && status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let projects = (data as unknown as ProjectRow[]).map(serializeProject);

  if (search) {
    const needle = search.toLowerCase();
    projects = projects.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.description.toLowerCase().includes(needle),
    );
  }

  return projects;
}

export async function createProject(
  supabase: SupabaseClient,
  organizationId: string,
  payload: {
    name: string;
    description: string;
    goal_amount: number;
    relayed_to_affiliates: boolean;
  },
): Promise<CommunityProject> {
  const { data, error } = await supabase
    .from("projects")
    .insert({
      organization_id: organizationId,
      name: payload.name,
      description: payload.description,
      goal_amount: payload.goal_amount,
      raised_amount: 0,
      status: "in_progress",
      relayed_from: null,
      relayed_to_affiliates: payload.relayed_to_affiliates,
      start_date: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const created = await fetchProject(supabase, data.id);
  if (!created) throw new Error("Projet introuvable après création");
  return created;
}

export async function contributeToProject(
  supabase: SupabaseClient,
  projectId: string,
  payload: {
    contributor_name: string;
    amount: number;
    anonymous: boolean;
  },
): Promise<CommunityProject | null> {
  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!project) return null;

  const { error: contributionError } = await supabase
    .from("project_contributions")
    .insert({
      project_id: projectId,
      contributor_name: payload.anonymous
        ? "Donateur anonyme"
        : payload.contributor_name,
      amount: payload.amount,
      anonymous: payload.anonymous,
      contributed_at: new Date().toISOString(),
    });
  if (contributionError) throw new Error(contributionError.message);

  const raised = Number(project.raised_amount) + payload.amount;
  const completed = raised >= Number(project.goal_amount);
  const { error: updateError } = await supabase
    .from("projects")
    .update({
      raised_amount: raised,
      status: completed ? "completed" : project.status,
    })
    .eq("id", projectId);
  if (updateError) throw new Error(updateError.message);

  return fetchProject(supabase, projectId);
}

// ============================================
// RÉUNIONS
// ============================================
async function fetchMeeting(
  supabase: SupabaseClient,
  meetingId: string,
): Promise<Meeting | null> {
  const { data, error } = await supabase
    .from("meetings")
    .select(MEETING_COLUMNS)
    .eq("id", meetingId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? serializeMeeting(data as unknown as MeetingRow) : null;
}

export async function listMeetings(
  supabase: SupabaseClient,
  organizationId: string,
  search = "",
  status = "",
): Promise<Meeting[]> {
  let query = supabase
    .from("meetings")
    .select(MEETING_COLUMNS)
    .eq("organization_id", organizationId)
    .order("date", { ascending: false });

  if (status && status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let meetings = (data as unknown as MeetingRow[]).map(serializeMeeting);

  if (search) {
    const needle = search.toLowerCase();
    meetings = meetings.filter(
      (m) =>
        m.title.toLowerCase().includes(needle) ||
        m.location.toLowerCase().includes(needle),
    );
  }

  return meetings;
}

export async function planMeeting(
  supabase: SupabaseClient,
  organizationId: string,
  payload: {
    title: string;
    date: string;
    location: string;
    agenda: string;
    reminder_enabled: boolean;
  },
): Promise<Meeting> {
  const { data, error } = await supabase
    .from("meetings")
    .insert({
      organization_id: organizationId,
      title: payload.title,
      date: new Date(payload.date).toISOString(),
      location: payload.location,
      agenda: payload.agenda,
      status: "planned",
      minutes: null,
      reminder_enabled: payload.reminder_enabled,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const created = await fetchMeeting(supabase, data.id);
  if (!created) throw new Error("Réunion introuvable après création");
  return created;
}

export async function saveMinutes(
  supabase: SupabaseClient,
  meetingId: string,
  minutes: string,
): Promise<Meeting | null> {
  const { error } = await supabase
    .from("meetings")
    .update({ minutes, status: "completed" })
    .eq("id", meetingId);
  if (error) throw new Error(error.message);
  return fetchMeeting(supabase, meetingId);
}

export async function checkInAttendee(
  supabase: SupabaseClient,
  meetingId: string,
  attendeeId: string,
  status: string,
): Promise<Meeting | null> {
  const { data: attendee, error } = await supabase
    .from("meeting_attendees")
    .select("*")
    .eq("id", attendeeId)
    .eq("meeting_id", meetingId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!attendee) return null;

  const present = status === "present";
  const { error: updateError } = await supabase
    .from("meeting_attendees")
    .update({
      status,
      checked_in_at: present ? new Date().toISOString() : null,
    })
    .eq("id", attendeeId);
  if (updateError) throw new Error(updateError.message);

  return fetchMeeting(supabase, meetingId);
}

// ============================================
// ANNONCES
// ============================================
export async function listAnnouncements(
  supabase: SupabaseClient,
  organizationId: string,
  search = "",
): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from("announcements")
    .select(ANNOUNCEMENT_COLUMNS)
    .eq("organization_id", organizationId)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  let items = (data as unknown as AnnouncementRow[]).map(serializeAnnouncement);

  if (search) {
    const needle = search.toLowerCase();
    items = items.filter(
      (a) =>
        a.title.toLowerCase().includes(needle) ||
        a.content.toLowerCase().includes(needle),
    );
  }

  return items;
}

export async function publishAnnouncement(
  supabase: SupabaseClient,
  organizationId: string,
  payload: {
    title: string;
    content: string;
    audience: string;
    pinned: boolean;
  },
): Promise<Announcement> {
  const { data, error } = await supabase
    .from("announcements")
    .insert({
      organization_id: organizationId,
      author_name: "Bureau de l'association",
      title: payload.title,
      content: payload.content,
      audience: payload.audience,
      pinned: payload.pinned,
      relayed_from: null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return serializeAnnouncement(data as unknown as AnnouncementRow);
}

// ============================================
// DOCUMENTS
// ============================================
export async function listDocuments(
  supabase: SupabaseClient,
  organizationId: string,
  search = "",
  category = "",
): Promise<AssociationDocument[]> {
  let query = supabase
    .from("documents")
    .select(DOCUMENT_COLUMNS)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (category && category !== "all") query = query.eq("category", category);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let items = (data as unknown as DocumentRow[]).map(serializeDocument);

  if (search) {
    const needle = search.toLowerCase();
    items = items.filter(
      (d) =>
        d.name.toLowerCase().includes(needle) ||
        (d.description ?? "").toLowerCase().includes(needle),
    );
  }

  return items;
}

export async function uploadDocument(
  supabase: SupabaseClient,
  organizationId: string,
  payload: {
    name: string;
    description?: string;
    category: string;
    file_name: string;
    file_type: string;
    file_size: number;
  },
): Promise<AssociationDocument> {
  const { data, error } = await supabase
    .from("documents")
    .insert({
      organization_id: organizationId,
      name: payload.name,
      description: payload.description ?? null,
      category: payload.category,
      file_name: payload.file_name,
      file_type: payload.file_type,
      file_size: payload.file_size,
      uploaded_by: "Bureau de l'association",
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return serializeDocument(data as unknown as DocumentRow);
}
