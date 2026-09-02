-- ============================================
-- FINANCE (Phase 2 backend réel)
-- Appliquer après 0002_organizations_members.sql.
-- ============================================

-- Helpers d'accès (centralisent la vérification d'appartenance à une organisation).
create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_org_admin(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org_id and m.user_id = auth.uid() and m.role = 'admin'
  );
$$;

-- ============================================
-- GROUPES FINANCIERS
-- ============================================
create table if not exists public.financial_groups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  type text not null default 'savings',
  status text not null default 'forming',
  amount integer not null default 0,
  periodicity text not null default 'weekly',
  max_members integer not null default 10,
  goal_amount integer,
  interest_rate integer,
  start_date timestamptz,
  raised_amount integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.financial_groups (id) on delete cascade,
  name text not null,
  role text not null default 'member',
  engagement text not null default 'reliable',
  joined_at timestamptz,
  last_payment_at timestamptz
);

create table if not exists public.group_payments (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.financial_groups (id) on delete cascade,
  member_id uuid references public.group_members (id) on delete set null,
  member_name text not null,
  method text not null default 'cash',
  amount integer not null default 0,
  paid_for_member_name text,
  status text not null default 'pending',
  paid_at timestamptz
);

create table if not exists public.group_turns (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.financial_groups (id) on delete cascade,
  member_id uuid references public.group_members (id) on delete set null,
  member_name text not null,
  position integer not null,
  expected_date timestamptz,
  received boolean not null default false,
  received_at timestamptz
);

create table if not exists public.group_settings (
  group_id uuid primary key references public.financial_groups (id) on delete cascade,
  visibility text not null default 'private',
  allow_join_requests boolean not null default false,
  notify_payment_reminders boolean not null default true
);

-- ============================================
-- PARRAINAGE
-- ============================================
create table if not exists public.sponsorship_requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.financial_groups (id) on delete cascade,
  sponsor_id uuid references public.group_members (id) on delete set null,
  sponsor_name text,
  invitee_name text not null,
  invitee_phone text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- ============================================
-- PRÊTS INTERNES
-- ============================================
create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.financial_groups (id) on delete cascade,
  member_id text not null,
  member_name text not null,
  sponsor_name text,
  amount integer not null default 0,
  suggested_amount integer not null default 0,
  interest_rate integer not null default 0,
  total_due integer not null default 0,
  repaid_amount integer not null default 0,
  status text not null default 'requested',
  requested_at timestamptz,
  sponsor_confirmed_at timestamptz,
  decision_at timestamptz
);

create table if not exists public.loan_installments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans (id) on delete cascade,
  position integer not null,
  due_date timestamptz,
  amount integer not null default 0,
  status text not null default 'pending',
  paid_at timestamptz
);

-- ============================================
-- SOLIDARITÉ / ASSURANCE COMMUNAUTAIRE
-- ============================================
create table if not exists public.guarantee_fund (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  balance integer not null default 0,
  levy_rate numeric(6,4) not null default 0.004,
  cap_amount integer not null default 1000,
  total_collected integer not null default 0,
  total_used integer not null default 0
);

create table if not exists public.insurance_enrollments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  member_id text not null,
  member_name text not null,
  status text not null default 'active',
  joined_at timestamptz
);

create table if not exists public.insurance_claims (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  member_id text not null,
  member_name text not null,
  description text,
  amount integer not null default 0,
  indemnity integer not null default 0,
  status text not null default 'submitted',
  submitted_at timestamptz,
  decided_at timestamptz
);

