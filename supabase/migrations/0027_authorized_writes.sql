-- ============================================================================
-- 0027 — Écritures réservées aux personnes autorisées.
-- Appliquer après 0026_scheduled_jobs.sql.
--
-- L'inventaire des routes (docs/INVENTAIRE_ROUTES_API.md) a montré que la clé
-- anon et le jeton d'un membre suffisaient à :
--   - modifier le nombre de voix d'un candidat (election_candidates) ;
--   - signer à la place d'un autre, ou clore une demande de signature ;
--   - changer le statut ou le montant collecté d'un cas social ;
--   - publier un avis sur un service jamais sollicité (RG-M04) ;
--   - débiter son portefeuille par pay_withdraw sans aucun versement réel.
--
-- Ces tables n'acceptent plus aucune écriture directe : tout passe par les
-- fonctions ci-dessous, qui vérifient l'identité et le rôle de l'appelant.
--
--  1. Rôles de l'organisation (bureau, trésorier, membre actif)
--  2. Votes : un vote par membre, compté en base, figé à la clôture (RG-C06)
--  3. Signatures : chacun ne signe que sa propre ligne (RG-C04)
--  4. Cas sociaux : comité, décaissement, contributions (RG-C05)
--  5. Avis : seulement après avoir sollicité le service (RG-M04)
--  6. Retrait : plus d'appel direct (RG-P01 / RG-P07)
-- ============================================================================

-- 1. RÔLES DE L'ORGANISATION -------------------------------------------------
-- Deux tables décrivent l'appartenance : memberships (compte rattaché à
-- l'organisation, rôle 'admin' pour son créateur) et members (annuaire, avec
-- le rôle du bureau : president, treasurer, secretary…). Les fonctions
-- ci-dessous lisent les deux ; elles ne révèlent que les droits de l'appelant.

