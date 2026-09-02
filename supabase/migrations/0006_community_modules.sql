-- ============================================
-- MODULES COMMUNAUTAIRES RESTANTS (Phase 5 backend réel)
-- Appliquer après 0005_accounting.sql.
-- Références inter-modules stockées en text (pas de FK) pour
-- rester compatible avec les identifiants issus des autres phases.
-- ============================================

-- TÂCHES
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  description text not null default '',
  assignee_id text,
  status text not null default 'todo',
  progress integer not null default 0,
  due_date timestamptz,
  created_at timestamptz not null default now()
);

-- RH : PERSONNEL
create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  type text not null default 'employee',
  position text not null default '',
  contract_type text not null default 'cdi',
  status text not null default 'active',
  monthly_salary integer not null default 0,
  hire_date timestamptz
);

create table if not exists public.leaves (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  staff_id text not null,
  reason text not null default '',
  start_date timestamptz,
  end_date timestamptz,
  status text not null default 'pending'
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  staff_id text not null,
  date timestamptz,
  present boolean not null default false
);

create table if not exists public.staff_evaluations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  staff_id text not null,
  period text not null default '',
  rating integer not null default 0,
  comments text not null default '',
  evaluated_at timestamptz
);

-- GOUVERNANCE
create table if not exists public.elections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  position text not null default 'member',
  status text not null default 'open',
  start_date timestamptz,
  end_date timestamptz
);

create table if not exists public.election_candidates (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.elections (id) on delete cascade,
  member_id text not null,
  votes integer not null default 0
);

create table if not exists public.mandates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  label text not null default '',
  start_date timestamptz,
  end_date timestamptz
);

create table if not exists public.mandate_office_holders (
  id uuid primary key default gen_random_uuid(),
  mandate_id uuid not null references public.mandates (id) on delete cascade,
  role text not null default 'member',
  member_name text not null default ''
);

-- SANCTIONS
create table if not exists public.sanctions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  member_id text not null,
  type text not null default 'warning',
  reason text not null default '',
  duration_days integer,
  start_date timestamptz,
  end_date timestamptz,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

-- COTISATIONS
create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  member_id text not null,
  amount integer not null default 0,
  period_label text not null default '',
  due_date timestamptz,
  status text not null default 'due',
  method text,
  paid_at timestamptz,
  paid_by text,
  validated_by text
);

-- CAS SOCIAUX
create table if not exists public.social_cases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  description text not null default '',
  type text not null default 'other',
  status text not null default 'submitted',
  beneficiary_name text not null default '',
  target_amount integer not null default 0,
  collected_amount integer not null default 0,
  currency text not null default 'GNF',
  contributors_visible boolean not null default true,
  committee_note text,
  disbursed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.social_case_contributors (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.social_cases (id) on delete cascade,
  name text not null default '',
  amount integer not null default 0,
  anonymous boolean not null default false,
  contributed_at timestamptz
);

-- BÉNÉFICIAIRES & ÉVALUATIONS
create table if not exists public.beneficiaries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_id text not null,
  name text not null,
  category text not null default 'other',
  status text not null default 'supported',
  registered_at timestamptz
);

create table if not exists public.project_evaluations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_id text not null,
  objectives text not null default '',
  results text not null default '',
  impact text not null default '',
  rating integer not null default 0,
  evaluated_at timestamptz
);

-- ACTIFS
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  category text not null default 'other',
  status text not null default 'available',
  quantity integer not null default 1,
  acquisition_value integer not null default 0,
  acquisition_date timestamptz,
  location text not null default '',
  assigned_to text not null default ''
);

-- ANTENNES
create table if not exists public.antennas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  parent_id text,
  name text not null,
  level text not null default 'communal',
  city text not null default '',
  address text not null default '',
  responsible text not null default '',
  member_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- AFFILIATIONS
create table if not exists public.affiliations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  affiliate_id text not null,
  status text not null default 'pending',
  share_members boolean not null default true,
  share_finances boolean not null default false,
  shared_member_count integer not null default 0,
  linked_at timestamptz
);

