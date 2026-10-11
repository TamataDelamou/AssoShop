-- ============================================================================
-- 0019 — Intégrité des commandes marché, paiement partagé revendeur, recharge
-- confirmée côté serveur, adhésions. Appliquer après 0018_activity_audit.sql.
--
--  1. Commandes marché   : plus aucune écriture client ; création, annulation
--                          et avancement logistique par fonctions security
--                          definer ; total calculé en base.
--  2. Paiement partagé   : market_pay_order débite l'acheteur et crédite le
--                          revendeur du total moins la commission plateforme.
--  3. Recharge           : pay_topup crée une transaction « pending » ;
--                          pay_confirm_topup (service_role) crédite une fois.
--  4. Adhésions          : organizations.created_by + bootstrap du créateur.
--  5. Journal d'audit    : market.order_paid et pay.topup_confirmed.
--
-- Codes d'erreur ajoutés (repris dans lib/api/pay-rpc.ts) :
--   PY008 transition de statut non autorisée   PY009 commande invalide
--   PY010 paiement indisponible (revendeur / commission / devise)
--   PY011 recharge introuvable                 PY012 recharge non confirmable
-- ============================================================================

-- 1. COMMANDES MARCHÉ --------------------------------------------------------

-- Plus aucune écriture directe : l'acheteur ne peut modifier ni paid, ni total,
-- ni status ; le revendeur ne passe que par market_advance_order.
drop policy if exists "market_orders_insert" on public.market_orders;
drop policy if exists "market_orders_update" on public.market_orders;
drop policy if exists "market_order_items_insert" on public.market_order_items;

revoke insert, update, delete, truncate on public.market_orders from anon, authenticated;
revoke insert, update, delete, truncate on public.market_order_items from anon, authenticated;

-- Création d'une commande. p_items : [{"product_id": uuid, "quantity": n}].
-- Les prix viennent de market_products (retail_price), jamais de l'appelant ;
-- le total est la somme des lignes insérées. Une commande = un seul revendeur.
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
           min(p.reseller_id::text)::uuid,
           min(p.currency),
           sum(l.quantity::bigint * p.retail_price)
      into v_requested, v_found, v_resellers, v_currencies, v_valid_quantities,
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

-- Annulation par l'acheteur, tant que la commande n'est pas payée.
create or replace function public.market_cancel_order(p_order_id uuid)
returns public.market_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_order public.market_orders;
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
  if v_order.paid or v_order.status <> 'pending_payment' then
    raise exception 'Une commande payée ne peut plus être annulée' using errcode = 'PY008';
  end if;

  update public.market_orders
  set status = 'cancelled', updated_at = now()
  where id = v_order.id
  returning * into v_order;

  return v_order;
end;
$$;

-- Avancement logistique par le revendeur propriétaire : une seule étape à la
-- fois dans l'ordre ci-dessous, sur une commande payée. Ne touche jamais à
-- paid ni à total. Le suivi de retrait (RG-M03) est tenu dans la même
-- transaction.
create or replace function public.market_advance_order(
  p_order_id uuid,
  p_status text,
  p_recipient_name text default null
)
returns public.market_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_flow constant text[] := array['confirmed', 'shipped', 'arrived', 'ready_for_pickup', 'delivered'];
  v_user uuid := auth.uid();
  v_order public.market_orders;
  v_from integer;
  v_to integer;
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
  if not exists (
    select 1 from public.market_resellers r
    where r.id = v_order.reseller_id and r.user_id = v_user
  ) then
    raise exception 'Action non autorisée' using errcode = 'PY006';
  end if;

  v_from := array_position(v_flow, v_order.status);
  v_to := array_position(v_flow, p_status);
  if not v_order.paid or v_from is null or v_to is null or v_to <> v_from + 1 then
    raise exception 'Transition de statut non autorisée' using errcode = 'PY008';
  end if;

  update public.market_orders
  set status = p_status, updated_at = now()
  where id = v_order.id
  returning * into v_order;

  if p_status = 'ready_for_pickup' then
    insert into public.market_pickup_records (order_id, tracking_code, status, scanned_at)
    values (v_order.id, 'QR-' || upper(substr(v_order.id::text, 1, 8)), 'scanned', now())
    on conflict (order_id) do update
      set tracking_code = excluded.tracking_code,
          status = excluded.status,
          scanned_at = excluded.scanned_at;
  elsif p_status = 'delivered' then
    update public.market_pickup_records
    set status = 'delivered',
        delivered_at = now(),
        recipient_name = coalesce(nullif(p_recipient_name, ''), 'Client')
    where order_id = v_order.id;
  end if;

  return v_order;
