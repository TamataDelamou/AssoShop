-- ============================================
-- MARKET / MARKETPLACE (backend réel)
-- Module transversal : catalogue, commandes, revendeurs, services, investissement.
-- ============================================

-- REVENDEURS
create table if not exists public.market_resellers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete cascade,
  company_name text not null,
  country text not null default '',
  city text not null default '',
  sector text not null default '',
  rating numeric not null default 0,
  logo_url text,
  validated_at timestamptz,
  created_at timestamptz not null default now()
);

-- CATÉGORIES (arborescence plate, reconstruite en arbre côté API)
create table if not exists public.market_product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  parent_id uuid references public.market_product_categories (id) on delete cascade
);

-- PRODUITS
create table if not exists public.market_products (
  id uuid primary key default gen_random_uuid(),
  reseller_id uuid not null references public.market_resellers (id) on delete cascade,
  category_id uuid references public.market_product_categories (id) on delete set null,
  subcategory_id uuid references public.market_product_categories (id) on delete set null,
  name text not null,
  description text not null default '',
  photos text[] not null default '{}',
  wholesale_price integer not null default 0,
  retail_price integer not null default 0,
  min_order_quantity integer not null default 1,
  stock integer not null default 0,
  country text not null default '',
  city text not null default '',
  currency text not null default 'GNF',
  status text not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_market_products_reseller on public.market_products (reseller_id);

-- COMMANDES
create table if not exists public.market_orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users (id) on delete cascade,
  reseller_id uuid references public.market_resellers (id) on delete set null,
  reseller_name text not null default '',
  total integer not null default 0,
  currency text not null default 'GNF',
  delivery_method text not null default 'pickup',
  delivery_date date,
  delivery_city text not null default '',
  status text not null default 'pending_payment',
  paid boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_market_orders_buyer on public.market_orders (buyer_id);
create index if not exists idx_market_orders_reseller on public.market_orders (reseller_id);

create table if not exists public.market_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.market_orders (id) on delete cascade,
  product_id uuid references public.market_products (id) on delete set null,
  product_name text not null default '',
  quantity integer not null default 1,
  unit_price integer not null default 0,
  currency text not null default 'GNF'
);

create index if not exists idx_market_order_items_order on public.market_order_items (order_id);