-- Fiche de membre ACTIVE de l'appelant dans l'organisation (null sinon).
create or replace function public.org_member_id(p_organization_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.id
  from public.members m
  where m.organization_id = p_organization_id
    and m.user_id = auth.uid()
    and m.status = 'active'
  order by m.created_at
  limit 1;
$$;

-- Membre de l'organisation : compte rattaché ou fiche de membre active.
create or replace function public.org_is_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and (public.is_org_member(p_organization_id) or public.org_member_id(p_organization_id) is not null);
$$;

-- Administrateur de l'organisation, ou membre actif portant l'un des rôles.
create or replace function public.org_has_role(p_organization_id uuid, variadic p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and (
      public.is_org_admin(p_organization_id)
      or exists (
        select 1
        from public.members m
        where m.organization_id = p_organization_id
          and m.user_id = auth.uid()
          and m.status = 'active'
          and m.role = any (p_roles)
      )
    );
$$;

-- Bureau : président, secrétaire, trésorier et leurs adjoints (cahier, §3).
create or replace function public.org_is_bureau(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.org_has_role(
    p_organization_id,
    'president', 'vice_president', 'secretary', 'vice_secretary', 'treasurer', 'vice_treasurer'
  );
$$;

-- Trésorerie : validation des paiements en espèces, décaissements.
create or replace function public.org_is_treasurer(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.org_has_role(p_organization_id, 'treasurer', 'vice_treasurer');
$$;

-- Nom affiché de l'appelant : sa fiche de membre, sinon son compte.
create or replace function public.org_member_name(p_organization_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select nullif(trim(m.name), '')
      from public.members m
      where m.organization_id = p_organization_id and m.user_id = auth.uid()
      order by (m.status = 'active') desc, m.created_at
      limit 1
    ),
    (
      select coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), nullif(u.email, ''), nullif(u.phone, ''))
      from auth.users u
      where u.id = auth.uid()
    ),
    ''
  );
$$;

-- 2. VOTES -------------------------------------------------------------------

-- Un bulletin par membre et par scrutin. Le bulletin n'est lisible que par
-- son auteur : le décompte public reste election_candidates.votes.
create table if not exists public.election_votes (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.elections (id) on delete cascade,
  candidate_id uuid not null references public.election_candidates (id) on delete cascade,
  voter_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (election_id, voter_id)
);

alter table public.election_votes enable row level security;

drop policy if exists "election_votes_select_own" on public.election_votes;
create policy "election_votes_select_own" on public.election_votes
  for select using (voter_id = auth.uid());

revoke all on public.election_votes from anon, authenticated;
grant select on public.election_votes to authenticated;

-- Plus aucune écriture directe sur les scrutins et les candidatures.
drop policy if exists "elections_update" on public.elections;
drop policy if exists "ec_insert" on public.election_candidates;
drop policy if exists "ec_update" on public.election_candidates;

revoke all on public.elections from anon, authenticated;
grant select on public.elections to authenticated;
revoke all on public.election_candidates from anon, authenticated;
grant select on public.election_candidates to authenticated;

-- RG-C06 : un scrutin clôturé n'est plus modifiable, y compris par le
-- service_role (ni réouverture, ni candidature, ni bulletin).
create or replace function public.election_closed_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_status text;
begin
  if tg_table_name = 'elections' then
    v_status := old.status;
  else
    select e.status into v_status from public.elections e where e.id = new.election_id;
  end if;
  if v_status = 'closed' then
    raise exception 'Scrutin clôturé : il ne peut plus être modifié' using errcode = 'PY019';
  end if;
  return new;
end;
$$;

drop trigger if exists elections_closed_guard on public.elections;
create trigger elections_closed_guard
  before update on public.elections
  for each row execute function public.election_closed_guard();

drop trigger if exists election_candidates_closed_guard on public.election_candidates;
create trigger election_candidates_closed_guard
  before insert or update on public.election_candidates
  for each row execute function public.election_closed_guard();

drop trigger if exists election_votes_closed_guard on public.election_votes;
create trigger election_votes_closed_guard
  before insert or update on public.election_votes
  for each row execute function public.election_closed_guard();

-- Candidature : un membre actif se déclare lui-même ; le bureau peut déclarer
-- un autre membre actif.
create or replace function public.election_declare_candidacy(
  p_election_id uuid,
  p_member_id uuid default null
)
returns public.election_candidates
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_election public.elections;
  v_member public.members;
  v_candidate public.election_candidates;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;

  select * into v_election from public.elections where id = p_election_id for update;
  if v_election.id is null then
    raise exception 'Scrutin introuvable' using errcode = 'PY018';
  end if;
  if not public.org_is_member(v_election.organization_id) then
    raise exception 'Action non autorisée' using errcode = 'PY006';
  end if;
  if v_election.status <> 'open' then
    raise exception 'Scrutin clôturé' using errcode = 'PY019';
  end if;

  select * into v_member
  from public.members m
  where m.id = coalesce(p_member_id, public.org_member_id(v_election.organization_id))
    and m.organization_id = v_election.organization_id
    and m.status = 'active';
  if v_member.id is null then
    raise exception 'Membre introuvable' using errcode = 'PY018';
  end if;
  if v_member.user_id is distinct from v_user and not public.org_is_bureau(v_election.organization_id) then
    raise exception 'Action non autorisée' using errcode = 'PY006';
  end if;

  if exists (
    select 1 from public.election_candidates c
    where c.election_id = p_election_id and c.member_id = v_member.id::text
  ) then
    raise exception 'Candidature déjà déclarée' using errcode = 'PY019';
  end if;

  insert into public.election_candidates (election_id, member_id, votes)
  values (p_election_id, v_member.id::text, 0)
  returning * into v_candidate;
  return v_candidate;
end;
$$;

-- Vote : un seul par membre et par scrutin, définitif, compté en base.
create or replace function public.election_cast_vote(p_election_id uuid, p_candidate_id uuid)
returns public.election_votes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_election public.elections;
  v_vote public.election_votes;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;

  -- Verrou du scrutin : votes et clôture ne se croisent pas.
  select * into v_election from public.elections where id = p_election_id for update;
  if v_election.id is null then
    raise exception 'Scrutin introuvable' using errcode = 'PY018';
  end if;
  if not public.org_is_member(v_election.organization_id) then
    raise exception 'Action non autorisée' using errcode = 'PY006';
  end if;
  if v_election.status <> 'open'
     or (v_election.start_date is not null and v_election.start_date > now())
     or (v_election.end_date is not null and v_election.end_date <= now()) then
    raise exception 'Scrutin fermé au vote' using errcode = 'PY019';
  end if;

  if not exists (
    select 1 from public.election_candidates c
    where c.id = p_candidate_id and c.election_id = p_election_id
  ) then
    raise exception 'Candidat introuvable' using errcode = 'PY018';
  end if;
  if exists (
    select 1 from public.election_votes v
    where v.election_id = p_election_id and v.voter_id = v_user
  ) then
    raise exception 'Vote déjà enregistré' using errcode = 'PY019';
  end if;

  insert into public.election_votes (election_id, candidate_id, voter_id)
  values (p_election_id, p_candidate_id, v_user)
  returning * into v_vote;

  update public.election_candidates set votes = votes + 1 where id = p_candidate_id;
  return v_vote;
end;
$$;

-- Clôture : président, secrétaire ou leurs adjoints. Définitive (RG-C06).
create or replace function public.election_close(p_election_id uuid)
returns public.elections
language plpgsql
security definer
set search_path = public
as $$
declare
  v_election public.elections;
begin
  if auth.uid() is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;

  select * into v_election from public.elections where id = p_election_id for update;
  if v_election.id is null then
    raise exception 'Scrutin introuvable' using errcode = 'PY018';
  end if;
  if not public.org_has_role(
    v_election.organization_id, 'president', 'vice_president', 'secretary', 'vice_secretary'
  ) then
    raise exception 'Action non autorisée' using errcode = 'PY006';
  end if;
  if v_election.status = 'closed' then
    raise exception 'Scrutin déjà clôturé' using errcode = 'PY019';
  end if;

  update public.elections
  set status = 'closed', end_date = now()
  where id = p_election_id
  returning * into v_election;
  return v_election;
end;
$$;

-- 3. SIGNATURES --------------------------------------------------------------

-- Chaque ligne de signature désigne désormais un compte : c'est ce compte, et
-- lui seul, qui peut la signer.
alter table public.signature_signatories
  add column if not exists user_id uuid references auth.users (id) on delete set null,
  add column if not exists member_id uuid references public.members (id) on delete set null;

alter table public.signature_requests
  add column if not exists requested_by_user_id uuid references auth.users (id) on delete set null,
  add column if not exists decided_at timestamptz;

create unique index if not exists signature_signatories_request_user_key
  on public.signature_signatories (request_id, user_id)
  where user_id is not null;

drop policy if exists "sig_insert" on public.signature_requests;
drop policy if exists "sig_update" on public.signature_requests;
drop policy if exists "ss_insert" on public.signature_signatories;
drop policy if exists "ss_update" on public.signature_signatories;

revoke all on public.signature_requests from anon, authenticated;
grant select on public.signature_requests to authenticated;
revoke all on public.signature_signatories from anon, authenticated;
grant select on public.signature_signatories to authenticated;

-- Demande de signature : ouverte par le bureau. Les signataires sont des
-- membres actifs de l'organisation ayant un compte.
create or replace function public.signature_create(
  p_organization_id uuid,
  p_type text,
  p_title text,
  p_signatory_member_ids uuid[],
  p_description text default '',
  p_amount integer default null
)
returns public.signature_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_ids uuid[];
  v_valid integer;
  v_request public.signature_requests;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;
  if not public.org_is_bureau(p_organization_id) then
    raise exception 'Action non autorisée' using errcode = 'PY006';
  end if;
  if coalesce(trim(p_type), '') = '' or coalesce(trim(p_title), '') = '' then
    raise exception 'Type et titre requis' using errcode = 'PY009';
  end if;
  if p_amount is not null and p_amount <= 0 then
    raise exception 'Montant invalide' using errcode = 'PY001';
  end if;

  select array_agg(distinct t.member_id) into v_ids from unnest(coalesce(p_signatory_member_ids, '{}')) as t(member_id);
  if coalesce(array_length(v_ids, 1), 0) = 0 then
    raise exception 'Au moins un signataire requis' using errcode = 'PY009';
  end if;

  select count(*) into v_valid
  from public.members m
  where m.id = any (v_ids)
    and m.organization_id = p_organization_id
    and m.status = 'active'
    and m.user_id is not null;
  if v_valid <> array_length(v_ids, 1) then
    raise exception 'Signataire invalide : membre actif disposant d''un compte requis' using errcode = 'PY009';
  end if;

  insert into public.signature_requests
    (organization_id, type, title, description, amount, requested_by, requested_by_user_id, status)
  values
    (p_organization_id, trim(p_type), trim(p_title), coalesce(p_description, ''), p_amount,
     public.org_member_name(p_organization_id), v_user, 'pending')
  returning * into v_request;

  insert into public.signature_signatories (request_id, name, role, user_id, member_id)
  select v_request.id, m.name, m.role, m.user_id, m.id
  from public.members m
  where m.id = any (v_ids)
  order by m.name;

  return v_request;
end;
$$;

-- Signature : l'appelant signe SA ligne. La demande se clôt d'elle-même quand
-- toutes les lignes sont signées.
create or replace function public.signature_sign(p_request_id uuid)
returns public.signature_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_request public.signature_requests;
  v_line public.signature_signatories;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;

  select * into v_request from public.signature_requests where id = p_request_id for update;
  if v_request.id is null then
    raise exception 'Demande introuvable' using errcode = 'PY018';
  end if;

  select * into v_line
  from public.signature_signatories s
  where s.request_id = p_request_id and s.user_id = v_user;
  if v_line.id is null then
    raise exception 'Action non autorisée' using errcode = 'PY006';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'Cette demande n''est plus en attente de signature' using errcode = 'PY019';
  end if;
  if v_line.signed_at is not null then
    raise exception 'Déjà signé' using errcode = 'PY019';
  end if;

  update public.signature_signatories set signed_at = now() where id = v_line.id;

  if not exists (
    select 1 from public.signature_signatories s
    where s.request_id = p_request_id and s.signed_at is null
  ) then
    update public.signature_requests
    set status = 'signed', decided_at = now()
    where id = p_request_id
    returning * into v_request;
  end if;
  return v_request;
end;
$$;

-- Refus : par l'un des signataires désignés ; il clôt la demande.
create or replace function public.signature_reject(p_request_id uuid)
returns public.signature_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_request public.signature_requests;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;

  select * into v_request from public.signature_requests where id = p_request_id for update;
  if v_request.id is null then
    raise exception 'Demande introuvable' using errcode = 'PY018';
  end if;
  if not exists (
    select 1 from public.signature_signatories s
    where s.request_id = p_request_id and s.user_id = v_user
  ) then
    raise exception 'Action non autorisée' using errcode = 'PY006';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'Cette demande n''est plus en attente de signature' using errcode = 'PY019';
  end if;

  update public.signature_requests
  set status = 'rejected', decided_at = now()
  where id = p_request_id
  returning * into v_request;
  return v_request;
end;
$$;

-- 4. CAS SOCIAUX -------------------------------------------------------------

alter table public.social_cases
  add column if not exists declared_by uuid references auth.users (id) on delete set null;

-- Null pour une contribution anonyme : l'identité du donateur n'est alors
-- conservée que dans le journal d'audit, réservé aux administrateurs.
alter table public.social_case_contributors
  add column if not exists user_id uuid references auth.users (id) on delete set null;

drop policy if exists "sc_insert" on public.social_cases;
drop policy if exists "sc_update" on public.social_cases;
drop policy if exists "scc_insert" on public.social_case_contributors;

revoke all on public.social_cases from anon, authenticated;
grant select on public.social_cases to authenticated;
revoke all on public.social_case_contributors from anon, authenticated;
grant select on public.social_case_contributors to authenticated;

-- RG-C05 : un cas n'est diffusé aux membres qu'après validation du comité.
-- Avant, seuls le bureau, le déclarant et le bénéficiaire le voient.
drop policy if exists "sc_select" on public.social_cases;
create policy "sc_select" on public.social_cases
  for select using (
    public.is_org_member(organization_id)
    and (
      status in ('approved', 'funded', 'disbursed')
      or public.org_is_bureau(organization_id)
      or declared_by = auth.uid()
      or beneficiary_user_id = auth.uid()
    )
  );

-- RG-C05 : la liste des contributeurs suit le réglage de confidentialité du
-- cas ; le bureau la voit toujours.
drop policy if exists "scc_select" on public.social_case_contributors;
create policy "scc_select" on public.social_case_contributors
  for select using (
    exists (
      select 1 from public.social_cases c
      where c.id = social_case_contributors.case_id
        and public.is_org_member(c.organization_id)
        and (c.contributors_visible or public.org_is_bureau(c.organization_id))
    )
  );

-- Déclaration : par tout membre de l'organisation. Toujours « submitted »,
-- montant collecté à zéro.
create or replace function public.social_case_create(
  p_organization_id uuid,
  p_title text,
  p_target_amount integer,
  p_description text default '',
  p_type text default 'other',
  p_beneficiary_name text default '',
  p_beneficiary_user_id uuid default null,
  p_contributors_visible boolean default true
)
returns public.social_cases
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_case public.social_cases;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;
  if not public.org_is_member(p_organization_id) then
    raise exception 'Action non autorisée' using errcode = 'PY006';
  end if;
  if coalesce(trim(p_title), '') = '' then
    raise exception 'Titre requis' using errcode = 'PY009';
  end if;
  if p_target_amount is null or p_target_amount <= 0 then
    raise exception 'Montant invalide' using errcode = 'PY001';
  end if;
  if p_beneficiary_user_id is not null and not exists (
    select 1 from public.members m
    where m.organization_id = p_organization_id and m.user_id = p_beneficiary_user_id
  ) then
    raise exception 'Bénéficiaire introuvable dans l''organisation' using errcode = 'PY018';
  end if;

  insert into public.social_cases
    (organization_id, title, description, type, status, beneficiary_name, beneficiary_user_id,
     target_amount, collected_amount, contributors_visible, declared_by)
  values
    (p_organization_id, trim(p_title), coalesce(p_description, ''), coalesce(nullif(trim(p_type), ''), 'other'),
     'submitted', coalesce(p_beneficiary_name, ''), p_beneficiary_user_id,
     p_target_amount, 0, coalesce(p_contributors_visible, true), v_user)
  returning * into v_case;
  return v_case;
end;
$$;

-- Décision du comité (bureau), jamais par le bénéficiaire lui-même.
create or replace function public.social_case_review(
  p_case_id uuid,
  p_approve boolean,
  p_note text default null
)
returns public.social_cases
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_case public.social_cases;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;
  if p_approve is null then
    raise exception 'Décision invalide' using errcode = 'PY009';
  end if;

  select * into v_case from public.social_cases where id = p_case_id for update;
  if v_case.id is null then
    raise exception 'Cas social introuvable' using errcode = 'PY018';
  end if;
  if not public.org_is_bureau(v_case.organization_id) or v_case.beneficiary_user_id = v_user then
    raise exception 'Action non autorisée' using errcode = 'PY006';
  end if;
  if v_case.status not in ('submitted', 'under_review') then
    raise exception 'Cas social déjà traité' using errcode = 'PY019';
  end if;

  update public.social_cases
  set status = case when p_approve then 'approved' else 'rejected' end,
      committee_note = p_note
  where id = p_case_id
  returning * into v_case;
  return v_case;
end;
$$;

-- Contribution d'un membre à un cas validé. Le montant collecté est calculé
-- ici ; le cas passe à « funded » dès que l'objectif est atteint.
-- Registre d'engagements : aucun mouvement de portefeuille.
create or replace function public.social_case_contribute(
  p_case_id uuid,
  p_amount integer,
  p_anonymous boolean default false
)
returns public.social_cases
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_case public.social_cases;
  v_anonymous boolean := coalesce(p_anonymous, false);
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Montant invalide' using errcode = 'PY001';
  end if;

  select * into v_case from public.social_cases where id = p_case_id for update;
  if v_case.id is null then
    raise exception 'Cas social introuvable' using errcode = 'PY018';
  end if;
  if not public.org_is_member(v_case.organization_id) then
    raise exception 'Action non autorisée' using errcode = 'PY006';
  end if;
  if v_case.status not in ('approved', 'funded') then
    raise exception 'Ce cas social n''est pas ouvert aux contributions' using errcode = 'PY019';
  end if;
  if v_case.collected_amount > 2147483647 - p_amount then
    raise exception 'Montant invalide' using errcode = 'PY001';
  end if;

  insert into public.social_case_contributors (case_id, name, amount, anonymous, contributed_at, user_id)
  values (
    p_case_id,
    case when v_anonymous then 'Donateur anonyme' else public.org_member_name(v_case.organization_id) end,
    p_amount, v_anonymous, now(),
    case when v_anonymous then null else v_user end
  );

  update public.social_cases
  set collected_amount = collected_amount + p_amount,
      status = case
        when status = 'approved' and collected_amount + p_amount >= target_amount then 'funded'
        else status
      end
  where id = p_case_id
  returning * into v_case;
  return v_case;
end;
$$;

-- Décaissement : président ou trésorerie, une fois l'objectif atteint
-- (RG-C05), jamais par le bénéficiaire lui-même.
create or replace function public.social_case_disburse(p_case_id uuid)
returns public.social_cases
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_case public.social_cases;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;

  select * into v_case from public.social_cases where id = p_case_id for update;
  if v_case.id is null then
    raise exception 'Cas social introuvable' using errcode = 'PY018';
  end if;
  if not public.org_has_role(v_case.organization_id, 'president', 'treasurer', 'vice_treasurer')
     or v_case.beneficiary_user_id = v_user then
    raise exception 'Action non autorisée' using errcode = 'PY006';
  end if;
  if v_case.status <> 'funded' then
    raise exception 'Décaissement impossible : objectif non atteint ou cas déjà décaissé' using errcode = 'PY019';
  end if;

  update public.social_cases
  set status = 'disbursed', disbursed_at = now()
  where id = p_case_id
  returning * into v_case;
  return v_case;
end;
$$;

-- 5. AVIS (RG-M04) -----------------------------------------------------------

-- Sollicitation d'un service : c'est elle qui ouvre le droit d'évaluer, une
-- fois confirmée par le prestataire.
create table if not exists public.market_service_requests (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.market_services (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  message text not null default '',
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'declined')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create index if not exists market_service_requests_service_idx
  on public.market_service_requests (service_id, user_id);

alter table public.market_service_requests enable row level security;

-- Visible du demandeur et du prestataire, de personne d'autre.
drop policy if exists "market_service_requests_select" on public.market_service_requests;
create policy "market_service_requests_select" on public.market_service_requests
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.market_services s
      where s.id = market_service_requests.service_id and s.provider_user_id = auth.uid()
    )
  );

