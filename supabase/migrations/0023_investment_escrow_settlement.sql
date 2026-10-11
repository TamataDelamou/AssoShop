-- ============================================================================
-- 0023 — Séquestre des investissements : dénouement « tout ou rien ».
-- Appliquer après 0022_reseller_transfer_investment.sql.
--
--  1. Objectif atteint à la date limite : le séquestre est versé au porteur
--     du projet, moins la « Commission investissement » créditée au
--     portefeuille plateforme.
--  2. Objectif non atteint à la date limite (ou projet abandonné par son
--     porteur) : chaque investisseur est remboursé intégralement.
--  3. Bénéfices : le porteur déclare un montant à distribuer, un
--     administrateur de la plateforme valide, la répartition se fait au
--     prorata des mises (règles figées, RG-M05).
--  4. Échéance : market_settle_due_investments(), appelée par le
--     planificateur avec la clé service_role. Idempotente : un projet dénoué
--     (settled_at) ou une contribution remboursée (refunded_at) ne l'est
--     jamais une seconde fois.
--
-- Ordre de verrouillage : projet, portefeuilles utilisateurs (par id),
-- séquestre, portefeuille plateforme.
-- Aucun code d'erreur ajouté : PY001 à PY019 (lib/api/pay-rpc.ts).
-- ============================================================================

-- 1. SCHÉMA ------------------------------------------------------------------

-- Statuts d'un projet : open (en collecte), completed (objectif atteint, en
-- attente de l'échéance), funded (séquestre versé au porteur), refunded
-- (investisseurs remboursés), closed (clôturé sans fonds à dénouer).
alter table public.market_investment_projects
  add column if not exists deadline date,
  add column if not exists settled_at timestamptz,
  add column if not exists released_amount integer,
  add column if not exists commission_amount integer;

alter table public.market_investment_contributions
  add column if not exists refunded_at timestamptz,
  add column if not exists refund_transaction_id uuid
    references public.pay_transactions (id) on delete set null;

-- Bénéfices déclarés par le porteur, validés par un administrateur.
create table if not exists public.market_investment_distributions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.market_investment_projects (id) on delete restrict,
  declared_by uuid references auth.users (id) on delete set null,
  amount integer not null check (amount > 0),
  distributed_amount integer,
  currency text not null default 'GNF',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_notes text,
  reviewed_by uuid references auth.users (id) on delete set null,
  declared_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists idx_market_distributions_project
  on public.market_investment_distributions (project_id);

-- Une seule déclaration en attente par projet.
create unique index if not exists idx_market_distributions_pending
  on public.market_investment_distributions (project_id)
  where status = 'pending';

-- Part versée à chaque investisseur lors d'une distribution.
create table if not exists public.market_investment_distribution_shares (
  id uuid primary key default gen_random_uuid(),
  distribution_id uuid not null references public.market_investment_distributions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  stake integer not null,
  amount integer not null,
  transaction_id uuid references public.pay_transactions (id) on delete set null,
  unique (distribution_id, user_id)
);

alter table public.market_investment_distributions enable row level security;
alter table public.market_investment_distribution_shares enable row level security;

-- Lecture seule pour les clients : les déclarations sont publiques comme les
-- projets ; une part n'est visible que de son bénéficiaire et du porteur.
drop policy if exists "market_distributions_select" on public.market_investment_distributions;
create policy "market_distributions_select" on public.market_investment_distributions
  for select using (auth.uid() is not null);

drop policy if exists "market_distribution_shares_select" on public.market_investment_distribution_shares;
create policy "market_distribution_shares_select" on public.market_investment_distribution_shares
  for select using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.market_investment_distributions d
      join public.market_investment_projects p on p.id = d.project_id
      where d.id = distribution_id and p.created_by = auth.uid()
    )
  );

revoke all on public.market_investment_distributions from anon, authenticated;
revoke all on public.market_investment_distribution_shares from anon, authenticated;
grant select on public.market_investment_distributions to authenticated;
grant select on public.market_investment_distribution_shares to authenticated;

-- Commission prélevée au versement du séquestre (taux en %). Alignée sur le
-- cahier : « Financement participatif (frais de service sur contributions) :
-- 1 % », dans la fourchette de RG-P03.
insert into public.admin_commissions (service, rate, currency) values
  ('Commission investissement', 1, 'GNF')