-- ÉVÉNEMENTS
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  type text not null default 'other',
  description text,
  start_at timestamptz,
  end_at timestamptz,
  location text not null default '',
  created_at timestamptz not null default now()
);

-- DÉMÉNAGEMENTS
create table if not exists public.relocations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  member_id text not null,
  old_address text not null default '',
  new_address text not null default '',
  new_city text not null default '',
  reason text,
  status text not null default 'pending',
  requested_at timestamptz,
  confirmed_at timestamptz
);

-- MOBILITÉ
create table if not exists public.mobility_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  relocation_id text not null,
  member_id text not null,
  engagement text not null default 'reliable',
  trust_score integer not null default 0,
  contributions_count integer not null default 0,
  meetings_attended integer not null default 0,
  generated_at timestamptz
);

create table if not exists public.transfer_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  relocation_id text not null,
  member_id text not null default '',
  status text not null default 'pending',
  sponsorship text,
  decision_note text,
  decided_by text,
  decided_at timestamptz
);

-- ADHÉSIONS PARTAGÉES
create table if not exists public.shared_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  member_name text not null,
  email text,
  phone text,
  source_affiliation_id text not null,
  fee_exempt boolean not null default false,
  status text not null default 'pending',
  requested_at timestamptz
);

-- SIGNATURES
create table if not exists public.signature_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  type text not null default 'minutes',
  title text not null default '',
  description text not null default '',
  amount integer,
  requested_by text not null default '',
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.signature_signatories (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.signature_requests (id) on delete cascade,
  name text not null default '',
  role text not null default '',
  signed_at timestamptz
);

-- PARAMÈTRES DE L'ASSOCIATION (une ligne par organisation)
create table if not exists public.organization_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  members_visible_to_affiliates boolean not null default true,
  financial_details_visible_to_affiliates boolean not null default false,
  contributors_visible_in_social_cases boolean not null default false,
  validation_mode text not null default 'manual',
  sponsorship_required boolean not null default false,
  updated_at timestamptz,
  unique (organization_id)
);

