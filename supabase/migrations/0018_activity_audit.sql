-- ============================================================================
-- 0018 — Journal d'audit des actions métier (cahier v6 §14 : « journalisation
-- de toutes les actions sensibles — paiements, validations, retraits,
-- modifications de rôle — à des fins d'audit et de non-répudiation »).
-- Appliquer après 0017_wallet_integrity.sql.
--
-- La journalisation se fait EN BASE, par triggers : aucune action ne peut y
-- échapper, même hors API.
--
--  1. audit_events            : journal en ajout seul (ni UPDATE ni DELETE).
--  2. audit_log_event()       : écriture générique (security definer).
--  3. Triggers métier         : paiements, cotisations, prêts, groupes, cas
--                               sociaux, comptabilité, membres, signatures.
--  4. Control Plane           : mise en file automatique (source 'activity')
--                               + compteur audit_events_24h.
--
-- before / after ne contiennent que le statut, le rôle et quelques
-- identifiants techniques : jamais de nom, de téléphone ni de pièce KYC.
-- ============================================================================

-- 1. JOURNAL -----------------------------------------------------------------
-- Pas de clé étrangère vers organizations : le journal doit survivre à la
-- suppression de l'organisation ou de l'entité tracée (non-répudiation).
create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  actor_id uuid,
  event_type text not null check (event_type in (
    'pay.payment',
    'pay.topup',
    'pay.withdrawal',
    'pay.transfer',
    'contribution.validated',
    'contribution.rejected',
    'loan.approved',
    'loan.rejected',
    'loan.repaid',
    'loan.installment_repaid',
    'group_payment.validated',
    'social_case.under_review',
    'social_case.approved',
    'social_case.funded',
    'social_case.disbursed',
    'social_case.rejected',
    'accounting_entry.validated',
    'accounting_entry.rejected',
    'member.role_changed',
    'member.status_changed',
    'member.removed',
    'signature.signed',
    'signature.rejected'
  )),
  entity_type text not null,
  entity_id uuid not null,
  amount integer,
  currency text,
  before jsonb,
  after jsonb,
  -- clock_timestamp() : deux événements d'une même transaction gardent un
  -- horodatage distinct (pagination par created_at).
  created_at timestamptz not null default clock_timestamp()
);

create index if not exists audit_events_org_created_idx
  on public.audit_events (organization_id, created_at desc);
create index if not exists audit_events_created_idx
  on public.audit_events (created_at);

-- Ajout seul : toute modification ou suppression est refusée, y compris pour
-- le service_role.
create or replace function public.audit_events_immutable()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'audit_events est en ajout seul (% interdit)', tg_op
    using errcode = 'AU001';
end;
$$;

drop trigger if exists audit_events_no_update_delete on public.audit_events;
create trigger audit_events_no_update_delete
  before update or delete on public.audit_events
  for each row execute function public.audit_events_immutable();

drop trigger if exists audit_events_no_truncate on public.audit_events;
create trigger audit_events_no_truncate
  before truncate on public.audit_events
  for each statement execute function public.audit_events_immutable();

-- RLS : lecture réservée aux admins de l'organisation concernée ; aucune
-- politique INSERT / UPDATE / DELETE. Les événements sans organisation
-- (portefeuille personnel) ne sont lisibles que par le service_role.
alter table public.audit_events enable row level security;

drop policy if exists "audit_events_select_admin" on public.audit_events;
create policy "audit_events_select_admin"
  on public.audit_events for select
  using (
    organization_id is not null
    and public.is_org_admin(organization_id)
  );

revoke all on public.audit_events from anon, authenticated;
grant select on public.audit_events to authenticated;