on conflict (service) do nothing;

-- 2. JOURNAL D'AUDIT ---------------------------------------------------------

-- Liste complète des event_type (0019 + investment.*).
alter table public.audit_events
  drop constraint if exists audit_events_event_type_check;
alter table public.audit_events
  add constraint audit_events_event_type_check check (event_type in (
    'pay.payment',
    'pay.topup',
    'pay.topup_confirmed',
    'pay.withdrawal',
    'pay.transfer',
    'market.order_paid',
    'investment.released',
    'investment.refunded',
    'investment.profit_distributed',
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
  ));

-- 3. PROJET : DATE LIMITE ----------------------------------------------------

-- Taux affiché avant tout investissement (RG-P03).
create or replace function public.market_investment_commission_rate()
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select c.rate from public.admin_commissions c
  where c.service = 'Commission investissement';
$$;

-- Création : comme 0021, plus la date limite de collecte (obligatoire, dans le
-- futur) et un montant recherché strictement positif.
drop function if exists public.market_create_investment_project(text, text, text, integer, text, text);

create or replace function public.market_create_investment_project(
  p_name text,
  p_description text default '',
  p_sector text default '',
  p_target_amount integer default 0,
  p_currency text default 'GNF',
  p_profit_sharing_rules text default '',
  p_deadline date default null
)
returns public.market_investment_projects
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_project public.market_investment_projects;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;
  if coalesce(trim(p_name), '') = '' or coalesce(p_target_amount, 0) <= 0 then
    raise exception 'Projet invalide' using errcode = 'PY009';
  end if;
  if p_deadline is null or p_deadline <= current_date then
    raise exception 'Date limite invalide' using errcode = 'PY009';
  end if;

  insert into public.market_investment_projects
    (name, description, sector, target_amount, raised_amount, currency,
     profit_sharing_rules, rules_locked, status, created_by, deadline)
  values
    (trim(p_name), coalesce(p_description, ''), coalesce(p_sector, ''), p_target_amount, 0,
     coalesce(nullif(p_currency, ''), 'GNF'), coalesce(p_profit_sharing_rules, ''), false, 'open',
     v_user, p_deadline)
  returning * into v_project;

  return v_project;
end;
$$;

-- Contribution payée : comme 0022, plus le refus après la date limite.
create or replace function public.market_invest(p_project_id uuid, p_amount integer)
returns public.market_investment_projects
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_project public.market_investment_projects;
  v_raised bigint;
  v_wallet_id uuid;
  v_escrow_id uuid;
  v_wallet public.pay_wallets;
  v_escrow public.pay_wallets;
  v_balance integer;
  v_tx_id uuid;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Montant invalide' using errcode = 'PY001';
  end if;

  select * into v_project
  from public.market_investment_projects where id = p_project_id
  for update;
  if v_project.id is null then
    raise exception 'Projet introuvable' using errcode = 'PY018';
  end if;
  if v_project.status <> 'open' or v_project.settled_at is not null then
    raise exception 'Le projet n''est plus ouvert à l''investissement' using errcode = 'PY019';
  end if;
  if v_project.deadline is not null and current_date > v_project.deadline then
    raise exception 'La date limite de collecte est dépassée' using errcode = 'PY019';
  end if;

  v_raised := v_project.raised_amount::bigint + p_amount;
  if v_raised > 2147483647 then
    raise exception 'Montant invalide' using errcode = 'PY001';
  end if;

  v_wallet_id := public.pay_ensure_wallet_for(v_user);
  v_escrow_id := public.pay_ensure_escrow_wallet(v_project.id, v_project.currency);

  select * into v_wallet from public.pay_wallets where id = v_wallet_id for update;
  select * into v_escrow from public.pay_wallets where id = v_escrow_id for update;

  if v_wallet.currency <> v_project.currency or v_escrow.currency <> v_project.currency then
    raise exception 'Devises incompatibles' using errcode = 'PY015';
  end if;
  if v_wallet.balance < p_amount then
    raise exception 'Solde insuffisant' using errcode = 'PY003';
  end if;
  if v_escrow.balance::bigint + p_amount > 2147483647 then
    raise exception 'Montant invalide' using errcode = 'PY001';
  end if;

  v_balance := v_wallet.balance - p_amount;
  update public.pay_wallets
  set balance = v_balance, last_known_balance = v_balance, updated_at = now()
  where id = v_wallet.id;

  v_balance := v_escrow.balance + p_amount;
  update public.pay_wallets
  set balance = v_balance, last_known_balance = v_balance, updated_at = now()
  where id = v_escrow.id;

  insert into public.pay_transactions
    (user_id, wallet_id, type, status, amount, currency, counterparty, description, commission, reference, module)
  values
    (v_user, v_wallet.id, 'payment', 'confirmed', p_amount, v_project.currency,
     v_project.name, 'Investissement dans un projet', 0,
     public.pay_generate_reference(), 'market')
  returning id into v_tx_id;

  insert into public.market_investment_contributions (project_id, user_id, amount, transaction_id)
  values (v_project.id, v_user, p_amount, v_tx_id);

  update public.market_investment_projects
  set raised_amount = v_raised::integer,
      rules_locked = true,
      status = case when v_raised >= target_amount then 'completed' else 'open' end
  where id = v_project.id
  returning * into v_project;

  return v_project;