create index if not exists idx_tasks_org on public.tasks (organization_id);
create index if not exists idx_staff_org on public.staff (organization_id);
create index if not exists idx_leaves_org on public.leaves (organization_id);
create index if not exists idx_attendance_org on public.attendance (organization_id);
create index if not exists idx_staff_evals_org on public.staff_evaluations (organization_id);
create index if not exists idx_elections_org on public.elections (organization_id);
create index if not exists idx_sanctions_org on public.sanctions (organization_id);
create index if not exists idx_contributions_org on public.contributions (organization_id);
create index if not exists idx_social_cases_org on public.social_cases (organization_id);
create index if not exists idx_beneficiaries_org on public.beneficiaries (organization_id);
create index if not exists idx_evaluations_org on public.project_evaluations (organization_id);
create index if not exists idx_assets_org on public.assets (organization_id);
create index if not exists idx_antennas_org on public.antennas (organization_id);
create index if not exists idx_affiliations_org on public.affiliations (organization_id);
create index if not exists idx_events_org on public.events (organization_id);
create index if not exists idx_relocations_org on public.relocations (organization_id);
create index if not exists idx_mobility_org on public.mobility_reports (organization_id);
create index if not exists idx_transfer_org on public.transfer_decisions (organization_id);
create index if not exists idx_shared_memberships_org on public.shared_memberships (organization_id);
create index if not exists idx_signatures_org on public.signature_requests (organization_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table public.tasks enable row level security;
alter table public.staff enable row level security;
alter table public.leaves enable row level security;
alter table public.attendance enable row level security;
alter table public.staff_evaluations enable row level security;
alter table public.elections enable row level security;
alter table public.election_candidates enable row level security;
alter table public.mandates enable row level security;
alter table public.mandate_office_holders enable row level security;
alter table public.sanctions enable row level security;
alter table public.contributions enable row level security;
alter table public.social_cases enable row level security;
alter table public.social_case_contributors enable row level security;
alter table public.beneficiaries enable row level security;
alter table public.project_evaluations enable row level security;
alter table public.assets enable row level security;
alter table public.antennas enable row level security;
alter table public.affiliations enable row level security;
alter table public.events enable row level security;
alter table public.relocations enable row level security;
alter table public.mobility_reports enable row level security;
alter table public.transfer_decisions enable row level security;
alter table public.shared_memberships enable row level security;
alter table public.signature_requests enable row level security;
alter table public.signature_signatories enable row level security;
alter table public.organization_settings enable row level security;

-- Tâches
create policy "tasks_select" on public.tasks for select using (public.is_org_member(organization_id));
create policy "tasks_insert" on public.tasks for insert with check (public.is_org_admin(organization_id));
create policy "tasks_update" on public.tasks for update using (public.is_org_admin(organization_id));

-- RH
create policy "staff_select" on public.staff for select using (public.is_org_member(organization_id));
create policy "staff_insert" on public.staff for insert with check (public.is_org_admin(organization_id));
create policy "staff_update" on public.staff for update using (public.is_org_admin(organization_id));
create policy "leaves_select" on public.leaves for select using (public.is_org_member(organization_id));
create policy "leaves_insert" on public.leaves for insert with check (public.is_org_admin(organization_id));
create policy "leaves_update" on public.leaves for update using (public.is_org_admin(organization_id));
create policy "attendance_select" on public.attendance for select using (public.is_org_member(organization_id));
create policy "attendance_insert" on public.attendance for insert with check (public.is_org_admin(organization_id));
create policy "attendance_update" on public.attendance for update using (public.is_org_admin(organization_id));
create policy "se_select" on public.staff_evaluations for select using (public.is_org_member(organization_id));
create policy "se_insert" on public.staff_evaluations for insert with check (public.is_org_admin(organization_id));

-- Gouvernance
create policy "elections_select" on public.elections for select using (public.is_org_member(organization_id));
create policy "elections_update" on public.elections for update using (public.is_org_admin(organization_id));
create policy "ec_select" on public.election_candidates for select using (exists (
  select 1 from public.elections e where e.id = election_id and public.is_org_member(e.organization_id)
));
create policy "ec_insert" on public.election_candidates for insert with check (exists (
  select 1 from public.elections e where e.id = election_id and public.is_org_member(e.organization_id)
));
create policy "ec_update" on public.election_candidates for update using (exists (
  select 1 from public.elections e where e.id = election_id and public.is_org_member(e.organization_id)
));
create policy "mandates_select" on public.mandates for select using (public.is_org_member(organization_id));
create policy "moh_select" on public.mandate_office_holders for select using (exists (
  select 1 from public.mandates m where m.id = mandate_id and public.is_org_member(m.organization_id)
));

-- Sanctions
create policy "sanctions_select" on public.sanctions for select using (public.is_org_member(organization_id));
create policy "sanctions_insert" on public.sanctions for insert with check (public.is_org_admin(organization_id));
create policy "sanctions_update" on public.sanctions for update using (public.is_org_admin(organization_id));

-- Cotisations
create policy "contrib_select" on public.contributions for select using (public.is_org_member(organization_id));
create policy "contrib_insert" on public.contributions for insert with check (public.is_org_member(organization_id));
create policy "contrib_update" on public.contributions for update using (public.is_org_admin(organization_id));

-- Cas sociaux
create policy "sc_select" on public.social_cases for select using (public.is_org_member(organization_id));
create policy "sc_insert" on public.social_cases for insert with check (public.is_org_admin(organization_id));
create policy "sc_update" on public.social_cases for update using (public.is_org_member(organization_id));
create policy "scc_select" on public.social_case_contributors for select using (exists (
  select 1 from public.social_cases c where c.id = case_id and public.is_org_member(c.organization_id)
));
create policy "scc_insert" on public.social_case_contributors for insert with check (exists (
  select 1 from public.social_cases c where c.id = case_id and public.is_org_member(c.organization_id)
));

-- Bénéficiaires & évaluations
create policy "benef_select" on public.beneficiaries for select using (public.is_org_member(organization_id));
create policy "benef_insert" on public.beneficiaries for insert with check (public.is_org_admin(organization_id));
create policy "benef_update" on public.beneficiaries for update using (public.is_org_admin(organization_id));
create policy "pe_select" on public.project_evaluations for select using (public.is_org_member(organization_id));
create policy "pe_insert" on public.project_evaluations for insert with check (public.is_org_admin(organization_id));

-- Actifs
create policy "assets_select" on public.assets for select using (public.is_org_member(organization_id));
create policy "assets_insert" on public.assets for insert with check (public.is_org_admin(organization_id));
create policy "assets_update" on public.assets for update using (public.is_org_admin(organization_id));

-- Antennes
create policy "antennas_select" on public.antennas for select using (public.is_org_member(organization_id));
create policy "antennas_insert" on public.antennas for insert with check (public.is_org_admin(organization_id));

-- Affiliations
create policy "aff_select" on public.affiliations for select using (public.is_org_member(organization_id));
create policy "aff_insert" on public.affiliations for insert with check (public.is_org_admin(organization_id));
create policy "aff_update" on public.affiliations for update using (public.is_org_admin(organization_id));
create policy "aff_delete" on public.affiliations for delete using (public.is_org_admin(organization_id));

-- Événements
create policy "events_select" on public.events for select using (public.is_org_member(organization_id));
create policy "events_insert" on public.events for insert with check (public.is_org_admin(organization_id));

-- Déménagements
create policy "reloc_select" on public.relocations for select using (public.is_org_member(organization_id));
create policy "reloc_insert" on public.relocations for insert with check (public.is_org_member(organization_id));
create policy "reloc_update" on public.relocations for update using (public.is_org_admin(organization_id));

-- Mobilité
create policy "mr_select" on public.mobility_reports for select using (public.is_org_member(organization_id));
create policy "mr_insert" on public.mobility_reports for insert with check (public.is_org_admin(organization_id));
create policy "mr_update" on public.mobility_reports for update using (public.is_org_admin(organization_id));
create policy "td_select" on public.transfer_decisions for select using (public.is_org_member(organization_id));
create policy "td_insert" on public.transfer_decisions for insert with check (public.is_org_admin(organization_id));
create policy "td_update" on public.transfer_decisions for update using (public.is_org_admin(organization_id));

-- Adhésions partagées
create policy "sm_select" on public.shared_memberships for select using (public.is_org_member(organization_id));
create policy "sm_insert" on public.shared_memberships for insert with check (public.is_org_member(organization_id));
create policy "sm_update" on public.shared_memberships for update using (public.is_org_admin(organization_id));

-- Signatures
create policy "sig_select" on public.signature_requests for select using (public.is_org_member(organization_id));
create policy "sig_insert" on public.signature_requests for insert with check (public.is_org_admin(organization_id));
create policy "sig_update" on public.signature_requests for update using (public.is_org_member(organization_id));
create policy "ss_select" on public.signature_signatories for select using (exists (
  select 1 from public.signature_requests r where r.id = request_id and public.is_org_member(r.organization_id)
));
create policy "ss_insert" on public.signature_signatories for insert with check (exists (
  select 1 from public.signature_requests r where r.id = request_id and public.is_org_admin(r.organization_id)
));
create policy "ss_update" on public.signature_signatories for update using (exists (
  select 1 from public.signature_requests r where r.id = request_id and public.is_org_member(r.organization_id)
));

-- Paramètres
create policy "os_select" on public.organization_settings for select using (public.is_org_member(organization_id));
create policy "os_insert" on public.organization_settings for insert with check (public.is_org_admin(organization_id));
create policy "os_update" on public.organization_settings for update using (public.is_org_admin(organization_id));
