-- ============================================================================
-- 0021 — Marché et portefeuille : fermeture des failles restantes.
-- Appliquer après 0020_validate_wallet_balance.sql.
--
--  1. Politiques trop larges : commandes groupées, projets d'investissement et
--     suivi de retrait ne sont plus modifiables directement ; tout passe par
--     des fonctions security definer.
--  2. Portefeuille plateforme : compte unique sans utilisateur, crédité des
--     commissions dans la même transaction que l'opération.
--  3. Transfert : pay_transfer crédite le portefeuille du destinataire réel.
--  4. Stock : contrôlé à la commande, décrémenté au paiement.
--
-- Codes d'erreur ajoutés (repris dans lib/api/pay-rpc.ts) :
--   PY013 transfert vers soi-même          PY014 destinataire introuvable
--   PY015 devises incompatibles            PY016 stock insuffisant
--   PY017 quantité minimale non atteinte   PY018 élément introuvable
--   PY019 opération impossible dans l'état actuel
-- ============================================================================

-- 1. POLITIQUES TROP LARGES --------------------------------------------------

-- 1.a Commandes groupées (RG-M02) ---------------------------------------------
-- Avant : market_group_orders_update autorisait tout utilisateur connecté.
drop policy if exists "market_group_orders_insert" on public.market_group_orders;
drop policy if exists "market_group_orders_update" on public.market_group_orders;
drop policy if exists "market_group_participants_insert" on public.market_group_order_participants;

revoke insert, update, delete, truncate on public.market_group_orders from anon, authenticated;
revoke insert, update, delete, truncate on public.market_group_order_participants from anon, authenticated;

-- Interne : RG-M02, une commande groupée ouverte est confirmée dès que le
-- nombre minimal de participants est atteint ou que la date limite est passée.
create or replace function public.market_refresh_group_order(p_group_id uuid)
returns public.market_group_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group public.market_group_orders;
  v_count integer;
begin
  select * into v_group
  from public.market_group_orders where id = p_group_id
  for update;

  if v_group.id is not null and v_group.status = 'open' then
    select count(*) into v_count
    from public.market_group_order_participants where group_order_id = v_group.id;

    if v_count >= v_group.min_participants or v_group.deadline < current_date then
      update public.market_group_orders
      set status = 'confirmed'
      where id = v_group.id
      returning * into v_group;
    end if;
  end if;

  return v_group;
end;
$$;

-- Création : le prix et le revendeur viennent du produit, jamais de l'appelant.
create or replace function public.market_create_group_order(
  p_product_id uuid,
  p_min_participants integer default 1,
  p_deadline date default null
)
returns public.market_group_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_product public.market_products;
  v_group public.market_group_orders;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;

  select * into v_product
  from public.market_products
  where id = p_product_id and status = 'published' and retail_price > 0;
  if v_product.id is null then
    raise exception 'Produit introuvable' using errcode = 'PY018';
  end if;
  if coalesce(p_min_participants, 1) < 1 then
    raise exception 'Nombre minimal de participants invalide' using errcode = 'PY009';
  end if;

  insert into public.market_group_orders
    (product_id, reseller_id, creator_id, min_participants, deadline, unit_price, currency, status)
  values
    (v_product.id, v_product.reseller_id, v_user, coalesce(p_min_participants, 1),
     coalesce(p_deadline, current_date), v_product.retail_price, v_product.currency, 'open')
  returning * into v_group;

  insert into public.market_group_order_participants (group_order_id, user_id)
  values (v_group.id, v_user);

  return public.market_refresh_group_order(v_group.id);
end;
$$;

-- Participation : chacun ne peut inscrire que lui-même, sur une commande ouverte.
create or replace function public.market_join_group_order(p_group_id uuid)
returns public.market_group_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_group public.market_group_orders;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;

  select * into v_group
  from public.market_group_orders where id = p_group_id
  for update;
  if v_group.id is null then
    raise exception 'Commande groupée introuvable' using errcode = 'PY018';
  end if;

  if v_group.status = 'open' then
    insert into public.market_group_order_participants (group_order_id, user_id)
    values (v_group.id, v_user)
    on conflict (group_order_id, user_id) do nothing;
  end if;

  return public.market_refresh_group_order(v_group.id);
end;
$$;

