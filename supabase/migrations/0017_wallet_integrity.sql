-- ============================================
-- INTÉGRITÉ DES PORTEFEUILLES
-- Appliquer après 0016_control_plane.sql.
--
-- Avant : les politiques RLS de 0009_pay.sql laissaient le propriétaire écrire
-- directement dans pay_wallets (solde compris) et pay_transactions avec la clé
-- anon. Après : lecture seule côté client ; toute écriture passe par des
-- fonctions security definer atomiques (verrou de ligne + contrôle du solde +
-- mise à jour + écriture de la transaction dans la même transaction SQL).
-- ============================================

-- --------------------------------------------
-- 1. Plus aucune écriture client sur les portefeuilles et les transactions
-- --------------------------------------------
drop policy if exists "pay_wallets_insert" on public.pay_wallets;
drop policy if exists "pay_wallets_update" on public.pay_wallets;
drop policy if exists "pay_wallets_delete" on public.pay_wallets;
drop policy if exists "pay_transactions_insert" on public.pay_transactions;
drop policy if exists "pay_transactions_update" on public.pay_transactions;
drop policy if exists "pay_transactions_delete" on public.pay_transactions;

-- Ceinture et bretelles : même si une politique permissive était recréée par
-- erreur, les rôles client n'ont plus le privilège d'écriture sur ces tables.
-- Les politiques pay_wallets_select / pay_transactions_select sont conservées.
revoke insert, update, delete, truncate on public.pay_wallets from anon, authenticated;
revoke insert, update, delete, truncate on public.pay_transactions from anon, authenticated;

-- Un solde ne peut jamais être négatif. "not valid" : la contrainte s'applique
-- aux écritures à venir sans bloquer la migration sur d'éventuelles lignes
-- existantes ; à valider après contrôle des données
-- (alter table public.pay_wallets validate constraint pay_wallets_balance_non_negative).
alter table public.pay_wallets
  drop constraint if exists pay_wallets_balance_non_negative;
alter table public.pay_wallets
  add constraint pay_wallets_balance_non_negative check (balance >= 0) not valid;

-- --------------------------------------------
-- 2. Helpers
-- Codes d'erreur (SQLSTATE) repris côté API (lib/api/pay-rpc.ts) :
--   PY001 montant invalide        PY002 portefeuille introuvable
--   PY003 solde insuffisant       PY004 non authentifié
--   PY005 commande introuvable    PY006 action non autorisée
--   PY007 commande déjà payée
-- --------------------------------------------

-- RG-P03 : commission de service (0,5 %), calculée côté base pour ne jamais
-- dépendre d'une valeur fournie par l'appelant.
create or replace function public.pay_service_fee(p_amount integer)
returns integer
language sql
immutable
set search_path = public
as $$
  select round(p_amount * 0.005)::integer;
$$;

-- RG-P02 : identifiant de transaction unique.
create or replace function public.pay_generate_reference()
returns text
language sql
volatile
set search_path = public
as $$
  select 'PAY-' || to_char(now(), 'YYYY') || '-' || upper(substr(gen_random_uuid()::text, 1, 8));
$$;

-- Portefeuille personnel unique de l'utilisateur courant, créé à la demande
-- (s'appuie sur l'index unique idx_pay_wallets_primary de 0015).
create or replace function public.pay_ensure_wallet()
returns public.pay_wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_wallet public.pay_wallets;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;

  insert into public.pay_wallets (user_id, type, label, currency, balance, last_known_balance)
  values (v_user, 'personal', '', 'GNF', 0, 0)
  on conflict (user_id) where type = 'personal' do nothing;

  select * into v_wallet
  from public.pay_wallets
  where user_id = v_user and type = 'personal';

  return v_wallet;
end;
$$;

-- Interne : verrouille (for update) le portefeuille visé de l'utilisateur
-- courant, ou son portefeuille personnel si aucun identifiant n'est fourni.
-- Non exécutable par les rôles client.
create or replace function public.pay_lock_wallet(p_wallet_id uuid)
returns public.pay_wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_wallet public.pay_wallets;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;

  if p_wallet_id is null then
    perform public.pay_ensure_wallet();
    select * into v_wallet
    from public.pay_wallets
    where user_id = v_user and type = 'personal'
    for update;
  else
    select * into v_wallet
    from public.pay_wallets
    where id = p_wallet_id and user_id = v_user
    for update;
  end if;

  if v_wallet.id is null then
    raise exception 'Portefeuille introuvable' using errcode = 'PY002';
  end if;

  return v_wallet;
end;
$$;

-- --------------------------------------------
-- 3. Opérations atomiques
-- --------------------------------------------

-- Recharge : crédite le montant net de commission.
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
  v_commission integer;
  v_balance integer;
  v_tx public.pay_transactions;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Montant invalide' using errcode = 'PY001';
  end if;

  v_wallet := public.pay_lock_wallet(p_wallet_id);
  v_commission := public.pay_service_fee(p_amount);
  v_balance := v_wallet.balance + p_amount - v_commission;

  update public.pay_wallets
  set balance = v_balance, last_known_balance = v_balance, updated_at = now()
  where id = v_wallet.id;

  insert into public.pay_transactions
    (user_id, wallet_id, type, status, amount, currency, counterparty, description, commission, reference, module)
  values
    (v_wallet.user_id, v_wallet.id, 'topup', 'confirmed', p_amount, v_wallet.currency,
     coalesce(p_provider, ''), 'Recharge du portefeuille', v_commission,
     public.pay_generate_reference(), 'pay')
  returning * into v_tx;

  return v_tx;
