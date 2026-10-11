-- ============================================================================
-- 0022 — Candidature revendeur, transfert, investissement.
-- Appliquer après 0021_market_wallet_hardening.sql.
--
--  1. Candidature revendeur (RG-M01) : seul un administrateur de la plateforme
--     (platform_admins) approuve ou refuse une candidature. Plus aucune
--     écriture client sur market_reseller_applications ni market_resellers.
--  2. Transfert : le transfert par identifiant utilisateur n'est accepté que
--     vers un membre d'au moins une organisation commune.
--  3. Investissement : la contribution est payée. Le portefeuille de
--     l'investisseur est débité et le compte de séquestre du projet crédité
--     dans la même transaction.
--
-- Aucun code d'erreur ajouté : PY001 à PY019 (lib/api/pay-rpc.ts).
-- ============================================================================

-- 1. CANDIDATURE REVENDEUR (RG-M01) -------------------------------------------

-- Avant : market_apps_insert et market_apps_update laissaient le candidat
-- écrire le statut de sa propre candidature (« approved » compris).
drop policy if exists "market_apps_insert" on public.market_reseller_applications;
drop policy if exists "market_apps_update" on public.market_reseller_applications;

revoke insert, update, delete, truncate on public.market_reseller_applications from anon, authenticated;
revoke insert, update, delete, truncate on public.market_resellers from anon, authenticated;

-- Tables du back-office : RLS sans politique les ferme déjà aux clients ; les
-- privilèges hérités des valeurs par défaut sont retirés par précaution.
revoke all on public.platform_admins from anon, authenticated;
revoke all on public.admin_audit_logs from anon, authenticated;

-- Interne : l'utilisateur courant est-il administrateur de la plateforme ?
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.platform_admins a where a.user_id = auth.uid()
  );
$$;

-- Dépôt d'une candidature : toujours « pending », jamais pour un tiers. Une
-- candidature refusée peut être redéposée ; une candidature approuvée est
-- définitive.
create or replace function public.market_submit_reseller_application(
  p_company_name text,
  p_contact_name text,
  p_id_document text default '',
  p_sector text default '',
  p_country text default '',
  p_city text default ''
)
returns public.market_reseller_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_application public.market_reseller_applications;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;
  if coalesce(trim(p_company_name), '') = '' or coalesce(trim(p_contact_name), '') = '' then
    raise exception 'Candidature invalide' using errcode = 'PY009';
  end if;

  select * into v_application
  from public.market_reseller_applications where user_id = v_user
  for update;
  if v_application.status = 'approved' or exists (
    select 1 from public.market_resellers r where r.user_id = v_user
  ) then
    raise exception 'Candidature déjà approuvée' using errcode = 'PY019';
  end if;

  insert into public.market_reseller_applications
    (user_id, company_name, contact_name, id_document, sector, country, city,
     status, review_notes, submitted_at, reviewed_at)
  values
    (v_user, trim(p_company_name), trim(p_contact_name), coalesce(p_id_document, ''),
     coalesce(p_sector, ''), coalesce(p_country, ''), coalesce(p_city, ''),
     'pending', null, now(), null)
  on conflict (user_id) do update
    set company_name = excluded.company_name,
        contact_name = excluded.contact_name,
        id_document = excluded.id_document,
        sector = excluded.sector,
        country = excluded.country,
        city = excluded.city,
        status = 'pending',
        review_notes = null,
        submitted_at = now(),
        reviewed_at = null
  returning * into v_application;

  return v_application;
end;
$$;

-- Décision : réservée à un administrateur de la plateforme, jamais sur sa
-- propre candidature. L'approbation crée le compte revendeur et ses
-- paramètres ; la décision est journalisée dans admin_audit_logs (remontée
-- au Control Plane par le trigger cp_enqueue_admin_audit).
create or replace function public.market_review_reseller_application(
  p_application_id uuid,
  p_status text,
  p_review_notes text default null
)
returns public.market_reseller_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_actor text;
  v_application public.market_reseller_applications;
  v_reseller_id uuid;
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

  select * into v_application
  from public.market_reseller_applications where id = p_application_id
  for update;
  if v_application.id is null then
    raise exception 'Candidature introuvable' using errcode = 'PY018';
  end if;
  if v_application.user_id = v_user then
    raise exception 'Action non autorisée' using errcode = 'PY006';
  end if;
  if v_application.status = 'approved' then
    raise exception 'Candidature déjà approuvée' using errcode = 'PY019';
  end if;

  update public.market_reseller_applications
  set status = p_status, review_notes = p_review_notes, reviewed_at = now()
  where id = v_application.id
  returning * into v_application;

  if p_status = 'approved' then
    insert into public.market_resellers
      (user_id, company_name, country, city, sector, rating, validated_at)
    values
      (v_application.user_id, v_application.company_name, v_application.country,
       v_application.city, v_application.sector, 0, now())
    on conflict (user_id) do nothing;

    select r.id into v_reseller_id
    from public.market_resellers r where r.user_id = v_application.user_id;

    insert into public.market_reseller_settings
      (reseller_id, delivery_zones, delivery_slots, payment_details)
    values (v_reseller_id, '{}', '{}', '')
    on conflict (reseller_id) do nothing;
  end if;

  select coalesce(nullif(u.email, ''), v_user::text) into v_actor
  from auth.users u where u.id = v_user;

  insert into public.admin_audit_logs (actor, action, module, severity)
  values
    (coalesce(v_actor, v_user::text),
     'review_reseller:' || p_status || ':' || v_application.id::text,
     'market', 'info');

  return v_application;
