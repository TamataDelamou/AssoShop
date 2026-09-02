-- ============================================
-- COMPTABILITÉ & TRÉSORERIE (Phase 4 backend réel)
-- Appliquer après 0004_community.sql.
-- ============================================

-- ÉCRITURES COMPTABLES
create table if not exists public.accounting_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  source text not null default 'manual',
  account_type text not null default 'cash',
  entry_type text not null default 'income',
  label text not null,
  amount integer not null default 0,
  payer_name text not null default '',
  beneficiary_name text not null default '',
  justification text,
  status text not null default 'pending',
  requires_double_validation boolean not null default false,
  validated_by text,
  second_validated_by text,
  created_at timestamptz not null default now(),
  validated_at timestamptz
);

-- FLUX DES AUTRES MODULES EN ATTENTE DE CONSOLIDATION
create table if not exists public.consolidation_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  source text not null default 'manual',
  label text not null,
  account_type text not null default 'cash',
  entry_type text not null default 'income',
  amount integer not null default 0,
  payer_name text not null default '',
  beneficiary_name text not null default '',
  date timestamptz,
  consolidated boolean not null default false
);

-- RELEVÉ BANCAIRE (RAPPROCHEMENT)
create table if not exists public.reconciliation_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  account_type text not null default 'bank',
  label text not null,
  amount integer not null default 0,
  date timestamptz,
  matched_entry_id uuid references public.accounting_entries (id) on delete set null
);

-- BUDGET PRÉVISIONNEL PAR ORIGINE
create table if not exists public.budget_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  source text not null default 'manual',
  planned_income integer not null default 0,
  planned_expense integer not null default 0,
  unique (organization_id, source)
);

-- TRANSACTIONS DE TRÉSORERIE
create table if not exists public.treasury_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  type text not null default 'income',
  label text not null,
  amount integer not null default 0,
  account text not null default 'cash',
  date timestamptz,
  reference text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_accounting_org on public.accounting_entries (organization_id);
create index if not exists idx_consolidation_org on public.consolidation_movements (organization_id);
create index if not exists idx_reconciliation_org on public.reconciliation_lines (organization_id);
create index if not exists idx_treasury_org on public.treasury_transactions (organization_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table public.accounting_entries enable row level security;
alter table public.consolidation_movements enable row level security;
alter table public.reconciliation_lines enable row level security;
alter table public.budget_lines enable row level security;
alter table public.treasury_transactions enable row level security;

-- accounting_entries
create policy "ae_select" on public.accounting_entries for select
  using (public.is_org_member(organization_id));
create policy "ae_insert" on public.accounting_entries for insert
  with check (public.is_org_admin(organization_id));
create policy "ae_update" on public.accounting_entries for update
  using (public.is_org_admin(organization_id));

-- consolidation_movements
create policy "cm_select" on public.consolidation_movements for select
  using (public.is_org_member(organization_id));
create policy "cm_insert" on public.consolidation_movements for insert
  with check (public.is_org_admin(organization_id));
create policy "cm_update" on public.consolidation_movements for update
  using (public.is_org_admin(organization_id));

-- reconciliation_lines
create policy "rl_select" on public.reconciliation_lines for select
  using (public.is_org_member(organization_id));
create policy "rl_insert" on public.reconciliation_lines for insert
  with check (public.is_org_admin(organization_id));
create policy "rl_update" on public.reconciliation_lines for update
  using (public.is_org_admin(organization_id));

-- budget_lines
create policy "bl_select" on public.budget_lines for select
  using (public.is_org_member(organization_id));
create policy "bl_insert" on public.budget_lines for insert
  with check (public.is_org_admin(organization_id));
create policy "bl_update" on public.budget_lines for update
  using (public.is_org_admin(organization_id));

-- treasury_transactions
create policy "tt_select" on public.treasury_transactions for select
  using (public.is_org_member(organization_id));
create policy "tt_insert" on public.treasury_transactions for insert
  with check (public.is_org_admin(organization_id));