end;
$$;

-- Retrait : débite le montant + la commission.
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

  return v_tx;
end;
$$;

-- Transfert entre membres : débite l'émetteur, sans commission.
-- Comme dans la route existante, le destinataire est un libellé libre
-- (to_member) : aucun portefeuille destinataire n'est crédité.
create or replace function public.pay_transfer(
  p_amount integer,
  p_to_member text default '',
  p_from_wallet_id uuid default null
)
returns public.pay_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.pay_wallets;
  v_balance integer;
  v_tx public.pay_transactions;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Montant invalide' using errcode = 'PY001';
  end if;

  v_wallet := public.pay_lock_wallet(p_from_wallet_id);

  if v_wallet.balance < p_amount then
    raise exception 'Solde insuffisant' using errcode = 'PY003';
  end if;

  v_balance := v_wallet.balance - p_amount;

  update public.pay_wallets
  set balance = v_balance, last_known_balance = v_balance, updated_at = now()
  where id = v_wallet.id;

  insert into public.pay_transactions
    (user_id, wallet_id, type, status, amount, currency, counterparty, description, commission, reference, module)
  values
    (v_wallet.user_id, v_wallet.id, 'transfer', 'confirmed', p_amount, v_wallet.currency,
     coalesce(p_to_member, ''), 'Transfert entre membres', 0,
     public.pay_generate_reference(), 'pay')
  returning * into v_tx;

  return v_tx;
end;
$$;

-- Paiement d'une commande du marché depuis le portefeuille personnel.
-- La commande est verrouillée en premier : deux appels simultanés ne peuvent
-- pas la payer deux fois. Le montant vient de la commande, jamais de l'appelant.
create or replace function public.market_pay_order(p_order_id uuid)
returns public.market_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_order public.market_orders;
  v_wallet public.pay_wallets;
  v_balance integer;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;

  select * into v_order
  from public.market_orders
  where id = p_order_id
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
  if v_order.total < 0 then
    raise exception 'Montant invalide' using errcode = 'PY001';
  end if;

  v_wallet := public.pay_lock_wallet(null);

  if v_wallet.balance < v_order.total then
    raise exception 'Solde insuffisant' using errcode = 'PY003';
  end if;

  v_balance := v_wallet.balance - v_order.total;

  update public.pay_wallets
  set balance = v_balance, last_known_balance = v_balance, updated_at = now()
  where id = v_wallet.id;

  insert into public.pay_transactions
    (user_id, wallet_id, type, status, amount, currency, counterparty, description, commission, reference, module)
  values
    (v_user, v_wallet.id, 'payment', 'confirmed', v_order.total, v_wallet.currency,
     v_order.reseller_name, 'Paiement commande marché', 0,
     public.pay_generate_reference(), 'market');

  update public.market_orders
  set paid = true, status = 'confirmed', updated_at = now()
  where id = v_order.id
  returning * into v_order;

  return v_order;
end;
$$;

-- --------------------------------------------
-- 4. Droits d'exécution : utilisateurs authentifiés uniquement
-- --------------------------------------------
revoke all on function public.pay_service_fee(integer) from public, anon;
revoke all on function public.pay_generate_reference() from public, anon;
revoke all on function public.pay_ensure_wallet() from public, anon;
revoke all on function public.pay_lock_wallet(uuid) from public, anon, authenticated;
revoke all on function public.pay_topup(integer, uuid, text) from public, anon;
revoke all on function public.pay_withdraw(integer, uuid, text) from public, anon;
revoke all on function public.pay_transfer(integer, text, uuid) from public, anon;
revoke all on function public.market_pay_order(uuid) from public, anon;

grant execute on function public.pay_service_fee(integer) to authenticated;
grant execute on function public.pay_generate_reference() to authenticated;
grant execute on function public.pay_ensure_wallet() to authenticated;
grant execute on function public.pay_topup(integer, uuid, text) to authenticated;
grant execute on function public.pay_withdraw(integer, uuid, text) to authenticated;
grant execute on function public.pay_transfer(integer, text, uuid) to authenticated;
grant execute on function public.market_pay_order(uuid) to authenticated;

-- --------------------------------------------
-- 5. Adhésions : fermeture de l'auto-promotion admin
-- La politique memberships_insert_own de 0002 (with check user_id = auth.uid())
-- laissait n'importe quel utilisateur s'insérer comme 'admin' de n'importe
-- quelle organisation, ce qui contournait members_update_admin /
-- members_delete_admin. On ne garde que le cas légitime existant : le créateur
-- d'une organisation qui n'a encore aucune adhésion (app/api/organizations).
-- --------------------------------------------
create or replace function public.org_has_memberships(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m where m.organization_id = org_id
  );
$$;

revoke all on function public.org_has_memberships(uuid) from public, anon;
grant execute on function public.org_has_memberships(uuid) to authenticated;

drop policy if exists "memberships_insert_own" on public.memberships;
create policy "memberships_insert_own"
  on public.memberships for insert
  with check (
    user_id = auth.uid()
    and not public.org_has_memberships(organization_id)
  );
