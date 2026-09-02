-- ============================================
-- SOCLE : ORGANISATIONS & MEMBRES (Phase 1 backend réel)
-- Appliquer après 0001_user_profiles.sql.
-- ============================================

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'association',
  city text,
  object text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Lien entre un utilisateur authentifié et une organisation (contrôle d'accès).
create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member', -- 'admin' | 'member'
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

-- Annuaire des membres (une personne peut être invitée sans compte auth).
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  name text not null default '',
  email text,
  phone text,
  status text not null default 'pending',
  role text not null default 'member',
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_members_organization on public.members (organization_id);
create index if not exists idx_memberships_user on public.memberships (user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.members enable row level security;

-- Organisations : un utilisateur ne voit que celles dont il est membre.
create policy "organizations_select_member"
  on public.organizations for select
  using (
    exists (
      select 1 from public.memberships m
      where m.organization_id = organizations.id
        and m.user_id = auth.uid()
    )
  );

-- Tout utilisateur authentifié peut créer une organisation (il devient admin juste après).
create policy "organizations_insert_authenticated"
  on public.organizations for insert
  with check (auth.uid() is not null);

create policy "organizations_update_admin"
  on public.organizations for update
  using (
    exists (
      select 1 from public.memberships m
      where m.organization_id = organizations.id
        and m.user_id = auth.uid()
        and m.role = 'admin'
    )
  );

-- Adhésions : on ne gère que sa propre ligne.
create policy "memberships_select_own"
  on public.memberships for select
  using (user_id = auth.uid());

create policy "memberships_insert_own"
  on public.memberships for insert
  with check (user_id = auth.uid());

create policy "memberships_delete_own"
  on public.memberships for delete
  using (user_id = auth.uid());

-- Membres : lecture pour les membres de l'organisation.
create policy "members_select_in_org"
  on public.members for select
  using (
    exists (
      select 1 from public.memberships m
      where m.organization_id = members.organization_id
        and m.user_id = auth.uid()
    )
  );

-- Écriture réservée aux admins de l'organisation.
create policy "members_insert_admin"
  on public.members for insert
  with check (
    exists (
      select 1 from public.memberships m
      where m.organization_id = members.organization_id
        and m.user_id = auth.uid()
        and m.role = 'admin'
    )
  );

-- Auto-adhésion (formulaire public) : l'utilisateur crée sa propre demande en attente.
create policy "members_insert_self_adhesion"
  on public.members for insert
  with check (
    auth.uid() is not null
    and status = 'pending'
    and user_id = auth.uid()
  );

create policy "members_update_admin"
  on public.members for update
  using (
    exists (
      select 1 from public.memberships m
      where m.organization_id = members.organization_id
        and m.user_id = auth.uid()
        and m.role = 'admin'
    )
  );

create policy "members_delete_admin"
  on public.members for delete
  using (
    exists (
      select 1 from public.memberships m
      where m.organization_id = members.organization_id
        and m.user_id = auth.uid()
        and m.role = 'admin'
    )
  );