revoke all on public.market_service_requests from anon, authenticated;
grant select on public.market_service_requests to authenticated;

-- Un avis par utilisateur et par service (ou par revendeur).
alter table public.market_service_reviews
  add column if not exists user_id uuid references auth.users (id) on delete set null;
create unique index if not exists market_service_reviews_service_user_key
  on public.market_service_reviews (service_id, user_id)
  where user_id is not null;

alter table public.market_reviews
  add column if not exists user_id uuid references auth.users (id) on delete set null;
create unique index if not exists market_reviews_reseller_user_key
  on public.market_reviews (reseller_id, user_id)
  where user_id is not null;

drop policy if exists "market_sreviews_insert" on public.market_service_reviews;
drop policy if exists "market_reviews_insert" on public.market_reviews;

revoke all on public.market_service_reviews from anon, authenticated;
grant select on public.market_service_reviews to authenticated;
revoke all on public.market_reviews from anon, authenticated;
grant select on public.market_reviews to authenticated;

-- La note et le nombre d'avis d'un service ne sont plus modifiables par son
-- prestataire : ils sont recalculés à chaque avis.
revoke all on public.market_services from anon, authenticated;
grant select on public.market_services to authenticated;
grant insert (provider_user_id, provider_name, provider_member, service_type, title, description, price, currency, country, city)
  on public.market_services to authenticated;