-- Clôture : réservée au créateur ou au revendeur concerné.
create or replace function public.market_close_group_order(p_group_id uuid)
returns public.market_group_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_group public.market_group_orders;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;

  select * into v_group
  from public.market_group_orders where id = p_group_id
  for update;
  if v_group.id is null then
    raise exception 'Commande groupée introuvable' using errcode = 'PY018';
  end if;
  if v_group.creator_id is distinct from v_user and not exists (
    select 1 from public.market_resellers r
    where r.id = v_group.reseller_id and r.user_id = v_user
  ) then
    raise exception 'Action non autorisée' using errcode = 'PY006';
  end if;
  if v_group.status = 'closed' then
    raise exception 'Commande groupée déjà clôturée' using errcode = 'PY019';
  end if;

  update public.market_group_orders
  set status = 'closed'
  where id = v_group.id
  returning * into v_group;

  return v_group;
end;
$$;

-- 1.b Projets d'investissement (RG-M05) ---------------------------------------
-- Avant : market_projects_update autorisait tout utilisateur connecté à
-- modifier n'importe quel projet (montant collecté et règles compris).
alter table public.market_investment_projects
  add column if not exists created_by uuid references auth.users (id) on delete set null;

drop policy if exists "market_projects_insert" on public.market_investment_projects;
drop policy if exists "market_projects_update" on public.market_investment_projects;
drop policy if exists "market_contribs_insert" on public.market_investment_contributions;

revoke insert, update, delete, truncate on public.market_investment_projects from anon, authenticated;
revoke insert, update, delete, truncate on public.market_investment_contributions from anon, authenticated;

