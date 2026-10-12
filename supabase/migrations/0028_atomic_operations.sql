-- ============================================================================
-- 0028 — Opérations atomiques de la vie associative, de la finance
-- communautaire et du Hub.
-- Appliquer après 0027_authorized_writes.sql.
--
-- Les routes du serveur web enchaînaient plusieurs écritures sans
-- transaction : un échec au milieu laissait un groupe sans membres, un
-- versement validé sans total mis à jour, un prêt approuvé sans échéances.
-- Chaque opération devient une fonction SQL (une transaction, des verrous de
-- ligne, un contrôle du rôle de l'appelant), appelable directement par
-- l'application Flutter. Les écritures directes correspondantes sont fermées.
--
--  1. Hub : favoris, messages, préférences
--  2. Cotisations
--  3. Groupes financiers : création, versements (RG-F04, RG-F05)
--  4. Parrainage (RG-F02)
--  5. Prêts internes (RG-F06)
--  6. Fonds de garantie : décision sur une demande d'indemnisation
--  7. Projets, réunions, mobilité
--  8. Comptabilité : consolidation
--
-- Ces opérations tiennent des REGISTRES : comme avant, elles ne déplacent
-- aucun argent du portefeuille AssoShop Pay. Aucun versement n'est donc
-- considéré comme reçu sans validation de la trésorerie.
-- ============================================================================

-- 1. HUB ---------------------------------------------------------------------
-- Tables personnelles (politiques « user_id = auth.uid() ») : les fonctions
-- s'exécutent avec les droits de l'appelant.

-- Ajoute le favori s'il est absent, le retire sinon. Renvoie la liste à jour.
create or replace function public.hub_toggle_favorite(
  p_type text,
  p_label text,
  p_detail text default ''
)
returns setof public.hub_favorites
language plpgsql
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_deleted integer;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;
  if coalesce(trim(p_type), '') = '' or coalesce(trim(p_label), '') = '' then
    raise exception 'Type et libellé requis' using errcode = 'PY009';
  end if;

  -- Deux bascules simultanées du même favori ne créent pas de doublon.
  perform pg_advisory_xact_lock(hashtextextended(v_user::text || '|' || p_type || '|' || p_label, 0));

  delete from public.hub_favorites f
  where f.user_id = v_user and f.type = p_type and f.label = p_label;
  get diagnostics v_deleted = row_count;

  if v_deleted = 0 then
    insert into public.hub_favorites (user_id, type, label, detail)
    values (v_user, p_type, p_label, coalesce(p_detail, ''));
  end if;

  return query
    select * from public.hub_favorites f where f.user_id = v_user order by f.created_at desc;
end;
$$;

-- Ajoute un message à une conversation de l'appelant et met à jour son aperçu.
create or replace function public.hub_send_message(p_conversation_id uuid, p_body text)
returns public.hub_messages
language plpgsql
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_body text := trim(coalesce(p_body, ''));
  v_message public.hub_messages;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;
  if v_body = '' or length(v_body) > 4000 then
    raise exception 'Message invalide' using errcode = 'PY009';
  end if;

  perform 1 from public.hub_conversations c
  where c.id = p_conversation_id and c.user_id = v_user
  for update;
  if not found then
    raise exception 'Conversation introuvable' using errcode = 'PY018';
  end if;

  insert into public.hub_messages (conversation_id, sender, body)
  values (p_conversation_id, 'me', v_body)
  returning * into v_message;

  update public.hub_conversations
  set last_message = v_body, updated_at = now()
  where id = p_conversation_id;

  return v_message;
end;
$$;

-- Remplace d'un bloc les préférences de notification de l'appelant.
-- p_preferences : [{ "channel": "in_app", "event_type": "…", "enabled": true }]
create or replace function public.hub_set_preferences(p_preferences jsonb)
returns setof public.hub_preferences
language plpgsql
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;
  if p_preferences is null or jsonb_typeof(p_preferences) <> 'array' or jsonb_array_length(p_preferences) > 200 then
    raise exception 'Préférences invalides' using errcode = 'PY009';
  end if;

  delete from public.hub_preferences p where p.user_id = v_user;

  insert into public.hub_preferences (user_id, channel, event_type, enabled)
  select v_user,
         coalesce(nullif(item->>'channel', ''), 'in_app'),
         coalesce(item->>'event_type', ''),
         coalesce((item->>'enabled')::boolean, true)
  from jsonb_array_elements(p_preferences) as item;

  return query
    select * from public.hub_preferences p where p.user_id = v_user order by p.event_type;
end;
$$;

-- 2. COTISATIONS -------------------------------------------------------------

-- Déclaration d'un paiement de cotisation, pour soi ou pour un tiers. Toujours
-- « pending » : la cotisation n'est payée qu'après validation par la
-- trésorerie (route existante, politique contrib_update).
create or replace function public.contribution_declare(
  p_organization_id uuid,
  p_member_id uuid,
  p_amount integer,
  p_method text,
  p_contribution_id uuid default null
)
returns public.contributions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_row public.contributions;
  v_months constant text[] := array[
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;
  if not public.org_is_member(p_organization_id) then
    raise exception 'Action non autorisée' using errcode = 'PY006';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Montant invalide' using errcode = 'PY001';
  end if;
  if p_method is null or p_method not in ('online', 'cash') then
    raise exception 'Méthode invalide' using errcode = 'PY009';
  end if;
  if not exists (
    select 1 from public.members m
    where m.id = p_member_id and m.organization_id = p_organization_id
  ) then
    raise exception 'Membre introuvable' using errcode = 'PY018';
  end if;

  if p_contribution_id is not null then
    select * into v_row
    from public.contributions c
    where c.id = p_contribution_id and c.organization_id = p_organization_id
    for update;
    if v_row.id is null then
      raise exception 'Cotisation introuvable' using errcode = 'PY018';
    end if;
    if v_row.member_id <> p_member_id::text then
      raise exception 'Cette cotisation concerne un autre membre' using errcode = 'PY009';
    end if;
    if v_row.status not in ('due', 'overdue', 'rejected') then
      raise exception 'Cotisation déjà déclarée ou payée' using errcode = 'PY019';
    end if;

    update public.contributions
    set amount = p_amount, method = p_method, status = 'pending',
        paid_at = null, paid_by = public.org_member_name(p_organization_id), validated_by = null
    where id = p_contribution_id
    returning * into v_row;
    return v_row;
  end if;

  insert into public.contributions
    (organization_id, member_id, amount, period_label, due_date, status, method, paid_by)
  values
    (p_organization_id, p_member_id::text, p_amount,
     v_months[extract(month from now())::integer] || ' ' || extract(year from now())::integer,
     now(), 'pending', p_method, public.org_member_name(p_organization_id))
  returning * into v_row;
  return v_row;
end;
$$;

drop policy if exists "contrib_insert" on public.contributions;
revoke insert on public.contributions from anon, authenticated;

-- 3. GROUPES FINANCIERS ------------------------------------------------------

-- Création d'un groupe par le bureau : groupe, créateur, membres et ordre de
-- passage (tontine), réglages — ou rien.
create or replace function public.group_create(
  p_organization_id uuid,
  p_name text,
  p_type text,
  p_amount integer,
  p_periodicity text,
  p_max_members integer,
  p_goal_amount integer default null,
  p_interest_rate integer default null,
  p_start_date date default null,
  p_turn_member_names text[] default '{}'
)
returns public.financial_groups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_group public.financial_groups;
  v_start timestamptz := case when p_start_date is null then null else p_start_date::timestamp at time zone 'UTC' end;
  v_interval interval := case when p_periodicity = 'weekly' then interval '7 days' else interval '30 days' end;
  v_name text;
  v_member_id uuid;
  v_position integer := 0;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;
  if not public.org_is_bureau(p_organization_id) then
    raise exception 'Action non autorisée' using errcode = 'PY006';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'Nom du groupe requis' using errcode = 'PY009';
  end if;
  if p_type is null or p_type not in ('tontine', 'savings_goal', 'savings') then
    raise exception 'Type de groupe invalide' using errcode = 'PY009';
  end if;
  if p_periodicity is null or p_periodicity not in ('weekly', 'monthly') then
    raise exception 'Périodicité invalide' using errcode = 'PY009';
  end if;
  if p_max_members is null or p_max_members < 2 or p_max_members > 500 then
    raise exception 'Nombre de membres invalide' using errcode = 'PY009';
  end if;
  if p_amount is null or p_amount <= 0 or (p_goal_amount is not null and p_goal_amount <= 0) then
    raise exception 'Montant invalide' using errcode = 'PY001';
  end if;
  if p_interest_rate is not null and (p_interest_rate < 0 or p_interest_rate > 100) then
    raise exception 'Taux d''intérêt invalide' using errcode = 'PY009';
  end if;

  insert into public.financial_groups
    (organization_id, name, type, status, amount, periodicity, max_members, goal_amount, interest_rate, start_date, raised_amount)
  values
    (p_organization_id, trim(p_name), p_type, 'forming', p_amount, p_periodicity, p_max_members,
     p_goal_amount, p_interest_rate, v_start, 0)
  returning * into v_group;

  insert into public.group_members (group_id, user_id, name, role, engagement, joined_at)
  values (v_group.id, v_user, coalesce(nullif(public.org_member_name(p_organization_id), ''), 'Bureau de l''association'),
          'creator', 'reliable', now());

  -- RG-F03 : l'ordre de passage d'une tontine est fixé à la création.
  if p_type = 'tontine' then
    for v_name in
      select trim(t.name)
      from unnest(coalesce(p_turn_member_names, '{}')) with ordinality as t(name, position)
      where coalesce(trim(t.name), '') <> ''
      order by t.position
      limit p_max_members - 1
    loop
      insert into public.group_members (group_id, user_id, name, role, engagement, joined_at)
      values (v_group.id, null, v_name, 'member', 'reliable', now())
      returning id into v_member_id;

      insert into public.group_turns (group_id, member_id, member_name, position, expected_date, received)
      values (v_group.id, v_member_id, v_name, v_position + 1,
              coalesce(v_start, now()) + v_position * v_interval, false);
      v_position := v_position + 1;
    end loop;
  end if;

  insert into public.group_settings (group_id, visibility, allow_join_requests, notify_payment_reminders)
  values (v_group.id, 'private', false, true);

  return v_group;
end;
$$;

-- Administrateur du groupe : son créateur.
create or replace function public.group_is_creator(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = p_group_id and gm.user_id = auth.uid() and gm.role = 'creator'
  );
$$;

-- Déclaration d'un versement. RG-F04 : payeur et bénéficiaire enregistrés
-- séparément. RG-F05 : toujours « pending » ; le total du groupe ne bouge
-- qu'à la validation.
create or replace function public.group_declare_payment(
  p_group_id uuid,
  p_member_id uuid,
  p_amount integer,
  p_method text,
  p_paid_for_member_id uuid default null
)
returns public.group_payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_group public.financial_groups;
  v_payer public.group_members;
  v_beneficiary_name text;
  v_payment public.group_payments;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Montant invalide' using errcode = 'PY001';
  end if;
  if p_method is null or p_method not in ('cash', 'mobile') then
    raise exception 'Méthode invalide' using errcode = 'PY009';
  end if;

  select * into v_group from public.financial_groups where id = p_group_id;
  if v_group.id is null then
    raise exception 'Groupe introuvable' using errcode = 'PY018';
  end if;
  if not public.org_is_member(v_group.organization_id) then
    raise exception 'Action non autorisée' using errcode = 'PY006';
  end if;
  if v_group.status = 'closed' then
    raise exception 'Groupe clôturé' using errcode = 'PY019';
  end if;

  select * into v_payer from public.group_members gm where gm.id = p_member_id and gm.group_id = p_group_id;
  if v_payer.id is null then
    raise exception 'Membre du groupe introuvable' using errcode = 'PY018';
  end if;
  -- On ne déclare que ses propres versements, sauf trésorerie ou créateur.
  if v_payer.user_id is distinct from v_user
     and not public.org_is_treasurer(v_group.organization_id)
     and not public.group_is_creator(p_group_id) then
    raise exception 'Action non autorisée' using errcode = 'PY006';
  end if;

  if p_paid_for_member_id is not null then
    select gm.name into v_beneficiary_name
    from public.group_members gm
    where gm.id = p_paid_for_member_id and gm.group_id = p_group_id;
    if v_beneficiary_name is null then
      raise exception 'Bénéficiaire introuvable dans le groupe' using errcode = 'PY018';
    end if;
  end if;

  insert into public.group_payments
    (group_id, member_id, member_name, method, amount, paid_for_member_name, status, paid_at)
  values
    (p_group_id, v_payer.id, v_payer.name, p_method, p_amount, v_beneficiary_name, 'pending', null)
  returning * into v_payment;
  return v_payment;
end;
$$;

-- Validation manuelle par la trésorerie ou le créateur du groupe (RG-F05) :
-- versement confirmé et total du groupe mis à jour, ensemble.
create or replace function public.group_validate_payment(p_payment_id uuid)
returns public.group_payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group public.financial_groups;
  v_payment public.group_payments;
begin
  if auth.uid() is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;

  -- Ordre des verrous : groupe, puis versement.
  select g.* into v_group
  from public.financial_groups g
  join public.group_payments p on p.group_id = g.id
  where p.id = p_payment_id
  for update of g;
  if v_group.id is null then
    raise exception 'Versement introuvable' using errcode = 'PY018';
  end if;
  if not public.org_is_treasurer(v_group.organization_id) and not public.group_is_creator(v_group.id) then
    raise exception 'Action non autorisée' using errcode = 'PY006';
  end if;

  select * into v_payment from public.group_payments where id = p_payment_id for update;
  if v_payment.status <> 'pending' then
    raise exception 'Versement déjà validé' using errcode = 'PY019';
  end if;

  update public.group_payments
  set status = 'confirmed', paid_at = now()
  where id = p_payment_id
  returning * into v_payment;

  update public.financial_groups
  set raised_amount = raised_amount + v_payment.amount
  where id = v_group.id;

  update public.group_members set last_payment_at = now() where id = v_payment.member_id;

  return v_payment;
end;
$$;

drop policy if exists "fg_insert" on public.financial_groups;
drop policy if exists "gm_insert" on public.group_members;
drop policy if exists "gt_insert" on public.group_turns;
drop policy if exists "gs_insert" on public.group_settings;
drop policy if exists "gp_insert" on public.group_payments;
drop policy if exists "gp_update" on public.group_payments;

revoke insert on public.financial_groups, public.group_members, public.group_turns, public.group_settings
  from anon, authenticated;
revoke all on public.group_payments from anon, authenticated;
grant select on public.group_payments to authenticated;

-- 4. PARRAINAGE --------------------------------------------------------------

alter table public.sponsorship_requests
  add column if not exists invitee_user_id uuid references auth.users (id) on delete set null;

-- RG-F02 : c'est le nouveau membre LUI-MÊME qui confirme son adhésion, après
-- acceptation du parrain. Il est reconnu par son compte, ou par le numéro de
-- téléphone vérifié de son compte s'il correspond à celui saisi par le parrain.
create or replace function public.sponsorship_confirm(p_request_id uuid)
returns public.sponsorship_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_request public.sponsorship_requests;
  v_group public.financial_groups;
  v_phone text;
  v_invitee_phone text;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;

  select * into v_request from public.sponsorship_requests where id = p_request_id for update;
  if v_request.id is null then
    raise exception 'Demande introuvable' using errcode = 'PY018';
  end if;

  if v_request.invitee_user_id is distinct from v_user then
    select regexp_replace(coalesce(u.phone, ''), '[^0-9]', '', 'g') into v_phone
    from auth.users u
    where u.id = v_user and u.phone_confirmed_at is not null;
    v_invitee_phone := regexp_replace(coalesce(v_request.invitee_phone, ''), '[^0-9]', '', 'g');
    if v_request.invitee_user_id is not null
       or coalesce(v_phone, '') = '' or length(v_invitee_phone) < 8
       or v_phone <> v_invitee_phone then
      raise exception 'Action non autorisée' using errcode = 'PY006';
    end if;
  end if;

  if v_request.status <> 'sponsor_accepted' then
    raise exception 'Demande non confirmable dans son état actuel' using errcode = 'PY019';
  end if;

  select * into v_group from public.financial_groups where id = v_request.group_id for update;
  if v_group.status = 'closed' then
    raise exception 'Groupe clôturé' using errcode = 'PY019';
  end if;

  if not exists (
    select 1 from public.group_members gm
    where gm.group_id = v_request.group_id and gm.user_id = v_user
  ) then
    if (select count(*) from public.group_members gm where gm.group_id = v_request.group_id) >= v_group.max_members then
      raise exception 'Groupe complet' using errcode = 'PY019';
    end if;
    insert into public.group_members (group_id, user_id, name, role, engagement, joined_at)
    values (v_request.group_id, v_user, v_request.invitee_name, 'member', 'reliable', now());
  end if;

  update public.sponsorship_requests
  set status = 'confirmed', invitee_user_id = v_user
  where id = p_request_id
  returning * into v_request;
  return v_request;
end;
$$;

-- L'administrateur de l'organisation enregistre et fait avancer la demande,
-- mais ne peut plus la confirmer à la place du nouveau membre.
drop policy if exists "sr_update" on public.sponsorship_requests;
create policy "sr_update" on public.sponsorship_requests
  for update
  using (
    status <> 'confirmed'
    and exists (
      select 1 from public.financial_groups g
      where g.id = sponsorship_requests.group_id and public.is_org_admin(g.organization_id)
    )
  )
  with check (
    status in ('pending', 'sponsor_accepted', 'declined')
    and exists (
      select 1 from public.financial_groups g
      where g.id = sponsorship_requests.group_id and public.is_org_admin(g.organization_id)
    )
  );

revoke update on public.sponsorship_requests from anon, authenticated;
grant update (status) on public.sponsorship_requests to authenticated;

-- 5. PRÊTS INTERNES ----------------------------------------------------------

-- L'emprunteur est-il l'appelant ? (loans.member_id désigne une fiche
-- group_members.)
create or replace function public.loan_is_borrower(p_loan public.loans)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members gm
    where gm.id::text = p_loan.member_id and gm.group_id = p_loan.group_id and gm.user_id = auth.uid()
  );
$$;

-- RG-F06 : accord du comité (bureau) après confirmation du parrain. Le prêt
-- approuvé et ses trois échéances mensuelles sont créés ensemble.
create or replace function public.loan_decide(p_loan_id uuid, p_approve boolean)
returns public.loans
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loan public.loans;
  v_org uuid;
  v_total integer;
  v_per integer;
  c_count constant integer := 3;
begin
  if auth.uid() is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;
  if p_approve is null then
    raise exception 'Décision invalide' using errcode = 'PY009';
  end if;

  select * into v_loan from public.loans where id = p_loan_id for update;
  if v_loan.id is null then
    raise exception 'Prêt introuvable' using errcode = 'PY018';
  end if;
  select g.organization_id into v_org from public.financial_groups g where g.id = v_loan.group_id;
  -- Jamais sur son propre prêt.
  if not public.org_is_bureau(v_org) or public.loan_is_borrower(v_loan) then
    raise exception 'Action non autorisée' using errcode = 'PY006';
  end if;
  if v_loan.status <> 'sponsor_confirmed' then
    raise exception 'Prêt non décidable : confirmation du parrain requise, ou décision déjà prise' using errcode = 'PY019';
  end if;

  if not p_approve then
    update public.loans
    set status = 'rejected', decision_at = now()
    where id = p_loan_id
    returning * into v_loan;
    return v_loan;
  end if;

  v_total := round(v_loan.amount * (1 + v_loan.interest_rate / 100.0))::integer;
  v_per := v_total / c_count;

  update public.loans
  set status = 'approved', total_due = v_total, decision_at = now()
  where id = p_loan_id
  returning * into v_loan;

  insert into public.loan_installments (loan_id, position, due_date, amount, status)
  select p_loan_id, n, now() + n * interval '30 days',
         v_per + case when n = c_count then v_total - v_per * c_count else 0 end,
         'pending'
  from generate_series(1, c_count) as n;

  return v_loan;
end;
$$;

-- Remboursement d'une échéance, enregistré par la trésorerie (jamais par
-- l'emprunteur lui-même). Le prêt passe à « repaid » quand tout est remboursé.
create or replace function public.loan_repay_installment(p_installment_id uuid)
returns public.loans
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loan public.loans;
  v_installment public.loan_installments;
  v_org uuid;
begin
  if auth.uid() is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;

  -- Ordre des verrous : prêt, puis échéance.
  select l.* into v_loan
  from public.loans l
  join public.loan_installments i on i.loan_id = l.id
  where i.id = p_installment_id
  for update of l;
  if v_loan.id is null then
    raise exception 'Échéance introuvable' using errcode = 'PY018';
  end if;
  select g.organization_id into v_org from public.financial_groups g where g.id = v_loan.group_id;
  if not public.org_is_treasurer(v_org) or public.loan_is_borrower(v_loan) then
    raise exception 'Action non autorisée' using errcode = 'PY006';
  end if;

  select * into v_installment from public.loan_installments where id = p_installment_id for update;
  if v_loan.status <> 'approved' or v_installment.status <> 'pending' then
    raise exception 'Échéance déjà remboursée' using errcode = 'PY019';
  end if;

  update public.loan_installments set status = 'paid', paid_at = now() where id = p_installment_id;

  update public.loans
  set repaid_amount = repaid_amount + v_installment.amount,
      status = case when repaid_amount + v_installment.amount >= total_due then 'repaid' else status end
  where id = v_loan.id
  returning * into v_loan;
  return v_loan;
end;
$$;

drop policy if exists "li_insert" on public.loan_installments;
drop policy if exists "li_update" on public.loan_installments;
revoke all on public.loan_installments from anon, authenticated;
grant select on public.loan_installments to authenticated;

-- 6. FONDS DE GARANTIE -------------------------------------------------------

-- Décision du bureau sur une demande d'indemnisation, jamais par le demandeur.
-- L'indemnité est prélevée sur le fonds dans la même transaction ; elle est
-- refusée si le fonds ne la couvre pas.
create or replace function public.claim_decide(p_claim_id uuid, p_approve boolean)
returns public.insurance_claims
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_claim public.insurance_claims;
  v_fund public.guarantee_fund;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;
  if p_approve is null then
    raise exception 'Décision invalide' using errcode = 'PY009';
  end if;

  select * into v_claim from public.insurance_claims where id = p_claim_id for update;
  if v_claim.id is null then
    raise exception 'Demande introuvable' using errcode = 'PY018';
  end if;
  if not public.org_is_bureau(v_claim.organization_id) or exists (
    select 1 from public.members m
    where m.id::text = v_claim.member_id and m.organization_id = v_claim.organization_id and m.user_id = v_user
  ) then
    raise exception 'Action non autorisée' using errcode = 'PY006';
  end if;
  if v_claim.status not in ('submitted', 'under_review') then
    raise exception 'Demande déjà traitée' using errcode = 'PY019';
  end if;

  if p_approve then
    insert into public.guarantee_fund (organization_id)
    values (v_claim.organization_id)
    on conflict (organization_id) do nothing;

    select * into v_fund
    from public.guarantee_fund f
    where f.organization_id = v_claim.organization_id
    for update;
    if v_fund.balance < v_claim.amount then
      raise exception 'Solde insuffisant' using errcode = 'PY003';
    end if;

    update public.guarantee_fund
    set balance = balance - v_claim.amount, total_used = total_used + v_claim.amount
    where organization_id = v_claim.organization_id;
  end if;

  update public.insurance_claims
  set status = case when p_approve then 'approved' else 'rejected' end,
      indemnity = case when p_approve then amount else 0 end,
      decided_at = now()
  where id = p_claim_id
  returning * into v_claim;
  return v_claim;
end;
$$;

drop policy if exists "ic_update" on public.insurance_claims;
revoke update on public.insurance_claims from anon, authenticated;

-- 7. PROJETS, RÉUNIONS, MOBILITÉ ---------------------------------------------

alter table public.project_contributions
  add column if not exists user_id uuid references auth.users (id) on delete set null;

-- Contribution d'un membre à un projet en cours. Registre d'engagements :
-- aucun mouvement de portefeuille.
create or replace function public.project_contribute(
  p_project_id uuid,
  p_amount integer,
  p_anonymous boolean default false
)
returns public.projects
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_project public.projects;
  v_anonymous boolean := coalesce(p_anonymous, false);
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Montant invalide' using errcode = 'PY001';
  end if;

  select * into v_project from public.projects where id = p_project_id for update;
  if v_project.id is null then
    raise exception 'Projet introuvable' using errcode = 'PY018';
  end if;
  if not public.org_is_member(v_project.organization_id) then
    raise exception 'Action non autorisée' using errcode = 'PY006';
  end if;
  if v_project.status <> 'in_progress' then
    raise exception 'Ce projet n''est plus ouvert aux contributions' using errcode = 'PY019';
  end if;
  if v_project.raised_amount > 2147483647 - p_amount then
    raise exception 'Montant invalide' using errcode = 'PY001';
  end if;

  insert into public.project_contributions (project_id, contributor_name, amount, anonymous, contributed_at, user_id)
  values (
    p_project_id,
    case when v_anonymous then 'Donateur anonyme' else public.org_member_name(v_project.organization_id) end,
    p_amount, v_anonymous, now(),
    case when v_anonymous then null else v_user end
  );

  update public.projects
  set raised_amount = raised_amount + p_amount,
      status = case when raised_amount + p_amount >= goal_amount then 'completed' else status end
  where id = p_project_id
  returning * into v_project;
  return v_project;
end;
$$;

drop policy if exists "pc_insert" on public.project_contributions;
revoke all on public.project_contributions from anon, authenticated;
grant select on public.project_contributions to authenticated;

-- Pointage d'un participant à une réunion : président, secrétaire ou adjoints.
create or replace function public.meeting_check_in(p_attendee_id uuid, p_status text)
returns public.meeting_attendees
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attendee public.meeting_attendees;
  v_org uuid;
begin
  if auth.uid() is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;
  if p_status is null or p_status not in ('invited', 'present', 'absent', 'excused') then
    raise exception 'Statut invalide' using errcode = 'PY009';
  end if;

  select * into v_attendee from public.meeting_attendees where id = p_attendee_id for update;
  if v_attendee.id is null then
    raise exception 'Participant introuvable' using errcode = 'PY018';
  end if;
  select m.organization_id into v_org from public.meetings m where m.id = v_attendee.meeting_id;
  if not public.org_has_role(v_org, 'president', 'vice_president', 'secretary', 'vice_secretary') then
    raise exception 'Action non autorisée' using errcode = 'PY006';
  end if;

  update public.meeting_attendees
  set status = p_status,
      checked_in_at = case when p_status = 'present' then now() else null end
  where id = p_attendee_id
  returning * into v_attendee;
  return v_attendee;
end;
$$;

drop policy if exists "ma_update" on public.meeting_attendees;
revoke update on public.meeting_attendees from anon, authenticated;

-- RG-C14 : décision du bureau de l'association d'accueil sur un transfert.
-- Une décision par déménagement ; une fois prise, elle n'est plus modifiable.
create or replace function public.transfer_decide(
  p_organization_id uuid,
  p_relocation_id text,
  p_status text,
  p_sponsorship text default null,
  p_note text default null
)
returns public.transfer_decisions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_decision public.transfer_decisions;
  v_member_id text;
begin
  if auth.uid() is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;
  if not public.org_is_bureau(p_organization_id) then
    raise exception 'Action non autorisée' using errcode = 'PY006';
  end if;
  if p_status is null or p_status not in ('pending', 'accepted', 'rejected') then
    raise exception 'Statut invalide' using errcode = 'PY009';
  end if;

  select r.member_id into v_member_id
  from public.mobility_reports r
  where r.organization_id = p_organization_id and r.relocation_id = p_relocation_id
  limit 1;
  if v_member_id is null then
    select r.member_id into v_member_id
    from public.relocations r
    where r.organization_id = p_organization_id and r.id::text = p_relocation_id;
  end if;
  if v_member_id is null then
    raise exception 'Déménagement introuvable' using errcode = 'PY018';
  end if;

  -- Deux décisions simultanées sur le même déménagement n'en créent qu'une.
  perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text || '|' || p_relocation_id, 0));

  select * into v_decision
  from public.transfer_decisions d
  where d.organization_id = p_organization_id and d.relocation_id = p_relocation_id
  for update;

  if v_decision.id is null then
    insert into public.transfer_decisions
      (organization_id, relocation_id, member_id, status, sponsorship, decision_note, decided_by, decided_at)
    values
      (p_organization_id, p_relocation_id, v_member_id, p_status, p_sponsorship, p_note,
       public.org_member_name(p_organization_id), now())
    returning * into v_decision;
    return v_decision;
  end if;

  if v_decision.status <> 'pending' then
    raise exception 'Décision déjà prise' using errcode = 'PY019';
  end if;

  update public.transfer_decisions
  set status = p_status, sponsorship = p_sponsorship, decision_note = p_note,
      decided_by = public.org_member_name(p_organization_id), decided_at = now()
  where id = v_decision.id
  returning * into v_decision;
  return v_decision;