grant update (provider_name, provider_member, service_type, title, description, price, currency, country, city)
  on public.market_services to authenticated;

create or replace function public.market_request_service(p_service_id uuid, p_message text default '')
returns public.market_service_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_service public.market_services;
  v_request public.market_service_requests;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;

  select * into v_service from public.market_services where id = p_service_id for update;
  if v_service.id is null then
    raise exception 'Service introuvable' using errcode = 'PY018';
  end if;
  if v_service.provider_user_id = v_user then
    raise exception 'Action non autorisée' using errcode = 'PY006';
  end if;

  -- Une seule sollicitation en attente à la fois : la rejouer la renvoie.
  select * into v_request
  from public.market_service_requests r
  where r.service_id = p_service_id and r.user_id = v_user and r.status = 'requested';
  if v_request.id is not null then
    return v_request;
  end if;

  insert into public.market_service_requests (service_id, user_id, message)
  values (p_service_id, v_user, left(coalesce(p_message, ''), 2000))
  returning * into v_request;
  return v_request;
end;
$$;

-- Réponse du prestataire, et de lui seul.
create or replace function public.market_respond_service_request(p_request_id uuid, p_confirm boolean)
returns public.market_service_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_request public.market_service_requests;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;
  if p_confirm is null then
    raise exception 'Décision invalide' using errcode = 'PY009';
  end if;

  select * into v_request from public.market_service_requests where id = p_request_id for update;
  if v_request.id is null then
    raise exception 'Demande introuvable' using errcode = 'PY018';
  end if;
  if not exists (
    select 1 from public.market_services s
    where s.id = v_request.service_id and s.provider_user_id = v_user
  ) then
    raise exception 'Action non autorisée' using errcode = 'PY006';
  end if;
  if v_request.status <> 'requested' then
    raise exception 'Demande déjà traitée' using errcode = 'PY019';
  end if;

  update public.market_service_requests
  set status = case when p_confirm then 'confirmed' else 'declined' end, decided_at = now()
  where id = p_request_id
  returning * into v_request;
  return v_request;