end;
$$;

-- 4. DÉNOUEMENT DU SÉQUESTRE -------------------------------------------------

-- Interne : dénoue un projet. Renvoie 'released' (versé au porteur),
-- 'refunded' (investisseurs remboursés), 'expired' (échu sans contribution)
-- ou 'skipped' (déjà dénoué, ou échéance non atteinte).
create or replace function public.market_settle_investment_project(p_project_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project public.market_investment_projects;
  v_total bigint;
  v_count integer;
  v_refund boolean;
  v_rate numeric;
  v_commission integer;
  v_net integer;
  v_owner_wallet_id uuid;
  v_owner_wallet public.pay_wallets;
  v_escrow public.pay_wallets;
  v_investor uuid;
  v_line record;
  v_tx_id uuid;
begin
  select * into v_project
  from public.market_investment_projects where id = p_project_id
  for update;
  if v_project.id is null then
    raise exception 'Projet introuvable' using errcode = 'PY018';
  end if;

  -- Idempotence : un projet dénoué ne l'est jamais une seconde fois.
  if v_project.settled_at is not null then
    return 'skipped';
  end if;
  -- Un projet abandonné par son porteur est dénoué sans attendre l'échéance.
  if v_project.status <> 'closed'
     and (v_project.deadline is null or current_date <= v_project.deadline) then
    return 'skipped';
  end if;

  select coalesce(sum(c.amount), 0), count(*) into v_total, v_count
  from public.market_investment_contributions c
  where c.project_id = v_project.id and c.refunded_at is null;

  if v_total = 0 then
    update public.market_investment_projects
    set status = 'closed', settled_at = now()
    where id = v_project.id;
    return 'expired';
  end if;

  -- Tout ou rien : objectif non atteint, projet abandonné ou porteur sans
  -- compte = remboursement.
  v_refund := v_project.status = 'closed'
    or v_total < v_project.target_amount
    or v_project.created_by is null;

  if v_refund then
    for v_investor in
      select distinct c.user_id
      from public.market_investment_contributions c
      where c.project_id = v_project.id and c.refunded_at is null
    loop
      perform public.pay_ensure_wallet_for(v_investor);
    end loop;

    perform 1 from public.pay_wallets w
    where w.type = 'personal' and w.user_id in (
      select c.user_id from public.market_investment_contributions c
      where c.project_id = v_project.id and c.refunded_at is null
    )
    order by w.id
    for update;

    select * into v_escrow
    from public.pay_wallets where project_id = v_project.id and type = 'escrow'
    for update;
    if v_escrow.id is null or v_escrow.balance <> v_total then
      raise exception 'Séquestre incohérent avec les contributions' using errcode = 'PY019';
    end if;

    for v_line in
      select c.id, c.user_id, c.amount, w.id as wallet_id, w.currency
      from public.market_investment_contributions c
      join public.pay_wallets w on w.user_id = c.user_id and w.type = 'personal'
      where c.project_id = v_project.id and c.refunded_at is null
      order by c.created_at, c.id
    loop
      if v_line.currency <> v_project.currency then
        raise exception 'Devises incompatibles' using errcode = 'PY015';
      end if;

      update public.pay_wallets
      set balance = balance + v_line.amount,
          last_known_balance = balance + v_line.amount,
          updated_at = now()
      where id = v_line.wallet_id;

      insert into public.pay_transactions
        (user_id, wallet_id, type, status, amount, currency, counterparty, description, commission, reference, module)
      values
        (v_line.user_id, v_line.wallet_id, 'receipt', 'confirmed', v_line.amount, v_project.currency,
         v_project.name, 'Remboursement d''investissement', 0,
         public.pay_generate_reference(), 'market')
      returning id into v_tx_id;

      update public.market_investment_contributions
      set refunded_at = now(), refund_transaction_id = v_tx_id
      where id = v_line.id;
    end loop;

    update public.pay_wallets
    set balance = 0, last_known_balance = 0, updated_at = now()
    where id = v_escrow.id;

    update public.market_investment_projects
    set status = 'refunded', settled_at = now()
    where id = v_project.id;

    perform public.audit_log_event(
      null, 'investment.refunded', 'investment_project', v_project.id,
      v_total::integer, v_project.currency,
      jsonb_build_object('status', v_project.status),
      jsonb_build_object('status', 'refunded', 'contributions', v_count)
    );
    return 'refunded';
  end if;

  -- Objectif atteint : versement au porteur, commission à la plateforme.
  v_rate := public.market_investment_commission_rate();
  if v_rate is null or v_rate < 0 or v_rate > 100 then
    raise exception 'Commission investissement non configurée' using errcode = 'PY010';
  end if;
  v_commission := public.market_commission(v_total::integer, v_rate);
  v_net := v_total::integer - v_commission;

  v_owner_wallet_id := public.pay_ensure_wallet_for(v_project.created_by);
  select * into v_owner_wallet from public.pay_wallets where id = v_owner_wallet_id for update;

  select * into v_escrow
  from public.pay_wallets where project_id = v_project.id and type = 'escrow'
  for update;
  if v_escrow.id is null or v_escrow.balance <> v_total then
    raise exception 'Séquestre incohérent avec les contributions' using errcode = 'PY019';
  end if;
  if v_owner_wallet.currency <> v_project.currency then
    raise exception 'Devises incompatibles' using errcode = 'PY015';
  end if;
  if v_owner_wallet.balance::bigint + v_net > 2147483647 then
    raise exception 'Montant invalide' using errcode = 'PY001';
  end if;

  update public.pay_wallets
  set balance = balance + v_net, last_known_balance = balance + v_net, updated_at = now()
  where id = v_owner_wallet.id;

  update public.pay_wallets
  set balance = 0, last_known_balance = 0, updated_at = now()
  where id = v_escrow.id;

  insert into public.pay_transactions
    (user_id, wallet_id, type, status, amount, currency, counterparty, description, commission, reference, module)
  values
    (v_project.created_by, v_owner_wallet.id, 'receipt', 'confirmed', v_net, v_project.currency,
     v_project.name, 'Versement du séquestre d''investissement (commission déduite)', v_commission,
     public.pay_generate_reference(), 'market');

  perform public.pay_credit_platform(v_commission);

  update public.market_investment_projects
  set status = 'funded', settled_at = now(),
      released_amount = v_net, commission_amount = v_commission
  where id = v_project.id;

  perform public.audit_log_event(
    null, 'investment.released', 'investment_project', v_project.id,
    v_total::integer, v_project.currency,
    jsonb_build_object('status', v_project.status),
    jsonb_build_object('status', 'funded', 'commission', v_commission, 'net', v_net, 'contributions', v_count)
  );
  return 'released';
end;
$$;

-- Planificateur (service_role) : dénoue tous les projets échus ou abandonnés.
-- Chaque projet est traité dans son propre bloc : une erreur sur l'un est
-- rapportée dans « failed » sans bloquer ni annuler les autres.
create or replace function public.market_settle_due_investments()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_result text;
  v_released integer := 0;
  v_refunded integer := 0;
  v_expired integer := 0;
  v_failed jsonb := '[]'::jsonb;
begin
  for v_id in
    select p.id from public.market_investment_projects p
    where p.settled_at is null
      and (p.status = 'closed' or (p.deadline is not null and p.deadline < current_date))
    order by p.deadline nulls last, p.id
  loop
    begin
      v_result := public.market_settle_investment_project(v_id);
      if v_result = 'released' then
        v_released := v_released + 1;
      elsif v_result = 'refunded' then
        v_refunded := v_refunded + 1;
      elsif v_result = 'expired' then
        v_expired := v_expired + 1;
      end if;
    exception when others then
      v_failed := v_failed || jsonb_build_object('project_id', v_id, 'code', sqlstate, 'error', sqlerrm);
    end;
  end loop;

  return jsonb_build_object(
    'released', v_released,
    'refunded', v_refunded,
    'expired', v_expired,
    'failed', v_failed
  );
end;
$$;

-- Abandon par le porteur avant le dénouement : les investisseurs sont
-- remboursés dans la même transaction. Remplace 0021.
create or replace function public.market_close_investment_project(p_project_id uuid)
returns public.market_investment_projects
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_project public.market_investment_projects;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;

  select * into v_project
  from public.market_investment_projects where id = p_project_id
  for update;
  if v_project.id is null then
    raise exception 'Projet introuvable' using errcode = 'PY018';
  end if;
  if v_project.created_by is distinct from v_user then
    raise exception 'Action non autorisée' using errcode = 'PY006';
  end if;
  if v_project.settled_at is not null or v_project.status not in ('open', 'completed') then
    raise exception 'Le projet n''est plus ouvert' using errcode = 'PY019';
  end if;

  update public.market_investment_projects
  set status = 'closed'
  where id = v_project.id;

  perform public.market_settle_investment_project(v_project.id);

  select * into v_project
  from public.market_investment_projects where id = p_project_id;
  return v_project;
end;
$$;

-- 5. BÉNÉFICES ---------------------------------------------------------------

-- Déclaration par le porteur d'un projet financé. Aucun mouvement de fonds :
-- le montant n'est prélevé qu'à la validation.
create or replace function public.market_declare_investment_profit(
  p_project_id uuid,
  p_amount integer
)
returns public.market_investment_distributions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_project public.market_investment_projects;
  v_distribution public.market_investment_distributions;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Montant invalide' using errcode = 'PY001';
  end if;

  select * into v_project
  from public.market_investment_projects where id = p_project_id
  for update;
  if v_project.id is null then
    raise exception 'Projet introuvable' using errcode = 'PY018';
  end if;
  if v_project.created_by is distinct from v_user then
    raise exception 'Action non autorisée' using errcode = 'PY006';
  end if;
  if v_project.status <> 'funded' then
    raise exception 'Le projet n''est pas financé' using errcode = 'PY019';
  end if;
  if exists (
    select 1 from public.market_investment_distributions d
    where d.project_id = v_project.id and d.status = 'pending'
  ) then
    raise exception 'Une déclaration est déjà en attente de validation' using errcode = 'PY019';
  end if;

  insert into public.market_investment_distributions
    (project_id, declared_by, amount, currency, status)
  values (v_project.id, v_user, p_amount, v_project.currency, 'pending')
  returning * into v_distribution;

  return v_distribution;
end;
$$;

-- Décision d'un administrateur de la plateforme (jamais le porteur lui-même).
-- Approbation : le portefeuille du porteur est débité et chaque investisseur
-- crédité au prorata de sa mise, arrondi à l'unité inférieure ; le reliquat
-- d'arrondi n'est pas prélevé. Une décision n'est prise qu'une fois.
create or replace function public.market_review_investment_profit(
  p_distribution_id uuid,
  p_status text,
  p_review_notes text default null
)
returns public.market_investment_distributions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_actor text;
  v_project_id uuid;
  v_project public.market_investment_projects;
  v_distribution public.market_investment_distributions;
  v_total_stake bigint;
  v_distributed bigint;
  v_investors integer;
  v_investor uuid;
  v_owner_wallet_id uuid;
  v_owner_wallet public.pay_wallets;
  v_line record;
  v_tx_id uuid;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;
  if not public.is_platform_admin() then
    raise exception 'Action non autorisée' using errcode = 'PY006';
  end if;
  if p_status is null or p_status not in ('approved', 'rejected') then
    raise exception 'Décision invalide' using errcode = 'PY009';
  end if;

  select d.project_id into v_project_id
  from public.market_investment_distributions d where d.id = p_distribution_id;
  if v_project_id is null then
    raise exception 'Déclaration introuvable' using errcode = 'PY018';
  end if;

  select * into v_project
  from public.market_investment_projects where id = v_project_id
  for update;
  select * into v_distribution
  from public.market_investment_distributions where id = p_distribution_id
  for update;

  if v_project.created_by = v_user then
    raise exception 'Action non autorisée' using errcode = 'PY006';
  end if;
  -- Idempotence : une déclaration déjà décidée ne se rejoue pas.
  if v_distribution.status <> 'pending' then
    raise exception 'Déclaration déjà traitée' using errcode = 'PY019';
  end if;

  select coalesce(nullif(u.email, ''), v_user::text) into v_actor
  from auth.users u where u.id = v_user;

  if p_status = 'rejected' then
    update public.market_investment_distributions
    set status = 'rejected', review_notes = p_review_notes,
        reviewed_by = v_user, reviewed_at = now()
    where id = v_distribution.id
    returning * into v_distribution;

    insert into public.admin_audit_logs (actor, action, module, severity)
    values
      (coalesce(v_actor, v_user::text),
       'review_investment_profit:rejected:' || v_distribution.id::text, 'market', 'info');
    return v_distribution;
  end if;

  if v_project.status <> 'funded' or v_project.created_by is null then
    raise exception 'Le projet n''est pas financé' using errcode = 'PY019';
  end if;

  select coalesce(sum(c.amount), 0) into v_total_stake
  from public.market_investment_contributions c
  where c.project_id = v_project.id and c.refunded_at is null;
  if v_total_stake <= 0 then
    raise exception 'Aucune mise à rémunérer' using errcode = 'PY019';
  end if;

  -- Prorata des mises, arrondi à l'unité inférieure.
  insert into public.market_investment_distribution_shares (distribution_id, user_id, stake, amount)
  select v_distribution.id, c.user_id, sum(c.amount)::integer,
         floor(v_distribution.amount::numeric * sum(c.amount) / v_total_stake)::integer
  from public.market_investment_contributions c
  where c.project_id = v_project.id and c.refunded_at is null
  group by c.user_id;

  select coalesce(sum(s.amount), 0), count(*) into v_distributed, v_investors
  from public.market_investment_distribution_shares s
  where s.distribution_id = v_distribution.id;
  if v_distributed <= 0 then
    raise exception 'Montant trop faible pour être réparti' using errcode = 'PY001';
  end if;

  v_owner_wallet_id := public.pay_ensure_wallet_for(v_project.created_by);
  for v_investor in
    select s.user_id from public.market_investment_distribution_shares s
    where s.distribution_id = v_distribution.id
  loop
    perform public.pay_ensure_wallet_for(v_investor);
  end loop;

  perform 1 from public.pay_wallets w
  where w.type = 'personal' and (
    w.user_id = v_project.created_by
    or w.user_id in (
      select s.user_id from public.market_investment_distribution_shares s
      where s.distribution_id = v_distribution.id
    )
  )
  order by w.id
  for update;

  select * into v_owner_wallet from public.pay_wallets where id = v_owner_wallet_id;
  if v_owner_wallet.currency <> v_project.currency then
    raise exception 'Devises incompatibles' using errcode = 'PY015';
  end if;
  if v_owner_wallet.balance < v_distributed then
    raise exception 'Solde insuffisant' using errcode = 'PY003';
  end if;

  update public.pay_wallets
  set balance = balance - v_distributed::integer,
      last_known_balance = balance - v_distributed::integer,
      updated_at = now()
  where id = v_owner_wallet.id;

  insert into public.pay_transactions
    (user_id, wallet_id, type, status, amount, currency, counterparty, description, commission, reference, module)
  values
    (v_project.created_by, v_owner_wallet.id, 'payment', 'confirmed', v_distributed::integer, v_project.currency,
     v_project.name, 'Distribution de bénéfices aux investisseurs', 0,
     public.pay_generate_reference(), 'market');

  for v_line in
    select s.id, s.user_id, s.amount, w.id as wallet_id, w.currency
    from public.market_investment_distribution_shares s
    join public.pay_wallets w on w.user_id = s.user_id and w.type = 'personal'
    where s.distribution_id = v_distribution.id and s.amount > 0
    order by w.id
  loop
    if v_line.currency <> v_project.currency then
      raise exception 'Devises incompatibles' using errcode = 'PY015';
    end if;

    update public.pay_wallets
    set balance = balance + v_line.amount,
        last_known_balance = balance + v_line.amount,
        updated_at = now()
    where id = v_line.wallet_id;

    insert into public.pay_transactions
      (user_id, wallet_id, type, status, amount, currency, counterparty, description, commission, reference, module)
    values
      (v_line.user_id, v_line.wallet_id, 'receipt', 'confirmed', v_line.amount, v_project.currency,
       v_project.name, 'Bénéfice d''un projet d''investissement', 0,
       public.pay_generate_reference(), 'market')
    returning id into v_tx_id;

    update public.market_investment_distribution_shares
    set transaction_id = v_tx_id
    where id = v_line.id;
  end loop;

  update public.market_investment_distributions
  set status = 'approved', distributed_amount = v_distributed::integer,
      review_notes = p_review_notes, reviewed_by = v_user, reviewed_at = now()
  where id = v_distribution.id
  returning * into v_distribution;

  perform public.audit_log_event(
    null, 'investment.profit_distributed', 'investment_distribution', v_distribution.id,
    v_distributed::integer, v_project.currency,
    jsonb_build_object('status', 'pending'),
    jsonb_build_object('status', 'approved', 'declared', v_distribution.amount, 'investors', v_investors)
  );

  insert into public.admin_audit_logs (actor, action, module, severity)
  values
    (coalesce(v_actor, v_user::text),
     'review_investment_profit:approved:' || v_distribution.id::text, 'market', 'info');

  return v_distribution;
end;
$$;

-- 6. MÉTRIQUES CONTROL PLANE -------------------------------------------------
-- Même liste que 0021, plus investment_escrow_balance (total bloqué en
-- séquestre) et investment_distributions_pending.
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
    'platform_wallet_balance',     (select coalesce(sum(balance), 0) from pay_wallets where type = 'platform'),
    'investment_escrow_balance',   (select coalesce(sum(balance), 0) from pay_wallets where type = 'escrow'),
    'investment_distributions_pending', (select count(*) from market_investment_distributions where status = 'pending'),
    'market_orders_24h_count',  (select count(*) from market_orders where status <> 'cancelled' and created_at >= now() - interval '24 hours'),
    'market_gmv_24h',           (select coalesce(sum(total), 0) from market_orders where status <> 'cancelled' and created_at >= now() - interval '24 hours'),
    'kyc_pending',              (select count(*) from admin_kyc where status = 'pending'),
    'disputes_open',            (select count(*) from admin_disputes where status = 'open'),
    'audit_events_24h',         (select count(*) from audit_events where created_at >= now() - interval '24 hours'),
    'outbox_pending',           (select count(*) from control_plane_outbox where status = 'pending'),
    'outbox_failed',            (select count(*) from control_plane_outbox where status = 'failed')
  );