end;
$$;

drop policy if exists "td_insert" on public.transfer_decisions;
drop policy if exists "td_update" on public.transfer_decisions;
revoke all on public.transfer_decisions from anon, authenticated;
grant select on public.transfer_decisions to authenticated;

-- 8. COMPTABILITÉ ------------------------------------------------------------

-- Consolidation par la trésorerie : chaque mouvement est marqué consolidé et
-- son écriture comptable créée, ensemble. Un mouvement déjà consolidé, ou
-- étranger à l'organisation, est ignoré : la fonction est rejouable.
create or replace function public.accounting_consolidate(
  p_organization_id uuid,
  p_movement_ids uuid[]
)
returns setof public.accounting_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_movement public.consolidation_movements;
  v_entry public.accounting_entries;
  v_validator text;
begin
  if auth.uid() is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;
  if not public.org_is_treasurer(p_organization_id) then
    raise exception 'Action non autorisée' using errcode = 'PY006';
  end if;
  v_validator := public.org_member_name(p_organization_id);

  for v_movement in
    select * from public.consolidation_movements m
    where m.id = any (coalesce(p_movement_ids, '{}'))
      and m.organization_id = p_organization_id
      and not m.consolidated
    order by m.id
    for update
  loop
    update public.consolidation_movements set consolidated = true where id = v_movement.id;

    insert into public.accounting_entries
      (organization_id, source, account_type, entry_type, label, amount, payer_name, beneficiary_name,
       status, requires_double_validation, validated_by, created_at, validated_at)
    values
      (p_organization_id, v_movement.source, v_movement.account_type, v_movement.entry_type, v_movement.label,
       v_movement.amount, v_movement.payer_name, v_movement.beneficiary_name,
       'confirmed', false, v_validator, coalesce(v_movement.date, now()), coalesce(v_movement.date, now()))
    returning * into v_entry;
    return next v_entry;
  end loop;
  return;