end;
$$;

-- RG-M04 : avis réservé à qui a effectivement sollicité le service
-- (sollicitation confirmée par le prestataire). Un avis par utilisateur.
create or replace function public.market_review_service(
  p_service_id uuid,
  p_rating integer,
  p_comment text default ''
)
returns public.market_service_reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_service public.market_services;
  v_name text;
  v_review public.market_service_reviews;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Note invalide (1 à 5)' using errcode = 'PY009';
  end if;

  select * into v_service from public.market_services where id = p_service_id for update;
  if v_service.id is null then
    raise exception 'Service introuvable' using errcode = 'PY018';
  end if;
  if v_service.provider_user_id = v_user or not exists (
    select 1 from public.market_service_requests r
    where r.service_id = p_service_id and r.user_id = v_user and r.status = 'confirmed'
  ) then
    raise exception 'Seuls les bénéficiaires du service peuvent l''évaluer' using errcode = 'PY006';
  end if;
  if exists (
    select 1 from public.market_service_reviews r
    where r.service_id = p_service_id and r.user_id = v_user
  ) then
    raise exception 'Avis déjà publié' using errcode = 'PY019';
  end if;

  select coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), 'Utilisateur') into v_name
  from auth.users u where u.id = v_user;

  insert into public.market_service_reviews (service_id, author_name, rating, comment, solicited, user_id)
  values (p_service_id, coalesce(v_name, 'Utilisateur'), p_rating, left(coalesce(p_comment, ''), 2000), true, v_user)
  returning * into v_review;

  update public.market_services s
  set reviews_count = agg.n, rating = agg.average
  from (
    select count(*)::integer as n, round(avg(r.rating), 2) as average
    from public.market_service_reviews r
    where r.service_id = p_service_id
  ) agg
  where s.id = p_service_id;

  return v_review;