-- 2. ÉCRITURE GÉNÉRIQUE ------------------------------------------------------
create or replace function public.audit_log_event(
  p_organization_id uuid,
  p_event_type text,
  p_entity_type text,
  p_entity_id uuid,
  p_amount integer default null,
  p_currency text default null,
  p_before jsonb default null,
  p_after jsonb default null
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.audit_events
    (organization_id, actor_id, event_type, entity_type, entity_id, amount, currency, before, after)
  values
    (p_organization_id, auth.uid(), p_event_type, p_entity_type, p_entity_id,
     p_amount, p_currency, p_before, p_after);
$$;

-- 3. TRIGGERS MÉTIER ---------------------------------------------------------

-- Paiements (pay_transactions.type : topup / withdrawal / transfer / payment).
create or replace function public.audit_pay_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.type in ('payment', 'topup', 'withdrawal', 'transfer') then
    perform public.audit_log_event(
      null, 'pay.' || new.type, 'pay_transaction', new.id,
      new.amount, new.currency, null,
      jsonb_build_object('status', new.status, 'commission', new.commission, 'module', new.module)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists audit_pay_transaction on public.pay_transactions;
create trigger audit_pay_transaction
  after insert on public.pay_transactions
  for each row execute function public.audit_pay_transaction();

-- Cotisations : passage à paid (validation) ou rejected.
create or replace function public.audit_contribution()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('paid', 'rejected') then
    perform public.audit_log_event(
      new.organization_id,
      case new.status when 'paid' then 'contribution.validated' else 'contribution.rejected' end,
      'contribution', new.id, new.amount, null,
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists audit_contribution on public.contributions;
create trigger audit_contribution
  after update of status on public.contributions
  for each row when (old.status is distinct from new.status)
  execute function public.audit_contribution();

-- Prêts : approved / rejected / repaid (organisation via le groupe financier).
create or replace function public.audit_loan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  if new.status in ('approved', 'rejected', 'repaid') then
    select g.organization_id into v_org
    from public.financial_groups g where g.id = new.group_id;

    perform public.audit_log_event(
      v_org, 'loan.' || new.status, 'loan', new.id, new.amount, null,
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists audit_loan on public.loans;
create trigger audit_loan
  after update of status on public.loans
  for each row when (old.status is distinct from new.status)
  execute function public.audit_loan();

-- Échéances de prêt : passage à paid.
create or replace function public.audit_loan_installment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  if new.status = 'paid' then
    select g.organization_id into v_org
    from public.loans l
    join public.financial_groups g on g.id = l.group_id
    where l.id = new.loan_id;

    perform public.audit_log_event(
      v_org, 'loan.installment_repaid', 'loan_installment', new.id, new.amount, null,
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status, 'loan_id', new.loan_id)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists audit_loan_installment on public.loan_installments;
create trigger audit_loan_installment
  after update of status on public.loan_installments
  for each row when (old.status is distinct from new.status)
  execute function public.audit_loan_installment();

-- Versements de groupe : validation (pending -> confirmed, RG-F05).
create or replace function public.audit_group_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  if new.status = 'confirmed' then
    select g.organization_id into v_org
    from public.financial_groups g where g.id = new.group_id;

    perform public.audit_log_event(
      v_org, 'group_payment.validated', 'group_payment', new.id, new.amount, null,
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists audit_group_payment on public.group_payments;
create trigger audit_group_payment
  after update of status on public.group_payments
  for each row when (old.status is distinct from new.status)
  execute function public.audit_group_payment();

-- Cas sociaux : social_case.<statut>. Montant : collecté une fois financé ou
-- décaissé, objectif sinon.
create or replace function public.audit_social_case()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('under_review', 'approved', 'funded', 'disbursed', 'rejected') then
    perform public.audit_log_event(
      new.organization_id, 'social_case.' || new.status, 'social_case', new.id,
      case when new.status in ('funded', 'disbursed') then new.collected_amount else new.target_amount end,
      new.currency,
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists audit_social_case on public.social_cases;
create trigger audit_social_case
  after update of status on public.social_cases
  for each row when (old.status is distinct from new.status)
  execute function public.audit_social_case();

-- Écritures comptables : validation (confirmed) ou rejet (rejected).
create or replace function public.audit_accounting_entry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('confirmed', 'rejected') then
    perform public.audit_log_event(
      new.organization_id,
      case new.status when 'confirmed' then 'accounting_entry.validated' else 'accounting_entry.rejected' end,
      'accounting_entry', new.id, new.amount, null,
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status, 'entry_type', new.entry_type)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists audit_accounting_entry on public.accounting_entries;
create trigger audit_accounting_entry
  after update of status on public.accounting_entries
  for each row when (old.status is distinct from new.status)
  execute function public.audit_accounting_entry();

-- Membres : changement de rôle, de statut, suppression.
create or replace function public.audit_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.audit_log_event(
      old.organization_id, 'member.removed', 'member', old.id, null, null,
      jsonb_build_object('role', old.role, 'status', old.status), null
    );
    return old;
  end if;

  if old.role is distinct from new.role then
    perform public.audit_log_event(
      new.organization_id, 'member.role_changed', 'member', new.id, null, null,
      jsonb_build_object('role', old.role),
      jsonb_build_object('role', new.role)
    );
  end if;
  if old.status is distinct from new.status then
    perform public.audit_log_event(
      new.organization_id, 'member.status_changed', 'member', new.id, null, null,
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists audit_member on public.members;
create trigger audit_member
  after update or delete on public.members
  for each row execute function public.audit_member();

-- Signatures : un signataire signe (signed_at renseigné).
create or replace function public.audit_signature_signatory()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.signature_requests;
begin
  if old.signed_at is null and new.signed_at is not null then
    select * into v_request
    from public.signature_requests r where r.id = new.request_id;

    perform public.audit_log_event(
      v_request.organization_id, 'signature.signed', 'signature_request', new.request_id,
      v_request.amount, null, null,
      jsonb_build_object('signatory_id', new.id, 'role', new.role, 'type', v_request.type)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists audit_signature_signatory on public.signature_signatories;
create trigger audit_signature_signatory
  after update of signed_at on public.signature_signatories
  for each row execute function public.audit_signature_signatory();

-- Signatures : refus de la demande (status -> rejected).
create or replace function public.audit_signature_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'rejected' then
    perform public.audit_log_event(
      new.organization_id, 'signature.rejected', 'signature_request', new.id,
      new.amount, null,
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status, 'type', new.type)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists audit_signature_request on public.signature_requests;
create trigger audit_signature_request
  after update of status on public.signature_requests
  for each row when (old.status is distinct from new.status)
  execute function public.audit_signature_request();

-- 4. CONTROL PLANE -----------------------------------------------------------
-- Chaque événement du journal est mis en file vers le Kernel (source 'activity').
drop trigger if exists cp_enqueue_activity_audit on public.audit_events;
create trigger cp_enqueue_activity_audit
  after insert on public.audit_events
  for each row execute function public.cp_enqueue_audit('activity');

-- Métriques : même liste que 0016, plus audit_events_24h.
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
    'audit_events_24h',         (select count(*) from audit_events where created_at >= now() - interval '24 hours'),
    'outbox_pending',           (select count(*) from control_plane_outbox where status = 'pending'),
    'outbox_failed',            (select count(*) from control_plane_outbox where status = 'failed')
  );
$$;

-- Droits : les fonctions d'audit ne sont jamais appelables par les clients.
revoke all on function public.audit_log_event(uuid, text, text, uuid, integer, text, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.audit_events_immutable() from public, anon, authenticated;
revoke all on function public.audit_pay_transaction() from public, anon, authenticated;
revoke all on function public.audit_contribution() from public, anon, authenticated;
revoke all on function public.audit_loan() from public, anon, authenticated;
revoke all on function public.audit_loan_installment() from public, anon, authenticated;
revoke all on function public.audit_group_payment() from public, anon, authenticated;
revoke all on function public.audit_social_case() from public, anon, authenticated;
revoke all on function public.audit_accounting_entry() from public, anon, authenticated;
revoke all on function public.audit_member() from public, anon, authenticated;
revoke all on function public.audit_signature_signatory() from public, anon, authenticated;
revoke all on function public.audit_signature_request() from public, anon, authenticated;
revoke all on function public.cp_metrics_snapshot() from public, anon, authenticated;
grant execute on function public.cp_metrics_snapshot() to service_role;
