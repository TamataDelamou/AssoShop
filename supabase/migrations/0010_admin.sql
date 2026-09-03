-- ============================================
-- ADMIN (backend réel)
-- Back-office Global Service Groupe : supervision, validation,
-- configuration plateforme. Accès réservé au rôle service_role
-- (RLS activé, aucune politique publique = refus par défaut).
-- ============================================

-- GARDE ADMIN : utilisateurs autorisés sur le back-office
create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

-- RÔLES INTERNES
create table if not exists public.admin_roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  permissions text[] not null default '{}',
  assigned_agents integer not null default 0,
  created_at timestamptz not null default now()
);

-- COMMISSIONS
create table if not exists public.admin_commissions (
  id uuid primary key default gen_random_uuid(),
  service text not null unique,
  rate numeric not null default 0,
  currency text not null default 'GNF',
  created_at timestamptz not null default now()
);

-- PLANS D'ABONNEMENT
create table if not exists public.admin_plans (
  id uuid primary key default gen_random_uuid(),
  tier text not null unique,
  monthly_price integer not null default 0,
  member_limit integer not null default 0,
  currency text not null default 'GNF'
);

-- CONFIGURATION PLATEFORME (singleton)
create table if not exists public.admin_config (
  id integer primary key default 1 check (id = 1),
  platform_name text not null default 'AssoShop',
  support_email text not null default '',
  maintenance_mode boolean not null default false,
  cgu_version text not null default '',
  legal_text text not null default '',
  updated_at timestamptz not null default now()
);

-- PAYS CONFIGURÉS
create table if not exists public.admin_countries (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  currency text not null default '',
  language text not null default '',
  timezone text not null default '',
  tva_rate numeric not null default 0,
  status text not null default 'active'
);

-- OPÉRATEURS MOBILE MONEY
create table if not exists public.admin_operators (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  country text not null default '',
  status text not null default 'active'
);

-- INTÉGRATIONS API PARTENAIRES
create table if not exists public.admin_integrations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  partner text not null default '',
  api_key text not null default '',
  webhook_url text not null default '',
  status text not null default 'active'
);

-- PARTENARIATS ASSURANCE
create table if not exists public.admin_insurance (
  id uuid primary key default gen_random_uuid(),
  insurer text not null unique,
  country text not null default '',
  commission_rate numeric not null default 0,
  status text not null default 'active',
  active_since timestamptz not null default now()
);

-- KYC (vérification d'identité)
create table if not exists public.admin_kyc (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  user_name text not null default '',
  document_type text not null default '',
  status text not null default 'pending',
  submitted_at timestamptz not null default now()
);

-- LITIGES / CONTENTIEUX
create table if not exists public.admin_disputes (
  id uuid primary key default gen_random_uuid(),
  type text not null default '',
  claimant text not null default '',
  respondent text not null default '',
  description text not null default '',
  status text not null default 'open',
  opened_at timestamptz not null default now()
);

-- MODÉRATION DE CONTENU
create table if not exists public.admin_moderation (
  id uuid primary key default gen_random_uuid(),
  type text not null default '',
  title text not null default '',
  author text not null default '',
  reason text not null default '',
  status text not null default 'pending',
  reported_at timestamptz not null default now()
);

-- JOURNAL D'AUDIT
create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor text not null default '',
  action text not null default '',
  module text not null default '',
  severity text not null default 'info',
  created_at timestamptz not null default now()
);

-- AUDIT DE SÉCURITÉ
create table if not exists public.admin_security_audit (
  id uuid primary key default gen_random_uuid(),
  actor text not null default '',
  ip text not null default '',
  action text not null default '',
  result text not null default '',
  created_at timestamptz not null default now()
);

-- FACTURES D'ABONNEMENT
create table if not exists public.admin_invoices (
  id uuid primary key default gen_random_uuid(),
  organization text not null default '',
  plan text not null default '',
  amount integer not null default 0,
  status text not null default '',
  due_at timestamptz
);

-- ============================================
-- RLS : activé, aucune politique publique (service_role uniquement)
-- ============================================
alter table public.platform_admins enable row level security;
alter table public.admin_roles enable row level security;
alter table public.admin_commissions enable row level security;
alter table public.admin_plans enable row level security;
alter table public.admin_config enable row level security;
alter table public.admin_countries enable row level security;
alter table public.admin_operators enable row level security;
alter table public.admin_integrations enable row level security;
alter table public.admin_insurance enable row level security;
alter table public.admin_kyc enable row level security;
alter table public.admin_disputes enable row level security;
alter table public.admin_moderation enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.admin_security_audit enable row level security;
alter table public.admin_invoices enable row level security;

-- ============================================
-- DONNÉES DE CONFIGURATION INITIALES
-- ============================================
insert into public.admin_roles (name, permissions, assigned_agents) values
  ('Administrateur plateforme', '{"supervision","configuration","validation"}', 0),
  ('Modérateur', '{"moderation","litiges"}', 0),
  ('Support', '{"utilisateurs","kyc"}', 0)
on conflict (name) do nothing;

insert into public.admin_commissions (service, rate, currency) values
  ('Paiement mobile money', 1, 'GNF'),
  ('Commission revendeur B2B', 0.7, 'GNF'),
  ('Retrait / transfert', 1, 'GNF')
on conflict (service) do nothing;

insert into public.admin_plans (tier, monthly_price, member_limit, currency) values
  ('Gratuit', 0, 10, 'GNF'),
  ('Standard', 40000, 100, 'GNF'),
  ('Premium', 60000, -1, 'GNF')
on conflict (tier) do nothing;

insert into public.admin_config (id, platform_name, support_email, cgu_version, legal_text) values
  (1, 'AssoShop', 'support@gsg.africa', 'v6.3', 'Conditions générales d''utilisation AssoShop V6.')
on conflict (id) do nothing;

insert into public.admin_countries (code, name, currency, language, timezone, tva_rate, status) values
  ('GN', 'Guinée', 'GNF', 'Français', 'Africa/Conakry', 18, 'active'),
  ('SN', 'Sénégal', 'XOF', 'Français', 'Africa/Dakar', 18, 'active'),
  ('CI', 'Côte d''Ivoire', 'XOF', 'Français', 'Africa/Abidjan', 18, 'active')
on conflict (code) do nothing;

insert into public.admin_operators (name, country, status) values
  ('Orange Money', 'Guinée', 'active'),
  ('MTN Mobile Money', 'Guinée', 'active'),
  ('Wave', 'Sénégal', 'active'),
  ('Moov Money', 'Côte d''Ivoire', 'inactive')
on conflict (name) do nothing;

insert into public.admin_integrations (name, partner, api_key, webhook_url, status) values
  ('ERP comptable', 'Sage', 'assoshop_live_8f3a2', 'https://erp.partner.com/webhooks/assoshop', 'active'),
  ('Banque partenaire', 'Banque CEDEAO', 'assoshop_live_1b7c9', 'https://api.bank.com/webhooks', 'active')
on conflict (name) do nothing;

insert into public.admin_insurance (insurer, country, commission_rate, status) values
  ('Assureur SA', 'Guinée', 5, 'active'),
  ('Mutuelle CEDEAO', 'Sénégal', 4, 'active')
on conflict (insurer) do nothing;