end;
$$;

drop policy if exists "cm_update" on public.consolidation_movements;
revoke update on public.consolidation_movements from anon, authenticated;

-- 9. DROITS D'EXÉCUTION ------------------------------------------------------
revoke all on function public.hub_toggle_favorite(text, text, text) from public, anon;
revoke all on function public.hub_send_message(uuid, text) from public, anon;
revoke all on function public.hub_set_preferences(jsonb) from public, anon;
revoke all on function public.contribution_declare(uuid, uuid, integer, text, uuid) from public, anon;
revoke all on function public.group_create(uuid, text, text, integer, text, integer, integer, integer, date, text[]) from public, anon;
revoke all on function public.group_is_creator(uuid) from public, anon;
revoke all on function public.group_declare_payment(uuid, uuid, integer, text, uuid) from public, anon;
revoke all on function public.group_validate_payment(uuid) from public, anon;
revoke all on function public.sponsorship_confirm(uuid) from public, anon;
revoke all on function public.loan_is_borrower(public.loans) from public, anon, authenticated;
revoke all on function public.loan_decide(uuid, boolean) from public, anon;
revoke all on function public.loan_repay_installment(uuid) from public, anon;
revoke all on function public.claim_decide(uuid, boolean) from public, anon;
revoke all on function public.project_contribute(uuid, integer, boolean) from public, anon;
revoke all on function public.meeting_check_in(uuid, text) from public, anon;
revoke all on function public.transfer_decide(uuid, text, text, text, text) from public, anon;
revoke all on function public.accounting_consolidate(uuid, uuid[]) from public, anon;