-- COMMANDES GROUPÉES
create table if not exists public.market_group_orders (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.market_products (id) on delete set null,
  reseller_id uuid references public.market_resellers (id) on delete set null,
  creator_id uuid references auth.users (id) on delete cascade,
  min_participants integer not null default 1,
  deadline date not null,
  unit_price integer not null default 0,
  currency text not null default 'GNF',
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.market_group_order_participants (
  id uuid primary key default gen_random_uuid(),
  group_order_id uuid not null references public.market_group_orders (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (group_order_id, user_id)
);

-- PORTEFEUILLE
create table if not exists public.market_wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  balance integer not null default 0,
  currency text not null default 'GNF',
  updated_at timestamptz not null default now()
);

-- CANDIDATURE REVENDEUR
create table if not exists public.market_reseller_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  company_name text not null,
  contact_name text not null,
  id_document text not null default '',
  sector text not null default '',
  country text not null default '',
  city text not null default '',
  status text not null default 'pending',
  review_notes text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- AVIS REVENDEUR
create table if not exists public.market_reviews (
  id uuid primary key default gen_random_uuid(),
  reseller_id uuid not null references public.market_resellers (id) on delete cascade,
  author_name text not null default '',
  rating integer not null default 0,
  comment text not null default '',
  created_at timestamptz not null default now()
);

-- PARAMÈTRES REVENDEUR
create table if not exists public.market_reseller_settings (
  id uuid primary key default gen_random_uuid(),
  reseller_id uuid not null unique references public.market_resellers (id) on delete cascade,
  delivery_zones text[] not null default '{}',
  delivery_slots text[] not null default '{}',
  payment_details text not null default '',
  updated_at timestamptz not null default now()
);

-- RETRAITS / SCANS DE COLIS
create table if not exists public.market_pickup_records (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.market_orders (id) on delete cascade,
  tracking_code text not null default '',
  status text not null default 'scanned',
  scanned_at timestamptz,
  delivered_at timestamptz,
  recipient_name text
);

-- SERVICES COMMUNAUTAIRES
create table if not exists public.market_services (
  id uuid primary key default gen_random_uuid(),
  provider_user_id uuid references auth.users (id) on delete set null,
  provider_name text not null default '',
  provider_member boolean not null default false,
  service_type text not null default '',
  title text not null,
  description text not null default '',
  price integer not null default 0,
  currency text not null default 'GNF',
  country text not null default '',
  city text not null default '',
  rating numeric not null default 0,
  reviews_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.market_service_reviews (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.market_services (id) on delete cascade,
  author_name text not null default '',
  rating integer not null default 0,
  comment text not null default '',
  solicited boolean not null default true,
  created_at timestamptz not null default now()
);

-- INVESTISSEMENT COMMUNAUTAIRE
create table if not exists public.market_investment_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  sector text not null default '',
  target_amount integer not null default 0,
  raised_amount integer not null default 0,
  currency text not null default 'GNF',
  profit_sharing_rules text not null default '',
  rules_locked boolean not null default false,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.market_investment_contributions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.market_investment_projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  amount integer not null default 0,
  created_at timestamptz not null default now()
);

-- Helper : l'utilisateur courant est-il propriétaire du compte revendeur ?
create or replace function public.market_is_reseller(reseller_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.market_resellers r
    where r.id = reseller_id and r.user_id = auth.uid()
  );
$$;

-- ============================================
-- RLS
-- ============================================
alter table public.market_resellers enable row level security;
alter table public.market_product_categories enable row level security;
alter table public.market_products enable row level security;
alter table public.market_orders enable row level security;
alter table public.market_order_items enable row level security;
alter table public.market_group_orders enable row level security;
alter table public.market_group_order_participants enable row level security;
alter table public.market_wallets enable row level security;
alter table public.market_reseller_applications enable row level security;
alter table public.market_reviews enable row level security;
alter table public.market_reseller_settings enable row level security;
alter table public.market_pickup_records enable row level security;
alter table public.market_services enable row level security;
alter table public.market_service_reviews enable row level security;
alter table public.market_investment_projects enable row level security;
alter table public.market_investment_contributions enable row level security;

-- Lectures : tout utilisateur authentifié
create policy "market_read_authed" on public.market_resellers for select using (auth.uid() is not null);
create policy "market_read_authed" on public.market_product_categories for select using (auth.uid() is not null);
create policy "market_read_authed" on public.market_products for select using (auth.uid() is not null);
create policy "market_read_authed" on public.market_reviews for select using (auth.uid() is not null);
create policy "market_read_authed" on public.market_services for select using (auth.uid() is not null);
create policy "market_read_authed" on public.market_service_reviews for select using (auth.uid() is not null);
create policy "market_read_authed" on public.market_investment_projects for select using (auth.uid() is not null);
create policy "market_read_authed" on public.market_group_orders for select using (auth.uid() is not null);
create policy "market_read_authed" on public.market_group_order_participants for select using (auth.uid() is not null);

-- Produits : le revendeur gère les siens
create policy "market_products_insert_own" on public.market_products for insert
  with check (public.market_is_reseller(reseller_id));
create policy "market_products_update_own" on public.market_products for update
  using (public.market_is_reseller(reseller_id));

-- Commandes : acheteur (lecture + insertion) et revendeur (lecture + mise à jour)
create policy "market_orders_select" on public.market_orders for select
  using (buyer_id = auth.uid() or public.market_is_reseller(reseller_id));
create policy "market_orders_insert" on public.market_orders for insert
  with check (buyer_id = auth.uid());
create policy "market_orders_update" on public.market_orders for update
  using (buyer_id = auth.uid() or public.market_is_reseller(reseller_id));

create policy "market_order_items_select" on public.market_order_items for select
  using (
    exists (
      select 1 from public.market_orders o
      where o.id = order_id
        and (o.buyer_id = auth.uid() or public.market_is_reseller(o.reseller_id))
    )
  );
create policy "market_order_items_insert" on public.market_order_items for insert
  with check (
    exists (
      select 1 from public.market_orders o
      where o.id = order_id and o.buyer_id = auth.uid()
    )
  );

-- Commandes groupées : tout utilisateur authentifié peut créer/rejoindre
create policy "market_group_orders_insert" on public.market_group_orders for insert
  with check (creator_id = auth.uid());
create policy "market_group_orders_update" on public.market_group_orders for update
  using (auth.uid() is not null);
create policy "market_group_participants_insert" on public.market_group_order_participants for insert
  with check (user_id = auth.uid());

-- Portefeuille : propriétaire uniquement
create policy "market_wallets_select" on public.market_wallets for select using (user_id = auth.uid());
create policy "market_wallets_insert" on public.market_wallets for insert with check (user_id = auth.uid());
create policy "market_wallets_update" on public.market_wallets for update using (user_id = auth.uid());

-- Candidature revendeur : propriétaire uniquement
create policy "market_apps_select" on public.market_reseller_applications for select using (user_id = auth.uid());
create policy "market_apps_insert" on public.market_reseller_applications for insert with check (user_id = auth.uid());
create policy "market_apps_update" on public.market_reseller_applications for update using (user_id = auth.uid());

-- Avis revendeur : tout utilisateur authentifié peut publier
create policy "market_reviews_insert" on public.market_reviews for insert with check (auth.uid() is not null);

-- Paramètres revendeur : propriétaire uniquement
create policy "market_rsettings_select" on public.market_reseller_settings for select
  using (public.market_is_reseller(reseller_id));
create policy "market_rsettings_insert" on public.market_reseller_settings for insert
  with check (public.market_is_reseller(reseller_id));
create policy "market_rsettings_update" on public.market_reseller_settings for update
  using (public.market_is_reseller(reseller_id));

-- Retraits : revendeur concerné uniquement
create policy "market_pickups_select" on public.market_pickup_records for select
  using (
    exists (
      select 1 from public.market_orders o
      where o.id = order_id and public.market_is_reseller(o.reseller_id)
    )
  );
create policy "market_pickups_insert" on public.market_pickup_records for insert
  with check (
    exists (
      select 1 from public.market_orders o
      where o.id = order_id and public.market_is_reseller(o.reseller_id)
    )
  );
create policy "market_pickups_update" on public.market_pickup_records for update
  using (
    exists (
      select 1 from public.market_orders o
      where o.id = order_id and public.market_is_reseller(o.reseller_id)
    )
  );

-- Services : insertion/mise à jour par le prestataire
create policy "market_services_insert" on public.market_services for insert
  with check (provider_user_id = auth.uid());
create policy "market_services_update" on public.market_services for update
  using (provider_user_id = auth.uid());

-- Avis services : tout utilisateur authentifié (RG-M04 vérifié côté API)
create policy "market_sreviews_insert" on public.market_service_reviews for insert
  with check (auth.uid() is not null);

-- Investissement : création/contribution par tout utilisateur authentifié
create policy "market_projects_insert" on public.market_investment_projects for insert
  with check (auth.uid() is not null);
create policy "market_projects_update" on public.market_investment_projects for update
  using (auth.uid() is not null);
create policy "market_contribs_select" on public.market_investment_contributions for select
  using (auth.uid() is not null);
create policy "market_contribs_insert" on public.market_investment_contributions for insert
  with check (user_id = auth.uid());