end;
$$;

-- 2. TRANSFERT : ORGANISATION COMMUNE ----------------------------------------

-- Interne : p_other est-il rattaché (membre doté d'un compte ou adhérent) à
-- une organisation dont p_user est adhérent ?
create or replace function public.pay_shares_organization(p_user uuid, p_other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.user_id = p_user
      and (
        exists (
          select 1 from public.members mb
          where mb.organization_id = m.organization_id and mb.user_id = p_other
        )
        or exists (
          select 1 from public.memberships m2
          where m2.organization_id = m.organization_id and m2.user_id = p_other
        )
      )
  );
$$;

-- Comme 0021, sauf la désignation par identifiant utilisateur : le
-- destinataire doit partager au moins une organisation avec l'émetteur. Un
-- compte existant mais sans organisation commune reçoit la même réponse
-- qu'un compte inconnu (PY014), pour ne pas révéler quels comptes existent.
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
  v_recipient_label text := 'Membre';
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
    if p_to_user_id = v_user then
      raise exception 'Transfert vers soi-même impossible' using errcode = 'PY013';
    end if;
    if not public.pay_shares_organization(v_user, p_to_user_id) then
      raise exception 'Destinataire introuvable' using errcode = 'PY014';
    end if;
    v_recipient := p_to_user_id;
    select coalesce(nullif(mb.name, ''), 'Membre') into v_recipient_label
    from public.members mb
    join public.memberships m
      on m.organization_id = mb.organization_id and m.user_id = v_user
    where mb.user_id = v_recipient
    limit 1;
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
     coalesce(v_recipient_label, 'Membre'), 'Transfert entre membres', 0,
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

-- 3. INVESTISSEMENT : PAIEMENT ET SÉQUESTRE ----------------------------------

-- Compte de séquestre : un portefeuille sans utilisateur par projet, comme le
-- portefeuille plateforme. La politique de lecture (user_id = auth.uid()) ne
-- le rend visible à aucun client. Un projet ne peut pas être supprimé tant
-- que son séquestre existe : les fonds ne disparaissent pas avec lui.
alter table public.pay_wallets
  add column if not exists project_id uuid
  references public.market_investment_projects (id) on delete restrict;

alter table public.pay_wallets
  drop constraint if exists pay_wallets_platform_owner;
alter table public.pay_wallets
  drop constraint if exists pay_wallets_owner;
alter table public.pay_wallets
  add constraint pay_wallets_owner check (
    (type = 'platform' and user_id is null and project_id is null)
    or (type = 'escrow' and user_id is null and project_id is not null)
    or (type not in ('platform', 'escrow') and user_id is not null and project_id is null)
  );

create unique index if not exists idx_pay_wallets_escrow
  on public.pay_wallets (project_id)
  where type = 'escrow';

-- Chaque contribution garde la référence de son paiement.
alter table public.market_investment_contributions
  add column if not exists transaction_id uuid
  references public.pay_transactions (id) on delete set null;

-- Interne : compte de séquestre du projet, créé à la demande.
create or replace function public.pay_ensure_escrow_wallet(p_project_id uuid, p_currency text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.pay_wallets (user_id, project_id, type, label, currency, balance, last_known_balance)
  values (null, p_project_id, 'escrow', 'Séquestre projet d''investissement', p_currency, 0, 0)
  on conflict (project_id) where type = 'escrow' do nothing;

  select id into v_id
  from public.pay_wallets
  where project_id = p_project_id and type = 'escrow';
  return v_id;
end;
$$;

-- Contribution payée (écran « Investir dans un projet » : contribution
-- financière). Remplace 0021, qui enregistrait un engagement sans débit.
-- Ordre de verrouillage : projet, portefeuille de l'investisseur, séquestre.
-- Aucun mouvement ne sort du séquestre à ce stade.
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
  if v_project.status <> 'open' then
    raise exception 'Le projet n''est plus ouvert à l''investissement' using errcode = 'PY019';
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

-- 4. DROITS D'EXÉCUTION ------------------------------------------------------
revoke all on function public.market_submit_reseller_application(text, text, text, text, text, text) from public, anon;
revoke all on function public.market_review_reseller_application(uuid, text, text) from public, anon;
revoke all on function public.pay_transfer(integer, uuid, uuid, uuid) from public, anon;
revoke all on function public.market_invest(uuid, integer) from public, anon;

grant execute on function public.market_submit_reseller_application(text, text, text, text, text, text) to authenticated;
grant execute on function public.market_review_reseller_application(uuid, text, text) to authenticated;
grant execute on function public.pay_transfer(integer, uuid, uuid, uuid) to authenticated;
grant execute on function public.market_invest(uuid, integer) to authenticated;

-- Jamais appelables par les clients.
revoke all on function public.is_platform_admin() from public, anon, authenticated;
revoke all on function public.pay_shares_organization(uuid, uuid) from public, anon, authenticated;
revoke all on function public.pay_ensure_escrow_wallet(uuid, text) from public, anon, authenticated;

-- L'API (PostgREST) recharge son schéma : nouvelles fonctions et colonnes.
notify pgrst, 'reload schema';
