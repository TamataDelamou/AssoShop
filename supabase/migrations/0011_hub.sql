-- ============================================
-- HUB (backend réel)
-- Socle transversal personnel : profil, favoris, coffre-fort,
-- KYC, notifications, préférences, messagerie, file de synchro, parrainage.
-- ============================================

-- Étend user_profiles avec les champs du hub (RG-H04 : engagement partagé avec Finance).
alter table public.user_profiles
  add column if not exists city text not null default '',
  add column if not exists language text not null default 'Français',
  add column if not exists trust_score integer not null default 0,
  add column if not exists kyc_status text not null default 'not_submitted',
  add column if not exists engagement text not null default 'reliable';

-- FAVORIS
create table if not exists public.hub_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null default 'product',
  label text not null default '',
  detail text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists idx_hub_favorites_user on public.hub_favorites (user_id);

-- COFFRE-FORT (documents chiffrés)
create table if not exists public.hub_vault (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default '',
  category text not null default '',
  size integer not null default 0,
  encrypted boolean not null default true,
  uploaded_at timestamptz not null default now()
);
create index if not exists idx_hub_vault_user on public.hub_vault (user_id);

-- KYC
create table if not exists public.hub_kyc (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document_type text not null default '',
  status text not null default 'pending',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists idx_hub_kyc_user on public.hub_kyc (user_id);

-- NOTIFICATIONS
create table if not exists public.hub_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null default '',
  title text not null default '',
  message text not null default '',
  channel text not null default 'in_app',
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_hub_notifications_user on public.hub_notifications (user_id);

-- PRÉFÉRENCES DE NOTIFICATION
create table if not exists public.hub_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  channel text not null default 'in_app',
  event_type text not null default '',
  enabled boolean not null default true
);
create index if not exists idx_hub_preferences_user on public.hub_preferences (user_id);

-- CONVERSATIONS
create table if not exists public.hub_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  participant text not null default '',
  last_message text not null default '',
  unread integer not null default 0,
  updated_at timestamptz not null default now()
);
create index if not exists idx_hub_conversations_user on public.hub_conversations (user_id);

-- MESSAGES
create table if not exists public.hub_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.hub_conversations (id) on delete cascade,
  sender text not null default 'me',
  body text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists idx_hub_messages_conversation on public.hub_messages (conversation_id);

-- FILE DE SYNCHRONISATION HORS-LIGNE
create table if not exists public.hub_sync_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null default '',
  module text not null default '',
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
create index if not exists idx_hub_sync_queue_user on public.hub_sync_queue (user_id);

-- PARRAINAGE
create table if not exists public.hub_referrals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  referred_name text not null default '',
  status text not null default 'pending',
  reward integer not null default 0,
  joined_at timestamptz not null default now()
);
create index if not exists idx_hub_referrals_user on public.hub_referrals (user_id);

-- ============================================
-- RLS : données strictement personnelles
-- ============================================
alter table public.hub_favorites enable row level security;
alter table public.hub_vault enable row level security;
alter table public.hub_kyc enable row level security;
alter table public.hub_notifications enable row level security;
alter table public.hub_preferences enable row level security;
alter table public.hub_conversations enable row level security;
alter table public.hub_messages enable row level security;
alter table public.hub_sync_queue enable row level security;
alter table public.hub_referrals enable row level security;

create policy "hub_favorites_own" on public.hub_favorites
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "hub_vault_own" on public.hub_vault
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "hub_kyc_own" on public.hub_kyc
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "hub_notifications_own" on public.hub_notifications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "hub_preferences_own" on public.hub_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "hub_conversations_own" on public.hub_conversations
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "hub_messages_select_own" on public.hub_messages
  for select using (
    conversation_id in (select id from public.hub_conversations where user_id = auth.uid())
  );
create policy "hub_messages_insert_own" on public.hub_messages
  for insert with check (
    conversation_id in (select id from public.hub_conversations where user_id = auth.uid())
  );
create policy "hub_sync_queue_own" on public.hub_sync_queue
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "hub_referrals_own" on public.hub_referrals
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