grant execute on function public.hub_toggle_favorite(text, text, text) to authenticated;
grant execute on function public.hub_send_message(uuid, text) to authenticated;
grant execute on function public.hub_set_preferences(jsonb) to authenticated;
grant execute on function public.contribution_declare(uuid, uuid, integer, text, uuid) to authenticated;
grant execute on function public.group_create(uuid, text, text, integer, text, integer, integer, integer, date, text[]) to authenticated;
grant execute on function public.group_is_creator(uuid) to authenticated;
grant execute on function public.group_declare_payment(uuid, uuid, integer, text, uuid) to authenticated;
grant execute on function public.group_validate_payment(uuid) to authenticated;
grant execute on function public.sponsorship_confirm(uuid) to authenticated;
grant execute on function public.loan_decide(uuid, boolean) to authenticated;
grant execute on function public.loan_repay_installment(uuid) to authenticated;
grant execute on function public.claim_decide(uuid, boolean) to authenticated;
grant execute on function public.project_contribute(uuid, integer, boolean) to authenticated;
grant execute on function public.meeting_check_in(uuid, text) to authenticated;
grant execute on function public.transfer_decide(uuid, text, text, text, text) to authenticated;
grant execute on function public.accounting_consolidate(uuid, uuid[]) to authenticated;