end;
$$;

-- Avis sur un revendeur : réservé à qui a reçu une commande de ce revendeur.
create or replace function public.market_review_reseller(
  p_reseller_id uuid,
  p_rating integer,
  p_comment text default ''
)
returns public.market_reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_reseller public.market_resellers;
  v_name text;
  v_review public.market_reviews;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Note invalide (1 à 5)' using errcode = 'PY009';
  end if;

  select * into v_reseller from public.market_resellers where id = p_reseller_id for update;
  if v_reseller.id is null then
    raise exception 'Revendeur introuvable' using errcode = 'PY018';
  end if;
  if v_reseller.user_id = v_user or not exists (
    select 1 from public.market_orders o
    where o.reseller_id = p_reseller_id and o.buyer_id = v_user and o.status = 'delivered'
  ) then
    raise exception 'Seuls les clients livrés peuvent évaluer ce revendeur' using errcode = 'PY006';
  end if;
  if exists (
    select 1 from public.market_reviews r
    where r.reseller_id = p_reseller_id and r.user_id = v_user
  ) then
    raise exception 'Avis déjà publié' using errcode = 'PY019';
  end if;

  select coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), 'Utilisateur') into v_name
  from auth.users u where u.id = v_user;

  insert into public.market_reviews (reseller_id, author_name, rating, comment, user_id)
  values (p_reseller_id, coalesce(v_name, 'Utilisateur'), p_rating, left(coalesce(p_comment, ''), 2000), v_user)
  returning * into v_review;

  update public.market_resellers s
  set rating = agg.average
  from (
    select round(avg(r.rating), 2) as average
    from public.market_reviews r
    where r.reseller_id = p_reseller_id
  ) agg
  where s.id = p_reseller_id;

  return v_review;