create or replace function public.market_create_investment_project(
  p_name text,
  p_description text default '',
  p_sector text default '',
  p_target_amount integer default 0,
  p_currency text default 'GNF',
  p_profit_sharing_rules text default ''
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
  if coalesce(trim(p_name), '') = '' or coalesce(p_target_amount, 0) < 0 then
    raise exception 'Projet invalide' using errcode = 'PY009';
  end if;

  insert into public.market_investment_projects
    (name, description, sector, target_amount, raised_amount, currency,
     profit_sharing_rules, rules_locked, status, created_by)
  values
    (trim(p_name), coalesce(p_description, ''), coalesce(p_sector, ''), coalesce(p_target_amount, 0), 0,
     coalesce(nullif(p_currency, ''), 'GNF'), coalesce(p_profit_sharing_rules, ''), false, 'open', v_user)
  returning * into v_project;

  return v_project;
end;
$$;

-- RG-M05 : les règles de répartition ne sont modifiables que par le créateur,
-- et plus du tout après le premier investissement.
create or replace function public.market_update_investment_rules(
  p_project_id uuid,
  p_profit_sharing_rules text
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

  select * into v_project
  from public.market_investment_projects where id = p_project_id
  for update;
  if v_project.id is null then
    raise exception 'Projet introuvable' using errcode = 'PY018';
  end if;
  if v_project.created_by is distinct from v_user then
    raise exception 'Action non autorisée' using errcode = 'PY006';
  end if;
  if v_project.rules_locked then
    raise exception 'Règles de répartition verrouillées depuis le premier investissement' using errcode = 'PY019';
  end if;

  update public.market_investment_projects
  set profit_sharing_rules = coalesce(p_profit_sharing_rules, '')
  where id = v_project.id
  returning * into v_project;

  return v_project;
end;
$$;

-- Clôture d'un projet : créateur uniquement.
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
  if v_project.status <> 'open' then
    raise exception 'Le projet n''est plus ouvert' using errcode = 'PY019';
  end if;

  update public.market_investment_projects
  set status = 'closed'
  where id = v_project.id
  returning * into v_project;

  return v_project;
end;
$$;

-- Contribution : enregistre l'engagement de l'utilisateur courant et met à
-- jour le montant collecté dans la même transaction (comportement de la route
-- existante : aucune somme n'est débitée du portefeuille à ce stade).
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
  if v_project.status <> 'open' then
    raise exception 'Le projet n''est plus ouvert à l''investissement' using errcode = 'PY019';
  end if;

  v_raised := v_project.raised_amount::bigint + p_amount;
  if v_raised > 2147483647 then
    raise exception 'Montant invalide' using errcode = 'PY001';
  end if;

  insert into public.market_investment_contributions (project_id, user_id, amount)
  values (v_project.id, v_user, p_amount);

  update public.market_investment_projects
  set raised_amount = v_raised::integer,
      rules_locked = true,
      status = case when v_raised >= target_amount then 'completed' else 'open' end
  where id = v_project.id
  returning * into v_project;

  return v_project;
end;
$$;

-- 1.c Suivi de retrait (RG-M03) -----------------------------------------------
-- Écrit uniquement par market_advance_order (scan puis remise).
drop policy if exists "market_pickups_insert" on public.market_pickup_records;
drop policy if exists "market_pickups_update" on public.market_pickup_records;
revoke insert, update, delete, truncate on public.market_pickup_records from anon, authenticated;

-- 2. PORTEFEUILLE PLATEFORME -------------------------------------------------

-- Compte unique sans utilisateur. La politique de lecture (user_id = auth.uid())
-- ne le rend visible à aucun client : service_role et back-office uniquement.
alter table public.pay_wallets alter column user_id drop not null;

alter table public.pay_wallets
  drop constraint if exists pay_wallets_platform_owner;
alter table public.pay_wallets
  add constraint pay_wallets_platform_owner
  check ((type = 'platform') = (user_id is null));

create unique index if not exists idx_pay_wallets_platform
  on public.pay_wallets (type)
  where type = 'platform';

insert into public.pay_wallets (user_id, type, label, currency, balance, last_known_balance)
select null, 'platform', 'Commissions plateforme', 'GNF', 0, 0
where not exists (select 1 from public.pay_wallets where type = 'platform');

-- Interne : crédite le portefeuille plateforme. Toujours appelée en dernier,
-- après le verrouillage des portefeuilles utilisateurs (ordre de verrou fixe).
create or replace function public.pay_credit_platform(p_amount integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_amount is null or p_amount <= 0 then
    return;
  end if;

  select id into v_id
  from public.pay_wallets where type = 'platform'
  for update;
  if v_id is null then
    raise exception 'Portefeuille plateforme introuvable' using errcode = 'PY002';
  end if;

  update public.pay_wallets
  set balance = balance + p_amount,
      last_known_balance = balance + p_amount,
      updated_at = now()
  where id = v_id;
end;
$$;

-- Le portefeuille plateforme n'est jamais un portefeuille d'utilisateur :
-- pay_lock_wallet (0017) filtre déjà sur user_id = auth.uid().

-- Retrait : la commission est créditée à la plateforme. Remplace 0017.
create or replace function public.pay_withdraw(
  p_amount integer,
  p_wallet_id uuid default null,
  p_provider text default ''
)
returns public.pay_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.pay_wallets;
  v_commission integer;
  v_balance integer;
  v_tx public.pay_transactions;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Montant invalide' using errcode = 'PY001';
  end if;

  v_wallet := public.pay_lock_wallet(p_wallet_id);
  v_commission := public.pay_service_fee(p_amount);

  if v_wallet.balance < p_amount + v_commission then
    raise exception 'Solde insuffisant' using errcode = 'PY003';
  end if;

  v_balance := v_wallet.balance - p_amount - v_commission;

  update public.pay_wallets
  set balance = v_balance, last_known_balance = v_balance, updated_at = now()
  where id = v_wallet.id;

  insert into public.pay_transactions
    (user_id, wallet_id, type, status, amount, currency, counterparty, description, commission, reference, module)
  values
    (v_wallet.user_id, v_wallet.id, 'withdrawal', 'confirmed', p_amount, v_wallet.currency,
     coalesce(p_provider, ''), 'Retrait vers Mobile Money', v_commission,
     public.pay_generate_reference(), 'pay')
  returning * into v_tx;

  perform public.pay_credit_platform(v_commission);

  return v_tx;
end;
$$;

-- Confirmation de recharge : la commission est créditée à la plateforme.
-- Remplace 0019.
create or replace function public.pay_confirm_topup(p_reference text)
returns public.pay_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx public.pay_transactions;
  v_wallet public.pay_wallets;
  v_balance integer;
begin
  select * into v_tx
  from public.pay_transactions
  where reference = p_reference and type = 'topup'
  for update;

  if v_tx.id is null then
    raise exception 'Recharge introuvable' using errcode = 'PY011';
  end if;
  if v_tx.status = 'confirmed' then
    return v_tx;
  end if;
  if v_tx.status <> 'pending' then
    raise exception 'Recharge non confirmable (statut %)', v_tx.status using errcode = 'PY012';
  end if;

  select * into v_wallet
  from public.pay_wallets where id = v_tx.wallet_id
  for update;
  if v_wallet.id is null then
    raise exception 'Portefeuille introuvable' using errcode = 'PY002';
  end if;

  v_balance := v_wallet.balance + v_tx.amount - v_tx.commission;
  update public.pay_wallets
  set balance = v_balance, last_known_balance = v_balance, updated_at = now()
  where id = v_wallet.id;

  update public.pay_transactions
  set status = 'confirmed'
  where id = v_tx.id
  returning * into v_tx;

  perform public.pay_credit_platform(v_tx.commission);

  return v_tx;
end;
$$;

-- 3. TRANSFERT ENTRE MEMBRES -------------------------------------------------

-- L'ancienne signature (montant, libellé libre, portefeuille) débitait
-- l'émetteur sans créditer personne.
drop function if exists public.pay_transfer(integer, text, uuid);

-- Le destinataire est désigné soit par un membre d'une organisation commune
-- (p_to_member_id), soit par son identifiant utilisateur (p_to_user_id).
-- Débit de l'émetteur et crédit du portefeuille personnel du destinataire dans
-- la même transaction, sans commission.
create or replace function public.pay_transfer(
  p_amount integer,
  p_to_user_id uuid default null,
  p_to_member_id uuid default null,
  p_from_wallet_id uuid default null
)
returns public.pay_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_recipient uuid;
  v_recipient_label text := 'Utilisateur';
  v_sender_label text := 'Utilisateur';
  v_member public.members;
  v_from_id uuid;
  v_to_id uuid;
  v_from public.pay_wallets;
  v_to public.pay_wallets;
  v_balance integer;
  v_tx public.pay_transactions;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Montant invalide' using errcode = 'PY001';
  end if;

  if p_to_member_id is not null then
    select * into v_member from public.members where id = p_to_member_id;
    -- Le membre doit appartenir à une organisation de l'émetteur et avoir un compte.
    if v_member.id is null or v_member.user_id is null or not exists (
      select 1 from public.memberships m
      where m.organization_id = v_member.organization_id and m.user_id = v_user
    ) then
      raise exception 'Destinataire introuvable' using errcode = 'PY014';
    end if;
    v_recipient := v_member.user_id;
    v_recipient_label := coalesce(nullif(v_member.name, ''), 'Membre');
    if p_to_user_id is not null and p_to_user_id <> v_recipient then
      raise exception 'Destinataire introuvable' using errcode = 'PY014';
    end if;
  elsif p_to_user_id is not null then
    if not exists (select 1 from auth.users u where u.id = p_to_user_id) then
      raise exception 'Destinataire introuvable' using errcode = 'PY014';
    end if;
    v_recipient := p_to_user_id;
  else
    raise exception 'Destinataire introuvable' using errcode = 'PY014';
  end if;

  if v_recipient = v_user then
    raise exception 'Transfert vers soi-même impossible' using errcode = 'PY013';
  end if;

  -- Portefeuille émetteur (contrôle de propriété), portefeuille personnel du destinataire.
  if p_from_wallet_id is null then
    v_from_id := public.pay_ensure_wallet_for(v_user);
  else
    select id into v_from_id
    from public.pay_wallets where id = p_from_wallet_id and user_id = v_user;
    if v_from_id is null then
      raise exception 'Portefeuille introuvable' using errcode = 'PY002';
    end if;
  end if;
  v_to_id := public.pay_ensure_wallet_for(v_recipient);

  -- Verrouillage des deux portefeuilles dans un ordre fixe (anti-interblocage).
  perform 1 from public.pay_wallets
  where id in (v_from_id, v_to_id)
  order by id
  for update;

  select * into v_from from public.pay_wallets where id = v_from_id;
  select * into v_to from public.pay_wallets where id = v_to_id;

  if v_from.currency <> v_to.currency then
    raise exception 'Devises incompatibles' using errcode = 'PY015';
  end if;
  if v_from.balance < p_amount then
    raise exception 'Solde insuffisant' using errcode = 'PY003';
  end if;

  v_balance := v_from.balance - p_amount;
  update public.pay_wallets
  set balance = v_balance, last_known_balance = v_balance, updated_at = now()
  where id = v_from.id;

  v_balance := v_to.balance + p_amount;
  update public.pay_wallets
  set balance = v_balance, last_known_balance = v_balance, updated_at = now()
  where id = v_to.id;

  -- Libellé de l'émetteur vu par le destinataire : son nom dans une
  -- organisation commune, s'il y en a une.
  select coalesce(nullif(s.name, ''), 'Membre') into v_sender_label
  from public.members s
  join public.memberships m
    on m.organization_id = s.organization_id and m.user_id = v_recipient
  where s.user_id = v_user
  limit 1;

  insert into public.pay_transactions
    (user_id, wallet_id, type, status, amount, currency, counterparty, description, commission, reference, module)
  values
    (v_user, v_from.id, 'transfer', 'confirmed', p_amount, v_from.currency,
     v_recipient_label, 'Transfert entre membres', 0,
     public.pay_generate_reference(), 'pay')
  returning * into v_tx;

  insert into public.pay_transactions
    (user_id, wallet_id, type, status, amount, currency, counterparty, description, commission, reference, module)
  values
    (v_recipient, v_to.id, 'receipt', 'confirmed', p_amount, v_to.currency,
     coalesce(v_sender_label, 'Utilisateur'), 'Transfert reçu', 0,
     public.pay_generate_reference(), 'pay');

  return v_tx;
end;
$$;

-- 4. STOCK ET QUANTITÉ MINIMALE ----------------------------------------------

-- Création d'une commande : comme 0019, plus le contrôle du stock et de la
-- quantité minimale de chaque produit. Le stock n'est pas réservé ici : il
-- est décrémenté au paiement (market_pay_order).
create or replace function public.market_create_order(
  p_items jsonb,
  p_delivery_method text default 'pickup',
  p_delivery_date date default null,
  p_delivery_city text default ''
)
returns public.market_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_requested integer;
  v_found integer;
  v_resellers integer;
  v_currencies integer;
  v_valid_quantities boolean;
  v_below_minimum integer;
  v_out_of_stock integer;
  v_reseller_id uuid;
  v_reseller_name text;
  v_currency text;
  v_total bigint;
  v_order public.market_orders;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Commande vide' using errcode = 'PY009';
  end if;

  begin
    with lines as (
      select (e->>'product_id')::uuid as product_id,
             sum((e->>'quantity')::integer) as quantity
      from jsonb_array_elements(p_items) e
      group by 1
    )
    select count(*),
           count(p.id),
           count(distinct p.reseller_id),
           count(distinct p.currency),
           coalesce(bool_and(coalesce(l.quantity, 0) > 0), false),
           count(*) filter (where l.quantity < p.min_order_quantity),
           count(*) filter (where l.quantity > p.stock),
           min(p.reseller_id::text)::uuid,
           min(p.currency),
           sum(l.quantity::bigint * p.retail_price)
      into v_requested, v_found, v_resellers, v_currencies, v_valid_quantities,
           v_below_minimum, v_out_of_stock,
           v_reseller_id, v_currency, v_total
    from lines l
    left join public.market_products p
      on p.id = l.product_id and p.status = 'published' and p.retail_price > 0;
  exception
    when invalid_text_representation or numeric_value_out_of_range or null_value_not_allowed then
      raise exception 'Commande invalide' using errcode = 'PY009';
  end;

  if v_found <> v_requested or not v_valid_quantities then
    raise exception 'Produit indisponible ou quantité invalide' using errcode = 'PY009';
  end if;
  if v_resellers <> 1 or v_currencies <> 1 then
    raise exception 'Une commande ne peut porter que sur un seul revendeur' using errcode = 'PY009';
  end if;
  if v_below_minimum > 0 then
    raise exception 'Quantité minimale de commande non atteinte' using errcode = 'PY017';
  end if;
  if v_out_of_stock > 0 then
    raise exception 'Stock insuffisant' using errcode = 'PY016';
  end if;
  if v_total is null or v_total <= 0 or v_total > 2147483647 then
    raise exception 'Montant de commande invalide' using errcode = 'PY009';
  end if;

  select r.company_name into v_reseller_name
  from public.market_resellers r where r.id = v_reseller_id;

  insert into public.market_orders
    (buyer_id, reseller_id, reseller_name, total, currency,
     delivery_method, delivery_date, delivery_city, status, paid)
  values
    (v_user, v_reseller_id, coalesce(v_reseller_name, ''), v_total::integer, v_currency,
     coalesce(nullif(p_delivery_method, ''), 'pickup'), p_delivery_date,
     coalesce(p_delivery_city, ''), 'pending_payment', false)
  returning * into v_order;

  insert into public.market_order_items
    (order_id, product_id, product_name, quantity, unit_price, currency)
  select v_order.id, p.id, p.name, l.quantity, p.retail_price, p.currency
  from (
    select (e->>'product_id')::uuid as product_id,
           sum((e->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) e
    group by 1
  ) l
  join public.market_products p on p.id = l.product_id;

  return v_order;
end;
$$;

-- Paiement d'une commande : comme 0019, plus le décrément du stock (refus si
-- le stock est devenu insuffisant depuis la commande) et le crédit de la
-- commission au portefeuille plateforme.
-- Ordre de verrouillage : commande, produits (par id), portefeuilles
-- utilisateurs (par id), portefeuille plateforme.
create or replace function public.market_pay_order(p_order_id uuid)
returns public.market_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_order public.market_orders;
  v_items_total bigint;
  v_items_count integer;
  v_locked_count integer;
  v_short integer;
  v_total integer;
  v_seller uuid;
  v_rate numeric;
  v_commission integer;
  v_net integer;
  v_buyer_wallet_id uuid;
  v_seller_wallet_id uuid;
  v_buyer_wallet public.pay_wallets;
  v_seller_wallet public.pay_wallets;
  v_balance integer;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;

  select * into v_order
  from public.market_orders where id = p_order_id
  for update;

  if v_order.id is null then
    raise exception 'Commande introuvable' using errcode = 'PY005';
  end if;
  if v_order.buyer_id <> v_user then
    raise exception 'Action non autorisée' using errcode = 'PY006';
  end if;
  if v_order.paid then
    raise exception 'Commande déjà payée' using errcode = 'PY007';
  end if;
  if v_order.status <> 'pending_payment' then
    raise exception 'Transition de statut non autorisée' using errcode = 'PY008';
  end if;

  -- Le montant dû est recalculé depuis les lignes de la commande.
  select sum(i.quantity::bigint * i.unit_price), count(*)
    into v_items_total, v_items_count
  from public.market_order_items i where i.order_id = v_order.id;
  if v_items_total is null or v_items_total <= 0 or v_items_total > 2147483647 then
    raise exception 'Montant de commande invalide' using errcode = 'PY009';
  end if;
  v_total := v_items_total::integer;

  -- Verrouillage des produits commandés, puis contrôle du stock restant.
  perform 1 from public.market_products p
  where p.id in (select i.product_id from public.market_order_items i where i.order_id = v_order.id)
  order by p.id
  for update;

  select count(p.id), count(*) filter (where p.id is not null and i.quantity > p.stock)
    into v_locked_count, v_short
  from public.market_order_items i
  left join public.market_products p on p.id = i.product_id
  where i.order_id = v_order.id;
  if v_locked_count <> v_items_count then
    raise exception 'Produit indisponible' using errcode = 'PY009';
  end if;
  if v_short > 0 then
    raise exception 'Stock insuffisant' using errcode = 'PY016';
  end if;

  select r.user_id into v_seller
  from public.market_resellers r where r.id = v_order.reseller_id;
  if v_seller is null then
    raise exception 'Revendeur sans compte : paiement indisponible' using errcode = 'PY010';
  end if;
  if v_seller = v_user then
    raise exception 'Action non autorisée' using errcode = 'PY006';
  end if;

  select c.rate into v_rate
  from public.admin_commissions c where c.service = 'Commission revendeur B2B';
  if v_rate is null or v_rate < 0 or v_rate > 100 then
    raise exception 'Commission revendeur non configurée' using errcode = 'PY010';
  end if;
  v_commission := public.market_commission(v_total, v_rate);
  v_net := v_total - v_commission;

  v_buyer_wallet_id := public.pay_ensure_wallet_for(v_user);
  v_seller_wallet_id := public.pay_ensure_wallet_for(v_seller);

  -- Verrouillage des deux portefeuilles dans un ordre fixe (anti-interblocage).
  perform 1 from public.pay_wallets
  where id in (v_buyer_wallet_id, v_seller_wallet_id)
  order by id
  for update;

  select * into v_buyer_wallet from public.pay_wallets where id = v_buyer_wallet_id;
  select * into v_seller_wallet from public.pay_wallets where id = v_seller_wallet_id;

  if v_buyer_wallet.currency <> v_order.currency or v_seller_wallet.currency <> v_order.currency then
    raise exception 'Devise du portefeuille différente de celle de la commande' using errcode = 'PY010';
  end if;
  if v_buyer_wallet.balance < v_total then
    raise exception 'Solde insuffisant' using errcode = 'PY003';
  end if;

  update public.market_products p
  set stock = p.stock - i.quantity, updated_at = now()
  from public.market_order_items i
  where i.order_id = v_order.id and i.product_id = p.id;

  v_balance := v_buyer_wallet.balance - v_total;
  update public.pay_wallets
  set balance = v_balance, last_known_balance = v_balance, updated_at = now()
  where id = v_buyer_wallet.id;

  v_balance := v_seller_wallet.balance + v_net;
  update public.pay_wallets
  set balance = v_balance, last_known_balance = v_balance, updated_at = now()
  where id = v_seller_wallet.id;

  insert into public.pay_transactions
    (user_id, wallet_id, type, status, amount, currency, counterparty, description, commission, reference, module)
  values
    (v_user, v_buyer_wallet.id, 'payment', 'confirmed', v_total, v_order.currency,
     v_order.reseller_name, 'Paiement commande marché', 0,
     public.pay_generate_reference(), 'market'),
    (v_seller, v_seller_wallet.id, 'receipt', 'confirmed', v_net, v_order.currency,
     'Commande marché', 'Vente marché (commission déduite)', v_commission,
     public.pay_generate_reference(), 'market');

  perform public.pay_credit_platform(v_commission);

  update public.market_orders
  set paid = true, status = 'confirmed', total = v_total, updated_at = now()
  where id = v_order.id
  returning * into v_order;

  return v_order;
end;
$$;

-- Un stock ne peut jamais devenir négatif.
alter table public.market_products
  drop constraint if exists market_products_stock_non_negative;
alter table public.market_products
  add constraint market_products_stock_non_negative check (stock >= 0) not valid;

-- 5. MÉTRIQUES CONTROL PLANE -------------------------------------------------
-- Même liste que 0018, plus platform_wallet_balance.
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
    'market_orders_24h_count',  (select count(*) from market_orders where status <> 'cancelled' and created_at >= now() - interval '24 hours'),
    'market_gmv_24h',           (select coalesce(sum(total), 0) from market_orders where status <> 'cancelled' and created_at >= now() - interval '24 hours'),
    'kyc_pending',              (select count(*) from admin_kyc where status = 'pending'),
    'disputes_open',            (select count(*) from admin_disputes where status = 'open'),
    'audit_events_24h',         (select count(*) from audit_events where created_at >= now() - interval '24 hours'),
    'outbox_pending',           (select count(*) from control_plane_outbox where status = 'pending'),
    'outbox_failed',            (select count(*) from control_plane_outbox where status = 'failed')
  );
$$;

-- 6. DROITS D'EXÉCUTION ------------------------------------------------------
revoke all on function public.market_create_group_order(uuid, integer, date) from public, anon;
revoke all on function public.market_join_group_order(uuid) from public, anon;
revoke all on function public.market_close_group_order(uuid) from public, anon;
revoke all on function public.market_create_investment_project(text, text, text, integer, text, text) from public, anon;
revoke all on function public.market_update_investment_rules(uuid, text) from public, anon;
revoke all on function public.market_close_investment_project(uuid) from public, anon;
revoke all on function public.market_invest(uuid, integer) from public, anon;
revoke all on function public.pay_transfer(integer, uuid, uuid, uuid) from public, anon;

grant execute on function public.market_create_group_order(uuid, integer, date) to authenticated;
grant execute on function public.market_join_group_order(uuid) to authenticated;
grant execute on function public.market_close_group_order(uuid) to authenticated;
grant execute on function public.market_create_investment_project(text, text, text, integer, text, text) to authenticated;
grant execute on function public.market_update_investment_rules(uuid, text) to authenticated;
grant execute on function public.market_close_investment_project(uuid) to authenticated;
grant execute on function public.market_invest(uuid, integer) to authenticated;
grant execute on function public.pay_transfer(integer, uuid, uuid, uuid) to authenticated;

-- Jamais appelables par les clients.
revoke all on function public.market_refresh_group_order(uuid) from public, anon, authenticated;
revoke all on function public.pay_credit_platform(integer) from public, anon, authenticated;
revoke all on function public.cp_metrics_snapshot() from public, anon, authenticated;
grant execute on function public.cp_metrics_snapshot() to service_role;
