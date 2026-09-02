-- ============================================
-- PAY (backend réel)
-- Orchestration des paiements : portefeuilles, transactions,
-- moyens de paiement, réconciliation, paramètres.
-- ============================================

-- PORTEFEUILLES
create table if not exists public.pay_wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null default 'personal',
  label text not null default '',
  currency text not null default 'GNF',
  balance integer not null default 0,
  last_known_balance integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pay_wallets_user on public.pay_wallets (user_id);

-- TRANSACTIONS
create table if not exists public.pay_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  wallet_id uuid references public.pay_wallets (id) on delete set null,
  type text not null default 'payment',
  status text not null default 'confirmed',
  amount integer not null default 0,
  currency text not null default 'GNF',
  counterparty text not null default '',
  description text not null default '',
  commission integer not null default 0,
  reference text not null unique,
  module text not null default 'pay',
  created_at timestamptz not null default now()
);

create index if not exists idx_pay_transactions_user on public.pay_transactions (user_id);

-- MOYENS DE PAIEMENT
create table if not exists public.pay_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null default '',
  phone text not null default '',
  is_default boolean not null default false,
  country text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_pay_methods_user on public.pay_methods (user_id);

-- RÉCONCILIATION
create table if not exists public.pay_reconciliation (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  transaction_id uuid references public.pay_transactions (id) on delete set null,
  reference text not null default '',
  amount integer not null default 0,
  currency text not null default 'GNF',
  operator text not null default '',
  operator_reference text not null default '',
  status text not null default 'unmatched',
  ai_note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_pay_reconciliation_user on public.pay_reconciliation (user_id);

-- PARAMÈTRES DE PAIEMENT
create table if not exists public.pay_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  default_provider text not null default '',
  max_transaction_amount integer not null default 5000000,
  alerts_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ============================================
-- RLS : données strictement personnelles (propriétaire uniquement)
-- ============================================
alter table public.pay_wallets enable row level security;
alter table public.pay_transactions enable row level security;
alter table public.pay_methods enable row level security;
alter table public.pay_reconciliation enable row level security;
alter table public.pay_settings enable row level security;

create policy "pay_wallets_select" on public.pay_wallets for select using (user_id = auth.uid());
create policy "pay_wallets_insert" on public.pay_wallets for insert with check (user_id = auth.uid());
create policy "pay_wallets_update" on public.pay_wallets for update using (user_id = auth.uid());

create policy "pay_transactions_select" on public.pay_transactions for select using (user_id = auth.uid());
create policy "pay_transactions_insert" on public.pay_transactions for insert with check (user_id = auth.uid());

create policy "pay_methods_select" on public.pay_methods for select using (user_id = auth.uid());
create policy "pay_methods_insert" on public.pay_methods for insert with check (user_id = auth.uid());
create policy "pay_methods_update" on public.pay_methods for update using (user_id = auth.uid());

create policy "pay_reconciliation_select" on public.pay_reconciliation for select using (user_id = auth.uid());
create policy "pay_reconciliation_insert" on public.pay_reconciliation for insert with check (user_id = auth.uid());
create policy "pay_reconciliation_update" on public.pay_reconciliation for update using (user_id = auth.uid());

create policy "pay_settings_select" on public.pay_settings for select using (user_id = auth.uid());
create policy "pay_settings_insert" on public.pay_settings for insert with check (user_id = auth.uid());
create policy "pay_settings_update" on public.pay_settings for update using (user_id = auth.uid());