end;
$$;

-- 6. RETRAIT -----------------------------------------------------------------
-- pay_withdraw(montant, portefeuille, opérateur) était appelable par tout
-- utilisateur connecté et débitait le portefeuille sans aucun versement réel.
-- Elle est remplacée par une fonction réservée au service_role, appelée par
-- l'intégration opérateur (Edge Function pay-withdraw), qui applique le
-- garde-fou PAY_REAL_MONEY et désigne explicitement le compte débité.
drop function if exists public.pay_withdraw(integer, uuid, text);

create or replace function public.pay_withdraw(
  p_user_id uuid,
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
  if p_user_id is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Montant invalide' using errcode = 'PY001';
  end if;

  -- Uniquement un portefeuille personnel du compte désigné.
  select * into v_wallet
  from public.pay_wallets w
  where w.user_id = p_user_id
    and w.type = 'personal'
    and (p_wallet_id is null or w.id = p_wallet_id)
  for update;
  if v_wallet.id is null then
    raise exception 'Portefeuille introuvable' using errcode = 'PY002';
  end if;

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

-- 7. DROITS D'EXÉCUTION ------------------------------------------------------
revoke all on function public.org_member_id(uuid) from public, anon;
revoke all on function public.org_is_member(uuid) from public, anon;
revoke all on function public.org_has_role(uuid, text[]) from public, anon;
revoke all on function public.org_is_bureau(uuid) from public, anon;
revoke all on function public.org_is_treasurer(uuid) from public, anon;
revoke all on function public.org_member_name(uuid) from public, anon, authenticated;
revoke all on function public.election_closed_guard() from public, anon, authenticated;
revoke all on function public.election_declare_candidacy(uuid, uuid) from public, anon;
revoke all on function public.election_cast_vote(uuid, uuid) from public, anon;
revoke all on function public.election_close(uuid) from public, anon;
revoke all on function public.signature_create(uuid, text, text, uuid[], text, integer) from public, anon;
revoke all on function public.signature_sign(uuid) from public, anon;
revoke all on function public.signature_reject(uuid) from public, anon;
revoke all on function public.social_case_create(uuid, text, integer, text, text, text, uuid, boolean) from public, anon;
revoke all on function public.social_case_review(uuid, boolean, text) from public, anon;
revoke all on function public.social_case_contribute(uuid, integer, boolean) from public, anon;
revoke all on function public.social_case_disburse(uuid) from public, anon;
revoke all on function public.market_request_service(uuid, text) from public, anon;
revoke all on function public.market_respond_service_request(uuid, boolean) from public, anon;
revoke all on function public.market_review_service(uuid, integer, text) from public, anon;
revoke all on function public.market_review_reseller(uuid, integer, text) from public, anon;
-- Jamais appelable par un client : service_role uniquement.
revoke all on function public.pay_withdraw(uuid, integer, uuid, text) from public, anon, authenticated;

grant execute on function public.org_member_id(uuid) to authenticated;
grant execute on function public.org_is_member(uuid) to authenticated;
grant execute on function public.org_has_role(uuid, text[]) to authenticated;
grant execute on function public.org_is_bureau(uuid) to authenticated;
grant execute on function public.org_is_treasurer(uuid) to authenticated;
grant execute on function public.election_declare_candidacy(uuid, uuid) to authenticated;
grant execute on function public.election_cast_vote(uuid, uuid) to authenticated;
grant execute on function public.election_close(uuid) to authenticated;
grant execute on function public.signature_create(uuid, text, text, uuid[], text, integer) to authenticated;
grant execute on function public.signature_sign(uuid) to authenticated;
grant execute on function public.signature_reject(uuid) to authenticated;
grant execute on function public.social_case_create(uuid, text, integer, text, text, text, uuid, boolean) to authenticated;
grant execute on function public.social_case_review(uuid, boolean, text) to authenticated;
grant execute on function public.social_case_contribute(uuid, integer, boolean) to authenticated;
grant execute on function public.social_case_disburse(uuid) to authenticated;
grant execute on function public.market_request_service(uuid, text) to authenticated;
grant execute on function public.market_respond_service_request(uuid, boolean) to authenticated;
grant execute on function public.market_review_service(uuid, integer, text) to authenticated;
grant execute on function public.market_review_reseller(uuid, integer, text) to authenticated;
grant execute on function public.pay_withdraw(uuid, integer, uuid, text) to service_role;