$$;

-- 7. DROITS D'EXÉCUTION ------------------------------------------------------
revoke all on function public.market_investment_commission_rate() from public, anon;
revoke all on function public.market_create_investment_project(text, text, text, integer, text, text, date) from public, anon;
revoke all on function public.market_invest(uuid, integer) from public, anon;
revoke all on function public.market_close_investment_project(uuid) from public, anon;
revoke all on function public.market_declare_investment_profit(uuid, integer) from public, anon;
revoke all on function public.market_review_investment_profit(uuid, text, text) from public, anon;

grant execute on function public.market_investment_commission_rate() to authenticated;
grant execute on function public.market_create_investment_project(text, text, text, integer, text, text, date) to authenticated;
grant execute on function public.market_invest(uuid, integer) to authenticated;
grant execute on function public.market_close_investment_project(uuid) to authenticated;
grant execute on function public.market_declare_investment_profit(uuid, integer) to authenticated;
grant execute on function public.market_review_investment_profit(uuid, text, text) to authenticated;

-- Jamais appelables par les clients : dénouement réservé au planificateur.
revoke all on function public.market_settle_investment_project(uuid) from public, anon, authenticated;
revoke all on function public.market_settle_due_investments() from public, anon, authenticated;
grant execute on function public.market_settle_due_investments() to service_role;
revoke all on function public.cp_metrics_snapshot() from public, anon, authenticated;
grant execute on function public.cp_metrics_snapshot() to service_role;

-- L'API (PostgREST) recharge son schéma : nouvelles fonctions, tables et colonnes.
notify pgrst, 'reload schema';
