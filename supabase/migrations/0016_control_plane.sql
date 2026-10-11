-- ============================================================================
-- 0016 — Intégration au Control Plane GSG (Kernel = super-admin / hub de
-- tableaux de bord). Directive d'architecture « Mutation du rôle du Kernel ».
--
-- AssoShop ne dépend plus du Kernel pour l'authentification ni pour les
-- référentiels : il lui remonte ses métriques et ses journaux d'audit, et
-- l'autorise à l'interroger via des jetons inter-services.
--
--  1. control_plane_outbox      : file d'envoi fiable (pattern outbox) vers
--                                 les endpoints d'agrégation du Kernel.
--  2. Triggers d'audit          : chaque entrée des journaux d'audit admin et
--                                 sécurité est automatiquement mise en file.
--  3. control_plane_access_log  : traçabilité des appels entrants du Kernel
--                                 + anti-rejeu (jti unique).
--  4. cp_claim_outbox()         : réservation concurrente d'un lot à envoyer.
--  5. cp_metrics_snapshot()     : calcul des métriques clés en base.
--
-- Toutes les tables : RLS activé sans politique (service_role uniquement).
-- ============================================================================

-- 1. FILE D'ENVOI ------------------------------------------------------------
create table if not exists public.control_plane_outbox (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('audit_log', 'metrics_snapshot')),
  payload jsonb not null,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists control_plane_outbox_due_idx
  on public.control_plane_outbox (status, next_attempt_at);

-- 2. MISE EN FILE AUTOMATIQUE DES JOURNAUX D'AUDIT ---------------------------
create or replace function public.cp_enqueue_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.control_plane_outbox (kind, payload)
  values (
    'audit_log',
    jsonb_build_object(
      'source', tg_argv[0],
      'id', new.id,
      'occurred_at', new.created_at,
      'record', to_jsonb(new)
    )
  );
  return new;
end;
$$;

drop trigger if exists cp_enqueue_admin_audit on public.admin_audit_logs;
create trigger cp_enqueue_admin_audit
  after insert on public.admin_audit_logs
  for each row execute function public.cp_enqueue_audit('admin');

drop trigger if exists cp_enqueue_security_audit on public.admin_security_audit;
create trigger cp_enqueue_security_audit
  after insert on public.admin_security_audit
  for each row execute function public.cp_enqueue_audit('security');

-- 3. JOURNAL DES ACCÈS ENTRANTS (anti-rejeu) ---------------------------------
create table if not exists public.control_plane_access_log (
  id uuid primary key default gen_random_uuid(),
  jti text not null unique,
  issuer text not null default '',
  subject text not null default '',
  scope text not null default '',
  path text not null default '',
  ip text not null default '',
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists control_plane_access_log_created_idx
  on public.control_plane_access_log (created_at);

-- 4. RÉSERVATION D'UN LOT (concurrence sûre, bail de 2 minutes) --------------
create or replace function public.cp_claim_outbox(batch_size integer)
returns setof public.control_plane_outbox
language sql
security definer
set search_path = public
as $$
  update public.control_plane_outbox o
     set next_attempt_at = now() + interval '2 minutes'
   where o.id in (
     select id
       from public.control_plane_outbox
      where status = 'pending'
        and next_attempt_at <= now()
      order by created_at
      limit greatest(batch_size, 1)
      for update skip locked
   )
  returning o.*;
$$;

-- 5. MÉTRIQUES CLÉS (agrégées en base, aucune donnée personnelle) ------------
create or replace function public.cp_metrics_snapshot()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'organizations_total',      (select count(*) from organizations),
    'organizations_active',     (select count(*) from organizations where status = 'active'),
    'members_total',            (select count(*) from members),
    'members_active',           (select count(*) from members where status = 'active'),
    'users_total',              (select count(*) from user_profiles),
    'contributions_paid_amount',(select coalesce(sum(amount), 0) from contributions where status = 'paid'),
    'contributions_overdue_count', (select count(*) from contributions where status = 'overdue'),
    'social_cases_open',        (select count(*) from social_cases where status in ('submitted', 'under_review', 'approved')),
    'social_cases_collected_amount', (select coalesce(sum(collected_amount), 0) from social_cases),
    'financial_groups_active',  (select count(*) from financial_groups where status = 'active'),
    'loans_active_count',       (select count(*) from loans where status = 'approved'),
    'loans_outstanding_amount', (select coalesce(sum(greatest(total_due - repaid_amount, 0)), 0) from loans where status = 'approved'),
    'pay_transactions_24h_count',  (select count(*) from pay_transactions where status = 'confirmed' and created_at >= now() - interval '24 hours'),
    'pay_transactions_24h_volume', (select coalesce(sum(amount), 0) from pay_transactions where status = 'confirmed' and created_at >= now() - interval '24 hours'),
    'pay_commissions_24h',         (select coalesce(sum(commission), 0) from pay_transactions where status = 'confirmed' and created_at >= now() - interval '24 hours'),
    'market_orders_24h_count',  (select count(*) from market_orders where status <> 'cancelled' and created_at >= now() - interval '24 hours'),
    'market_gmv_24h',           (select coalesce(sum(total), 0) from market_orders where status <> 'cancelled' and created_at >= now() - interval '24 hours'),
    'kyc_pending',              (select count(*) from admin_kyc where status = 'pending'),
    'disputes_open',            (select count(*) from admin_disputes where status = 'open'),
    'outbox_pending',           (select count(*) from control_plane_outbox where status = 'pending'),
    'outbox_failed',            (select count(*) from control_plane_outbox where status = 'failed')
  );
$$;

-- RLS + droits ----------------------------------------------------------------
alter table public.control_plane_outbox enable row level security;
alter table public.control_plane_access_log enable row level security;

revoke all on function public.cp_claim_outbox(integer) from public, anon, authenticated;
revoke all on function public.cp_metrics_snapshot() from public, anon, authenticated;
revoke all on function public.cp_enqueue_audit() from public, anon, authenticated;
grant execute on function public.cp_claim_outbox(integer) to service_role;
grant execute on function public.cp_metrics_snapshot() to service_role;
