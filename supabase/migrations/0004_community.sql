-- ============================================
-- COMMUNITY (Phase 3 backend réel)
-- Appliquer après 0003_finance.sql.
-- ============================================

-- PROJETS
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text not null default '',
  goal_amount integer not null default 0,
  raised_amount integer not null default 0,
  status text not null default 'in_progress',
  relayed_from text,
  relayed_to_affiliates boolean not null default false,
  start_date timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.project_contributions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  contributor_name text not null,
  amount integer not null default 0,
  anonymous boolean not null default false,
  contributed_at timestamptz
);

-- RÉUNIONS
create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  date timestamptz,
  location text not null default '',
  agenda text not null default '',
  status text not null default 'planned',
  minutes text,
  reminder_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.meeting_attendees (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  name text not null,
  status text not null default 'invited',
  checked_in_at timestamptz
);

-- ANNONCES
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  author_name text not null,
  title text not null,
  content text not null default '',
  audience text not null default 'members',
  pinned boolean not null default false,
  relayed_from text,
  created_at timestamptz not null default now()
);

-- DOCUMENTS
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  category text not null default 'other',
  file_name text not null,
  file_type text not null,
  file_size integer not null default 0,
  uploaded_by text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_projects_org on public.projects (organization_id);
create index if not exists idx_contributions_project on public.project_contributions (project_id);
create index if not exists idx_meetings_org on public.meetings (organization_id);
create index if not exists idx_attendees_meeting on public.meeting_attendees (meeting_id);
create index if not exists idx_announcements_org on public.announcements (organization_id);
create index if not exists idx_documents_org on public.documents (organization_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table public.projects enable row level security;
alter table public.project_contributions enable row level security;
alter table public.meetings enable row level security;
alter table public.meeting_attendees enable row level security;
alter table public.announcements enable row level security;
alter table public.documents enable row level security;

-- projects
create policy "projects_select" on public.projects for select
  using (public.is_org_member(organization_id));
create policy "projects_insert" on public.projects for insert
  with check (public.is_org_admin(organization_id));
create policy "projects_update" on public.projects for update
  using (public.is_org_admin(organization_id));

-- project_contributions
create policy "pc_select" on public.project_contributions for select
  using (exists (
    select 1 from public.projects p
    where p.id = project_id and public.is_org_member(p.organization_id)
  ));
create policy "pc_insert" on public.project_contributions for insert
  with check (exists (
    select 1 from public.projects p
    where p.id = project_id and public.is_org_admin(p.organization_id)
  ));

-- meetings
create policy "meetings_select" on public.meetings for select
  using (public.is_org_member(organization_id));
create policy "meetings_insert" on public.meetings for insert
  with check (public.is_org_admin(organization_id));
create policy "meetings_update" on public.meetings for update
  using (public.is_org_admin(organization_id));

-- meeting_attendees
create policy "ma_select" on public.meeting_attendees for select
  using (exists (
    select 1 from public.meetings m
    where m.id = meeting_id and public.is_org_member(m.organization_id)
  ));
create policy "ma_insert" on public.meeting_attendees for insert
  with check (exists (
    select 1 from public.meetings m
    where m.id = meeting_id and public.is_org_admin(m.organization_id)
  ));
create policy "ma_update" on public.meeting_attendees for update
  using (exists (
    select 1 from public.meetings m
    where m.id = meeting_id and public.is_org_admin(m.organization_id)
  ));

-- announcements
create policy "announcements_select" on public.announcements for select
  using (public.is_org_member(organization_id));
create policy "announcements_insert" on public.announcements for insert
  with check (public.is_org_admin(organization_id));

-- documents
create policy "documents_select" on public.documents for select
  using (public.is_org_member(organization_id));
create policy "documents_insert" on public.documents for insert
  with check (public.is_org_admin(organization_id));