end;
$$;

-- 2. PAIEMENT PARTAGÉ --------------------------------------------------------

-- Interne : portefeuille personnel d'un utilisateur donné, créé à la demande.
create or replace function public.pay_ensure_wallet_for(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.pay_wallets (user_id, type, label, currency, balance, last_known_balance)
  values (p_user_id, 'personal', '', 'GNF', 0, 0)
  on conflict (user_id) where type = 'personal' do nothing;

  select id into v_id
  from public.pay_wallets
  where user_id = p_user_id and type = 'personal';
  return v_id;
end;
$$;

-- Commission plateforme sur une vente (taux en pourcentage).
create or replace function public.market_commission(p_total integer, p_rate numeric)
returns integer
language sql
immutable
set search_path = public
as $$
  select round(p_total * p_rate / 100.0)::integer;
$$;

-- Paiement d'une commande : débite l'acheteur du total, crédite le revendeur
-- du total moins la « Commission revendeur B2B » (admin_commissions), écrit
-- les deux lignes pay_transactions et marque la commande payée, le tout dans
-- la même transaction. Remplace la version de 0017.
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
  select sum(i.quantity::bigint * i.unit_price) into v_items_total
  from public.market_order_items i where i.order_id = v_order.id;
  if v_items_total is null or v_items_total <= 0 or v_items_total > 2147483647 then
    raise exception 'Montant de commande invalide' using errcode = 'PY009';
  end if;
  v_total := v_items_total::integer;

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

  update public.market_orders
  set paid = true, status = 'confirmed', total = v_total, updated_at = now()
  where id = v_order.id
  returning * into v_order;

  return v_order;
end;
$$;

-- 3. RECHARGE CONFIRMÉE CÔTÉ SERVEUR -----------------------------------------

-- La demande de recharge ne crédite plus rien : elle crée une transaction
-- « pending » (commission calculée et figée à la demande). Remplace 0017.
create or replace function public.pay_topup(
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
  v_tx public.pay_transactions;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Montant invalide' using errcode = 'PY001';
  end if;

  v_wallet := public.pay_lock_wallet(p_wallet_id);

  insert into public.pay_transactions
    (user_id, wallet_id, type, status, amount, currency, counterparty, description, commission, reference, module)
  values
    (v_wallet.user_id, v_wallet.id, 'topup', 'pending', p_amount, v_wallet.currency,
     coalesce(p_provider, ''), 'Recharge du portefeuille', public.pay_service_fee(p_amount),
     public.pay_generate_reference(), 'pay')
  returning * into v_tx;

  return v_tx;
end;
$$;

-- Confirmation par le serveur (webhook de l'opérateur Mobile Money) : crédite
-- le portefeuille du montant net et passe la transaction en « confirmed ».
-- Idempotent : une référence déjà confirmée est renvoyée sans nouveau crédit.
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

  return v_tx;
end;
$$;

-- 4. ADHÉSIONS ---------------------------------------------------------------

-- Créateur de l'organisation (renseigné automatiquement à l'insertion).
alter table public.organizations
  add column if not exists created_by uuid references auth.users (id) on delete set null
  default auth.uid();

-- Reprise : pour les organisations existantes, le plus ancien admin.
update public.organizations o
set created_by = (
  select m.user_id from public.memberships m
  where m.organization_id = o.id and m.role = 'admin'
  order by m.created_at
  limit 1
)
where o.created_by is null;

-- Impossible de créer une organisation au nom d'un autre utilisateur.
drop policy if exists "organizations_insert_authenticated" on public.organizations;
create policy "organizations_insert_authenticated"
  on public.organizations for insert
  with check (auth.uid() is not null and created_by = auth.uid());

-- Seul le créateur peut s'auto-inscrire, et seulement tant que l'organisation
-- n'a aucune adhésion (security definer : l'organisation n'est pas encore
-- lisible par son créateur à ce stade, cf. organizations_select_member).
create or replace function public.org_creator_can_join(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organizations o
    where o.id = org_id and o.created_by = auth.uid()
  )
  and not exists (
    select 1 from public.memberships m where m.organization_id = org_id
  );
$$;

drop policy if exists "memberships_insert_own" on public.memberships;
create policy "memberships_insert_own"
  on public.memberships for insert
  with check (
    user_id = auth.uid()
    and public.org_creator_can_join(organization_id)
  );

-- Remplacée par org_creator_can_join.
drop function if exists public.org_has_memberships(uuid);

-- 5. JOURNAL D'AUDIT ---------------------------------------------------------

-- Liste complète des event_type (0018 + market.order_paid, pay.topup_confirmed).
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

-- Commande marché payée.
create or replace function public.audit_market_order_paid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.audit_log_event(
    null, 'market.order_paid', 'market_order', new.id, new.total, new.currency,
    jsonb_build_object('status', old.status, 'paid', old.paid),
    jsonb_build_object('status', new.status, 'paid', new.paid)
  );
  return new;
end;
$$;

drop trigger if exists audit_market_order_paid on public.market_orders;
create trigger audit_market_order_paid
  after update of paid on public.market_orders
  for each row when (new.paid and not old.paid)
  execute function public.audit_market_order_paid();

-- Recharge confirmée par le serveur.
create or replace function public.audit_pay_topup_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.audit_log_event(
    null, 'pay.topup_confirmed', 'pay_transaction', new.id, new.amount, new.currency,
    jsonb_build_object('status', old.status),
    jsonb_build_object('status', new.status, 'commission', new.commission)
  );
  return new;
end;
$$;

drop trigger if exists audit_pay_topup_confirmed on public.pay_transactions;
create trigger audit_pay_topup_confirmed
  after update of status on public.pay_transactions
  for each row when (new.type = 'topup' and new.status = 'confirmed' and old.status is distinct from new.status)
  execute function public.audit_pay_topup_confirmed();

-- 6. DROITS D'EXÉCUTION ------------------------------------------------------
revoke all on function public.market_create_order(jsonb, text, date, text) from public, anon;
revoke all on function public.market_cancel_order(uuid) from public, anon;
revoke all on function public.market_advance_order(uuid, text, text) from public, anon;
revoke all on function public.market_pay_order(uuid) from public, anon;
revoke all on function public.market_commission(integer, numeric) from public, anon;
revoke all on function public.org_creator_can_join(uuid) from public, anon;
revoke all on function public.pay_topup(integer, uuid, text) from public, anon;

grant execute on function public.market_create_order(jsonb, text, date, text) to authenticated;
grant execute on function public.market_cancel_order(uuid) to authenticated;
grant execute on function public.market_advance_order(uuid, text, text) to authenticated;
grant execute on function public.market_pay_order(uuid) to authenticated;
grant execute on function public.market_commission(integer, numeric) to authenticated;
grant execute on function public.org_creator_can_join(uuid) to authenticated;
grant execute on function public.pay_topup(integer, uuid, text) to authenticated;

-- Jamais appelables par les clients.
revoke all on function public.pay_ensure_wallet_for(uuid) from public, anon, authenticated;
revoke all on function public.pay_confirm_topup(text) from public, anon, authenticated;
revoke all on function public.audit_market_order_paid() from public, anon, authenticated;
revoke all on function public.audit_pay_topup_confirmed() from public, anon, authenticated;
grant execute on function public.pay_confirm_topup(text) to service_role;