create index if not exists idx_financial_groups_org on public.financial_groups (organization_id);
create index if not exists idx_group_members_group on public.group_members (group_id);
create index if not exists idx_group_payments_group on public.group_payments (group_id);
create index if not exists idx_group_turns_group on public.group_turns (group_id);
create index if not exists idx_sponsorship_group on public.sponsorship_requests (group_id);
create index if not exists idx_loans_group on public.loans (group_id);
create index if not exists idx_installments_loan on public.loan_installments (loan_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table public.financial_groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_payments enable row level security;
alter table public.group_turns enable row level security;
alter table public.group_settings enable row level security;
alter table public.sponsorship_requests enable row level security;
alter table public.loans enable row level security;
alter table public.loan_installments enable row level security;
alter table public.guarantee_fund enable row level security;
alter table public.insurance_enrollments enable row level security;
alter table public.insurance_claims enable row level security;

-- financial_groups
create policy "fg_select" on public.financial_groups for select
  using (public.is_org_member(organization_id));
create policy "fg_insert" on public.financial_groups for insert
  with check (public.is_org_member(organization_id));
create policy "fg_update" on public.financial_groups for update
  using (public.is_org_admin(organization_id));

-- group_members
create policy "gm_select" on public.group_members for select
  using (exists (
    select 1 from public.financial_groups g
    where g.id = group_id and public.is_org_member(g.organization_id)
  ));
create policy "gm_insert" on public.group_members for insert
  with check (exists (
    select 1 from public.financial_groups g
    where g.id = group_id and public.is_org_admin(g.organization_id)
  ));
create policy "gm_update" on public.group_members for update
  using (exists (
    select 1 from public.financial_groups g
    where g.id = group_id and public.is_org_admin(g.organization_id)
  ));

-- group_payments
create policy "gp_select" on public.group_payments for select
  using (exists (
    select 1 from public.financial_groups g
    where g.id = group_id and public.is_org_member(g.organization_id)
  ));
create policy "gp_insert" on public.group_payments for insert
  with check (exists (
    select 1 from public.financial_groups g
    where g.id = group_id and public.is_org_admin(g.organization_id)
  ));
create policy "gp_update" on public.group_payments for update
  using (exists (
    select 1 from public.financial_groups g
    where g.id = group_id and public.is_org_admin(g.organization_id)
  ));

-- group_turns
create policy "gt_select" on public.group_turns for select
  using (exists (
    select 1 from public.financial_groups g
    where g.id = group_id and public.is_org_member(g.organization_id)
  ));
create policy "gt_insert" on public.group_turns for insert
  with check (exists (
    select 1 from public.financial_groups g
    where g.id = group_id and public.is_org_admin(g.organization_id)
  ));
create policy "gt_update" on public.group_turns for update
  using (exists (
    select 1 from public.financial_groups g
    where g.id = group_id and public.is_org_admin(g.organization_id)
  ));

-- group_settings
create policy "gs_select" on public.group_settings for select
  using (exists (
    select 1 from public.financial_groups g
    where g.id = group_id and public.is_org_member(g.organization_id)
  ));
create policy "gs_insert" on public.group_settings for insert
  with check (exists (
    select 1 from public.financial_groups g
    where g.id = group_id and public.is_org_admin(g.organization_id)
  ));
create policy "gs_update" on public.group_settings for update
  using (exists (
    select 1 from public.financial_groups g
    where g.id = group_id and public.is_org_admin(g.organization_id)
  ));

-- sponsorship_requests
create policy "sr_select" on public.sponsorship_requests for select
  using (exists (
    select 1 from public.financial_groups g
    where g.id = group_id and public.is_org_member(g.organization_id)
  ));
create policy "sr_insert" on public.sponsorship_requests for insert
  with check (exists (
    select 1 from public.financial_groups g
    where g.id = group_id and public.is_org_admin(g.organization_id)
  ));
create policy "sr_update" on public.sponsorship_requests for update
  using (exists (
    select 1 from public.financial_groups g
    where g.id = group_id and public.is_org_admin(g.organization_id)
  ));

-- loans
create policy "loans_select" on public.loans for select
  using (exists (
    select 1 from public.financial_groups g
    where g.id = group_id and public.is_org_member(g.organization_id)
  ));
create policy "loans_insert" on public.loans for insert
  with check (exists (
    select 1 from public.financial_groups g
    where g.id = group_id and public.is_org_admin(g.organization_id)
  ));
create policy "loans_update" on public.loans for update
  using (exists (
    select 1 from public.financial_groups g
    where g.id = group_id and public.is_org_admin(g.organization_id)
  ));

-- loan_installments
create policy "li_select" on public.loan_installments for select
  using (exists (
    select 1 from public.loans l
    join public.financial_groups g on g.id = l.group_id
    where l.id = loan_id and public.is_org_member(g.organization_id)
  ));
create policy "li_insert" on public.loan_installments for insert
  with check (exists (
    select 1 from public.loans l
    join public.financial_groups g on g.id = l.group_id
    where l.id = loan_id and public.is_org_admin(g.organization_id)
  ));
create policy "li_update" on public.loan_installments for update
  using (exists (
    select 1 from public.loans l
    join public.financial_groups g on g.id = l.group_id
    where l.id = loan_id and public.is_org_admin(g.organization_id)
  ));

-- guarantee_fund / insurance_enrollments / insurance_claims
create policy "gf_select" on public.guarantee_fund for select
  using (public.is_org_member(organization_id));
create policy "gf_insert" on public.guarantee_fund for insert
  with check (public.is_org_admin(organization_id));
create policy "gf_update" on public.guarantee_fund for update
  using (public.is_org_admin(organization_id));

create policy "ie_select" on public.insurance_enrollments for select
  using (public.is_org_member(organization_id));
create policy "ie_insert" on public.insurance_enrollments for insert
  with check (public.is_org_admin(organization_id));
create policy "ie_update" on public.insurance_enrollments for update
  using (public.is_org_admin(organization_id));

create policy "ic_select" on public.insurance_claims for select
  using (public.is_org_member(organization_id));
create policy "ic_insert" on public.insurance_claims for insert
  with check (public.is_org_admin(organization_id));
create policy "ic_update" on public.insurance_claims for update
  using (public.is_org_admin(organization_id));
