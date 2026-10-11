-- ============================================================================
-- 0025 — Backend appelable directement par l'application Flutter.
-- Appliquer après 0024_account_closure.sql.
--
-- AssoShop n'a plus d'application web : l'application Flutter parle à la base
-- avec le jeton de l'utilisateur, sans serveur intermédiaire. Tout ce qui
-- était décidé dans les routes Next.js passe donc en base.
--
--  1. Code PIN : création, vérification et verrouillage en fonctions SQL
--     (bcrypt, pgcrypto). Les anciens PIN (scrypt, calculés par le serveur
--     Next.js) ne sont pas convertibles : ils sont effacés, l'utilisateur en
--     choisit un nouveau à sa prochaine connexion.
--  2. Profil et KYC : plus aucune écriture directe sur user_profiles ni
--     hub_kyc (un utilisateur pouvait s'attribuer « kyc_status = verified »).
--  3. Fermeture de compte par l'utilisateur lui-même.
--  4. Création d'une organisation en une seule opération.
--  5. Back-office : lecture réservée aux administrateurs de la plateforme
--     (platform_admins) par politiques RLS, écritures par fonctions
--     journalisées dans admin_audit_logs. Plus besoin de la clé service_role.
--
-- Les fonctions de PIN ne lèvent pas d'erreur pour un PIN faux : elles
-- renvoient un état, sinon le compteur de tentatives serait annulé avec la
-- transaction.
-- Aucun code d'erreur ajouté : PY001 à PY019, AC001 (lib/api/pay-rpc.ts).
-- ============================================================================

-- 1. CODE PIN ----------------------------------------------------------------

-- Les empreintes scrypt du serveur Next.js (« sel:empreinte ») ne peuvent pas
-- être vérifiées en base : nouvelle saisie à la prochaine connexion.
update public.user_profiles
set pin_hash = null, pin_attempts = 0, pin_locked_until = null
where pin_hash is not null and pin_hash !~ '^\$2[aby]\$';

-- État du PIN de l'utilisateur courant.
create or replace function public.pin_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_profile public.user_profiles;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;
  select * into v_profile from public.user_profiles where user_id = v_user;
  return jsonb_build_object(
    'has_pin', v_profile.pin_hash is not null,
    'locked', v_profile.pin_locked_until is not null and v_profile.pin_locked_until > now(),
    'locked_until', case when v_profile.pin_locked_until > now() then v_profile.pin_locked_until end
  );
end;
$$;

-- Création ou remplacement du PIN (4 chiffres), après une connexion par code.
-- Refusée pendant un verrouillage.
create or replace function public.pin_set(p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_profile public.user_profiles;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;
  if p_pin is null or p_pin !~ '^[0-9]{4}$' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_format');
  end if;

  insert into public.user_profiles (user_id) values (v_user)
  on conflict (user_id) do nothing;
  select * into v_profile from public.user_profiles where user_id = v_user for update;

  if v_profile.pin_locked_until is not null and v_profile.pin_locked_until > now() then
    return jsonb_build_object('ok', false, 'reason', 'locked', 'locked_until', v_profile.pin_locked_until);
  end if;

  update public.user_profiles
  set pin_hash = crypt(p_pin, gen_salt('bf', 10)),
      pin_attempts = 0,
      pin_locked_until = null,
      updated_at = now()
  where user_id = v_user;

  return jsonb_build_object('ok', true);
end;
$$;

-- Vérification du PIN. Cinq échecs consécutifs verrouillent le PIN quinze
-- minutes. Renvoie { ok, reason, attempts_left, locked_until }.
create or replace function public.pin_verify(p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  c_max_attempts constant integer := 5;
  c_lock constant interval := interval '15 minutes';
  v_user uuid := auth.uid();
  v_profile public.user_profiles;
  v_attempts integer;
  v_locked_until timestamptz;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;

  select * into v_profile from public.user_profiles where user_id = v_user for update;

  if v_profile.pin_locked_until is not null and v_profile.pin_locked_until > now() then
    return jsonb_build_object('ok', false, 'reason', 'locked', 'locked_until', v_profile.pin_locked_until);
  end if;
  -- Une empreinte d'un autre format (ancien PIN scrypt) vaut absence de PIN.
  if v_profile.pin_hash is null or v_profile.pin_hash !~ '^\$2[aby]\$' then
    return jsonb_build_object('ok', false, 'reason', 'no_pin');
  end if;

  if p_pin is not null and p_pin ~ '^[0-9]{4}$'
     and v_profile.pin_hash = crypt(p_pin, v_profile.pin_hash) then
    update public.user_profiles
    set pin_attempts = 0, pin_locked_until = null, updated_at = now()
    where user_id = v_user;
    return jsonb_build_object('ok', true);
  end if;

  v_attempts := coalesce(v_profile.pin_attempts, 0) + 1;
  if v_attempts >= c_max_attempts then
    v_locked_until := now() + c_lock;
    update public.user_profiles
    set pin_attempts = 0, pin_locked_until = v_locked_until, updated_at = now()
    where user_id = v_user;
    return jsonb_build_object('ok', false, 'reason', 'locked', 'locked_until', v_locked_until);
  end if;

  update public.user_profiles
  set pin_attempts = v_attempts, updated_at = now()
  where user_id = v_user;
  return jsonb_build_object('ok', false, 'reason', 'incorrect', 'attempts_left', c_max_attempts - v_attempts);
end;
$$;

-- 2. PROFIL ET KYC -----------------------------------------------------------

-- Avant : user_profiles_insert_own / user_profiles_update_own laissaient
-- l'utilisateur écrire toute sa ligne (empreinte du PIN, compteur de
-- tentatives, verrou, score de confiance, statut KYC).
drop policy if exists "user_profiles_insert_own" on public.user_profiles;
drop policy if exists "user_profiles_update_own" on public.user_profiles;

revoke all on public.user_profiles from anon, authenticated;
-- Lecture de sa propre ligne, sans l'empreinte du PIN.
grant select (id, user_id, city, language, trust_score, kyc_status, engagement,
              pin_attempts, pin_locked_until, created_at, updated_at)
  on public.user_profiles to authenticated;

-- Seuls la ville et la langue sont modifiables par l'utilisateur.
create or replace function public.profile_update(
  p_city text default null,
  p_language text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_profile public.user_profiles;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;

  insert into public.user_profiles (user_id) values (v_user)
  on conflict (user_id) do nothing;

  update public.user_profiles
  set city = coalesce(p_city, city),
      language = coalesce(p_language, language),
      updated_at = now()
  where user_id = v_user
  returning * into v_profile;

  return to_jsonb(v_profile) - 'pin_hash';
end;
$$;

-- hub_kyc : l'utilisateur ne fait plus que lire ses demandes.
do $$
declare
  v_policy text;
begin
  for v_policy in
    select policyname from pg_policies where schemaname = 'public' and tablename = 'hub_kyc'
  loop
    execute format('drop policy %I on public.hub_kyc', v_policy);
  end loop;
end;
$$;

create policy "hub_kyc_select_own" on public.hub_kyc
  for select using (user_id = auth.uid());

revoke all on public.hub_kyc from anon, authenticated;
grant select on public.hub_kyc to authenticated;

-- Dépôt d'une demande de vérification d'identité : toujours « pending », et
-- visible du back-office (admin_kyc). Une seule demande en attente à la fois.
create or replace function public.kyc_submit(p_document_type text)
returns public.hub_kyc
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_name text;
  v_request public.hub_kyc;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;
  if coalesce(trim(p_document_type), '') = '' then
    raise exception 'Type de document requis' using errcode = 'PY009';
  end if;
  if exists (
    select 1 from public.hub_kyc k where k.user_id = v_user and k.status = 'pending'
  ) then
    raise exception 'Une demande est déjà en attente' using errcode = 'PY019';
  end if;

  insert into public.hub_kyc (user_id, document_type, status)
  values (v_user, trim(p_document_type), 'pending')
  returning * into v_request;

  select coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), nullif(u.email, ''), nullif(u.phone, ''), '')
    into v_name
  from auth.users u where u.id = v_user;

  insert into public.admin_kyc (user_id, user_name, document_type, status)
  values (v_user, coalesce(v_name, ''), trim(p_document_type), 'pending');

  insert into public.user_profiles (user_id, kyc_status) values (v_user, 'pending')
  on conflict (user_id) do update set kyc_status = 'pending', updated_at = now();

  return v_request;
end;
$$;

-- 3. FERMETURE DE COMPTE PAR L'UTILISATEUR -----------------------------------

-- Même décision que account_close (0024) : le compte est supprimé s'il ne
-- porte aucun engagement financier, anonymisé sinon. Le jeton de
-- l'utilisateur n'est plus valable ensuite.
create or replace function public.account_close_self()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_result jsonb;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;

  v_result := public.account_close(v_user);
  if v_result->>'action' = 'delete' then
    -- Le trigger account_guard_user_delete revérifie les engagements.
    delete from auth.users where id = v_user;
    return jsonb_build_object('action', 'deleted', 'reasons', '[]'::jsonb);
  end if;

  return jsonb_build_object('action', 'anonymized', 'reasons', v_result->'reasons');
end;
$$;

-- 4. CRÉATION D'UNE ORGANISATION ---------------------------------------------

-- L'organisation et l'adhésion « admin » de son créateur dans la même
-- transaction (deux écritures séparées côté client auparavant).
create or replace function public.org_create(
  p_name text,
  p_type text,
  p_city text default null,
  p_object text default null
)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_org public.organizations;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_type), '') = '' then
    raise exception 'Nom et type requis' using errcode = 'PY009';
  end if;

  insert into public.organizations (name, type, city, object, status, created_by)
  values (trim(p_name), trim(p_type), p_city, p_object, 'pending', v_user)
  returning * into v_org;

  insert into public.memberships (organization_id, user_id, role)
  values (v_org.id, v_user, 'admin');

  return v_org;
end;
$$;

-- 5. BACK-OFFICE -------------------------------------------------------------

-- 5.a Lecture ----------------------------------------------------------------

-- Les politiques ci-dessous appellent is_platform_admin() au nom de
-- l'utilisateur : il doit pouvoir l'exécuter. Elle ne révèle que son propre
-- statut, et permet à l'application d'afficher ou non le mode administrateur.
grant execute on function public.is_platform_admin() to authenticated;

-- Tables du back-office : lecture seule pour les clients, réservée aux
-- administrateurs de la plateforme. Les écritures passent par les fonctions
-- admin_* ci-dessous.
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'admin_kyc', 'admin_disputes', 'admin_moderation', 'admin_insurance',
    'admin_invoices', 'admin_roles', 'admin_audit_logs', 'admin_security_audit',
    'platform_admins', 'account_anonymizations'
  ]
  loop
    execute format('revoke all on public.%I from anon, authenticated', v_table);
    execute format('grant select on public.%I to authenticated', v_table);
    execute format('drop policy if exists %I on public.%I', v_table || '_admin_select', v_table);
    execute format(
      'create policy %I on public.%I for select using (public.is_platform_admin())',
      v_table || '_admin_select', v_table
    );
  end loop;

  -- Référentiels publics : taux de commission (RG-P03), formules, pays,
  -- opérateurs Mobile Money (RG-P04) et configuration générale sont lisibles
  -- par tout utilisateur connecté.
  foreach v_table in array array[
    'admin_commissions', 'admin_plans', 'admin_countries', 'admin_operators', 'admin_config'
  ]
  loop
    execute format('revoke all on public.%I from anon, authenticated', v_table);
    execute format('grant select on public.%I to authenticated', v_table);
    execute format('drop policy if exists %I on public.%I', v_table || '_read_authed', v_table);
    execute format(
      'create policy %I on public.%I for select using (auth.uid() is not null)',
      v_table || '_read_authed', v_table
    );
  end loop;
end;
$$;

-- Intégrations partenaires : la clé d'API ne quitte jamais la base.
revoke all on public.admin_integrations from anon, authenticated;
grant select (id, name, partner, webhook_url, status) on public.admin_integrations to authenticated;
drop policy if exists "admin_integrations_admin_select" on public.admin_integrations;
create policy "admin_integrations_admin_select" on public.admin_integrations
  for select using (public.is_platform_admin());

-- Journaux techniques du Control Plane : jamais lisibles par un client.
revoke all on public.control_plane_outbox from anon, authenticated;
revoke all on public.control_plane_access_log from anon, authenticated;

-- Un administrateur voit toutes les candidatures revendeur et toutes les
-- parts de bénéfices (en plus des politiques existantes du propriétaire).
drop policy if exists "market_apps_admin_select" on public.market_reseller_applications;
create policy "market_apps_admin_select" on public.market_reseller_applications
  for select using (public.is_platform_admin());

drop policy if exists "market_distribution_shares_admin_select" on public.market_investment_distribution_shares;
create policy "market_distribution_shares_admin_select" on public.market_investment_distribution_shares
  for select using (public.is_platform_admin());

-- 5.b Outils internes --------------------------------------------------------

-- Interne : vérifie que l'appelant est administrateur de la plateforme.
create or replace function public.admin_require()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'PY004';
  end if;
  if not public.is_platform_admin() then
    raise exception 'Action non autorisée' using errcode = 'PY006';
  end if;
  return v_user;
end;
$$;

-- Interne : journalise une action du back-office (remontée au Control Plane
-- par le trigger cp_enqueue_admin_audit).
create or replace function public.admin_log(p_action text, p_module text, p_severity text default 'info')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_actor text;
begin
  select coalesce(nullif(u.email, ''), v_user::text) into v_actor
  from auth.users u where u.id = v_user;

  insert into public.admin_audit_logs (actor, action, module, severity)
  values (coalesce(v_actor, coalesce(v_user::text, 'system')), p_action, p_module, p_severity);
end;
$$;

-- 5.c Décisions --------------------------------------------------------------

-- KYC : la décision est reportée sur la demande de l'utilisateur et sur son
-- profil (« verified » / « rejected »). Jamais sur sa propre demande.
create or replace function public.admin_review_kyc(p_kyc_id uuid, p_status text)
returns public.admin_kyc
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := public.admin_require();
  v_kyc public.admin_kyc;
begin
  if p_status is null or p_status not in ('approved', 'rejected') then
    raise exception 'Décision invalide' using errcode = 'PY009';
  end if;

  select * into v_kyc from public.admin_kyc where id = p_kyc_id for update;
  if v_kyc.id is null then
    raise exception 'Demande introuvable' using errcode = 'PY018';
  end if;
  if v_kyc.user_id = v_user then
    raise exception 'Action non autorisée' using errcode = 'PY006';
  end if;
  if v_kyc.status <> 'pending' then
    raise exception 'Demande déjà traitée' using errcode = 'PY019';
  end if;

  update public.admin_kyc set status = p_status where id = v_kyc.id
  returning * into v_kyc;

  if v_kyc.user_id is not null then
    update public.hub_kyc
    set status = p_status, reviewed_at = now()
    where user_id = v_kyc.user_id and status = 'pending';

    insert into public.user_profiles (user_id, kyc_status)
    values (v_kyc.user_id, case when p_status = 'approved' then 'verified' else 'rejected' end)
    on conflict (user_id) do update
      set kyc_status = excluded.kyc_status, updated_at = now();
  end if;

  perform public.admin_log('review_kyc:' || p_status || ':' || v_kyc.id::text, 'kyc');
  return v_kyc;
end;
$$;

create or replace function public.admin_set_dispute_status(p_dispute_id uuid, p_status text)
returns public.admin_disputes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dispute public.admin_disputes;
begin
  perform public.admin_require();
  if p_status is null or p_status not in ('open', 'in_progress', 'resolved') then
    raise exception 'Statut invalide' using errcode = 'PY009';
  end if;

  update public.admin_disputes set status = p_status where id = p_dispute_id
  returning * into v_dispute;
  if v_dispute.id is null then
    raise exception 'Litige introuvable' using errcode = 'PY018';
  end if;

  perform public.admin_log('set_dispute_status:' || p_status || ':' || v_dispute.id::text, 'disputes');
  return v_dispute;
end;
$$;

create or replace function public.admin_review_moderation(p_item_id uuid, p_status text)
returns public.admin_moderation
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.admin_moderation;
begin
  perform public.admin_require();
  if p_status is null or p_status not in ('pending', 'approved', 'rejected') then
    raise exception 'Décision invalide' using errcode = 'PY009';
  end if;

  update public.admin_moderation set status = p_status where id = p_item_id
  returning * into v_item;
  if v_item.id is null then
    raise exception 'Signalement introuvable' using errcode = 'PY018';
  end if;

  perform public.admin_log('review_moderation:' || p_status || ':' || v_item.id::text, 'community');
  return v_item;
end;
$$;

-- 5.d Configuration ----------------------------------------------------------

-- Taux en pourcentage, entre 0 et 100. Ces taux pilotent des mouvements de
-- fonds (ventes, versement des séquestres) : la modification est journalisée
-- en « warning » avec l'ancien et le nouveau taux.
create or replace function public.admin_set_commission(p_service text, p_rate numeric)
returns public.admin_commissions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous numeric;
  v_commission public.admin_commissions;
begin
  perform public.admin_require();
  if coalesce(trim(p_service), '') = '' or p_rate is null or p_rate < 0 or p_rate > 100 then
    raise exception 'Commission invalide' using errcode = 'PY009';
  end if;

  select c.rate into v_previous from public.admin_commissions c where c.service = trim(p_service);

  insert into public.admin_commissions (service, rate, currency)
  values (trim(p_service), p_rate, 'GNF')
  on conflict (service) do update set rate = excluded.rate
  returning * into v_commission;

  perform public.admin_log(
    'update_commission:' || v_commission.service || ':' || coalesce(v_previous::text, 'aucun') || '->' || p_rate::text,
    'config', 'warning'
  );
  return v_commission;
end;
$$;

-- Les paramètres laissés à null ne sont pas modifiés.
create or replace function public.admin_update_config(
  p_platform_name text default null,
  p_support_email text default null,
  p_maintenance_mode boolean default null,
  p_cgu_version text default null,
  p_legal_text text default null
)
returns public.admin_config
language plpgsql
security definer
set search_path = public
as $$
declare
  v_config public.admin_config;
begin
  perform public.admin_require();

  update public.admin_config
  set platform_name = coalesce(p_platform_name, platform_name),
      support_email = coalesce(p_support_email, support_email),
      maintenance_mode = coalesce(p_maintenance_mode, maintenance_mode),
      cgu_version = coalesce(p_cgu_version, cgu_version),
      legal_text = coalesce(p_legal_text, legal_text),
      updated_at = now()
  where id = 1
  returning * into v_config;
  if v_config.id is null then
    raise exception 'Configuration introuvable' using errcode = 'PY018';
  end if;

  perform public.admin_log('update_config', 'config');
  return v_config;
end;
$$;

create or replace function public.admin_update_plan(p_plan_id uuid, p_monthly_price integer)
returns public.admin_plans
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan public.admin_plans;
begin
  perform public.admin_require();
  if p_monthly_price is null or p_monthly_price < 0 then
    raise exception 'Prix invalide' using errcode = 'PY001';
  end if;

  update public.admin_plans set monthly_price = p_monthly_price where id = p_plan_id
  returning * into v_plan;
  if v_plan.id is null then
    raise exception 'Formule introuvable' using errcode = 'PY018';
  end if;

  perform public.admin_log('update_plan:' || v_plan.id::text, 'config');
  return v_plan;
end;
$$;

-- Active ou désactive un pays, un opérateur Mobile Money ou une intégration.
-- p_kind : 'country' | 'operator' | 'integration'. Renvoie le nouveau statut.
create or replace function public.admin_toggle_status(p_kind text, p_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_table text;
  v_status text;
begin
  perform public.admin_require();
  v_table := case p_kind
    when 'country' then 'admin_countries'
    when 'operator' then 'admin_operators'
    when 'integration' then 'admin_integrations'
  end;
  if v_table is null then
    raise exception 'Élément invalide' using errcode = 'PY009';
  end if;

  execute format(
    'update public.%I set status = case when status = ''active'' then ''inactive'' else ''active'' end where id = $1 returning status',
    v_table
  ) into v_status using p_id;
  if v_status is null then
    raise exception 'Élément introuvable' using errcode = 'PY018';
  end if;

  perform public.admin_log('toggle_' || p_kind || ':' || p_id::text || ':' || v_status, 'config');
  return v_status;
end;
$$;

create or replace function public.admin_create_category(p_name text, p_parent_id uuid default null)
returns public.market_product_categories
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
  v_category public.market_product_categories;
begin
  perform public.admin_require();
  if coalesce(trim(p_name), '') = '' then
    raise exception 'Nom de catégorie requis' using errcode = 'PY009';
  end if;
  if p_parent_id is not null and not exists (
    select 1 from public.market_product_categories c where c.id = p_parent_id
  ) then
    raise exception 'Catégorie parente introuvable' using errcode = 'PY018';
  end if;

  v_slug := trim(both '-' from regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g'));
  v_slug := coalesce(nullif(v_slug, ''), 'categorie') || '-' || substr(gen_random_uuid()::text, 1, 8);

  insert into public.market_product_categories (name, slug, parent_id)
  values (trim(p_name), v_slug, p_parent_id)
  returning * into v_category;

  perform public.admin_log('create_category:' || v_category.id::text, 'market');
  return v_category;
end;
$$;

-- 5.e Utilisateurs -----------------------------------------------------------

-- Suspend ou rétablit un compte (connexion bloquée, sessions fermées). Un
-- administrateur ne se suspend pas lui-même ; un compte anonymisé ne se
-- rétablit pas.
create or replace function public.admin_set_user_suspended(p_user_id uuid, p_suspended boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := public.admin_require();
begin
  if p_suspended is null then
    raise exception 'Décision invalide' using errcode = 'PY009';
  end if;
  if p_user_id = v_admin then
    raise exception 'Action non autorisée' using errcode = 'PY006';
  end if;
  perform 1 from auth.users u where u.id = p_user_id for update;
  if not found then
    raise exception 'Utilisateur introuvable' using errcode = 'PY018';
  end if;
  if not p_suspended and exists (
    select 1 from public.account_anonymizations a where a.user_id = p_user_id
  ) then
    raise exception 'Un compte anonymisé ne peut pas être rétabli' using errcode = 'PY019';
  end if;

  update auth.users
  set banned_until = case when p_suspended then now() + interval '100 years' end,
      updated_at = now()
  where id = p_user_id;

  if p_suspended then
    delete from auth.sessions where user_id = p_user_id;
  end if;

  perform public.admin_log(
    case when p_suspended then 'suspend_user:' else 'restore_user:' end || p_user_id::text,
    'users', 'warning'
  );
  return jsonb_build_object('user_id', p_user_id, 'status', case when p_suspended then 'suspended' else 'active' end);
end;
$$;

-- Liste paginée des comptes (recherche sur l'e-mail ou le téléphone).
create or replace function public.admin_users(
  p_search text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_search text := nullif(trim(coalesce(p_search, '')), '');
  v_result jsonb;
begin
  perform public.admin_require();

  select jsonb_build_object(
    'total', (
      select count(*) from auth.users u
      where v_search is null or u.email ilike '%' || v_search || '%' or u.phone ilike '%' || v_search || '%'
    ),
    'users', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.created_at desc)
      from (
        select u.id,
               coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), u.email, u.phone, '') as name,
               coalesce(u.email, '') as email,
               coalesce(u.phone, '') as phone,
               case
                 when exists (select 1 from public.account_anonymizations a where a.user_id = u.id) then 'anonymized'
                 when u.banned_until is not null and u.banned_until > now() then 'suspended'
                 else 'active'
               end as status,
               exists (select 1 from public.platform_admins pa where pa.user_id = u.id) as is_admin,
               coalesce(p.kyc_status, 'not_submitted') as kyc_status,
               u.created_at
        from auth.users u
        left join public.user_profiles p on p.user_id = u.id
        where v_search is null or u.email ilike '%' || v_search || '%' or u.phone ilike '%' || v_search || '%'
        order by u.created_at desc
        limit least(greatest(coalesce(p_limit, 50), 1), 200)
        offset greatest(coalesce(p_offset, 0), 0)
      ) x
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

-- Comptes anonymisés, avec le solde et les mises qui restent à restituer.
create or replace function public.admin_anonymized_accounts()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  perform public.admin_require();

  select coalesce(jsonb_agg(to_jsonb(x) order by x.anonymized_at desc), '[]'::jsonb) into v_result
  from (
    select a.user_id, a.anonymized_at, a.reasons,
           coalesce((select sum(w.balance) from public.pay_wallets w where w.user_id = a.user_id), 0) as wallet_balance,
           coalesce((
             select sum(c.amount) from public.market_investment_contributions c
             where c.user_id = a.user_id and c.refunded_at is null
           ), 0) as invested_amount,
           public.account_deletion_blockers(a.user_id) as blockers
    from public.account_anonymizations a
  ) x;

  return v_result;
end;
$$;

-- 5.f Supervision ------------------------------------------------------------

-- Tableau de bord : compteurs, volumes et validations en attente.
create or replace function public.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  perform public.admin_require();

  select jsonb_build_object(
    'users_total', (select count(*) from auth.users),
    'organizations_total', (select count(*) from public.organizations),
    'financial_groups_total', (select count(*) from public.financial_groups),
    'monthly_volume', (
      select coalesce(sum(t.amount), 0) from public.pay_transactions t
      where t.status = 'confirmed' and t.created_at >= date_trunc('month', now())
    ),
    'commissions_total', (
      select coalesce(sum(t.commission), 0) from public.pay_transactions t where t.status = 'confirmed'
    ),
    'pending_resellers', (select count(*) from public.market_reseller_applications where status = 'pending'),
    'pending_kyc', (select count(*) from public.admin_kyc where status = 'pending'),
    'pending_moderation', (select count(*) from public.admin_moderation where status = 'pending'),
    'pending_profit_distributions', (select count(*) from public.market_investment_distributions where status = 'pending'),
    'disputes_open', (select count(*) from public.admin_disputes where status = 'open'),
    'anonymized_accounts', (select count(*) from public.account_anonymizations),
    'currency', 'GNF'
  ) into v_result;

  return v_result;
end;
$$;

-- Rapprochement du compte marchand : ce que le partenaire qui détient les
-- fonds doit avoir en caisse = portefeuilles des utilisateurs + séquestres +
-- portefeuille plateforme. À comparer au relevé du partenaire.
create or replace function public.admin_funds_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  perform public.admin_require();

  select jsonb_build_object(
    'user_wallets_total', (select coalesce(sum(balance), 0) from public.pay_wallets where user_id is not null),
    'user_wallets_count', (select count(*) from public.pay_wallets where user_id is not null),
    'escrow_total', (select coalesce(sum(balance), 0) from public.pay_wallets where type = 'escrow'),
    'platform_wallet_balance', (select coalesce(sum(balance), 0) from public.pay_wallets where type = 'platform'),
    'funds_total', (select coalesce(sum(balance), 0) from public.pay_wallets),
    'anonymized_wallets_total', (
      select coalesce(sum(w.balance), 0) from public.pay_wallets w
      where w.user_id in (select a.user_id from public.account_anonymizations a)
    ),
    'pending_topups_count', (
      select count(*) from public.pay_transactions where type = 'topup' and status = 'pending'
    ),
    'pending_topups_amount', (
      select coalesce(sum(amount), 0) from public.pay_transactions where type = 'topup' and status = 'pending'
    ),
    'confirmed_topups_amount', (
      select coalesce(sum(amount - commission), 0) from public.pay_transactions where type = 'topup' and status = 'confirmed'
    ),
    'withdrawals_amount', (
      select coalesce(sum(amount), 0) from public.pay_transactions where type = 'withdrawal' and status = 'confirmed'
    ),
    'negative_wallets', (select count(*) from public.pay_wallets where balance < 0),
    'currency', 'GNF',
    'generated_at', now()
  ) into v_result;

  return v_result;
end;
$$;

-- Projets d'investissement (porteur, séquestre, investisseurs) et bénéfices
-- déclarés à valider.
create or replace function public.admin_investment_supervision()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  perform public.admin_require();

  select jsonb_build_object(
    'escrow_total', (select coalesce(sum(balance), 0) from public.pay_wallets where type = 'escrow'),
    'projects', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.created_at desc)
      from (
        select p.id, p.name, p.sector, p.status, p.currency, p.target_amount, p.raised_amount,
               p.deadline, p.settled_at, p.released_amount, p.commission_amount, p.created_at,
               p.created_by as promoter_id,
               coalesce((select coalesce(nullif(u.email, ''), u.phone) from auth.users u where u.id = p.created_by), '') as promoter,
               coalesce((select w.balance from public.pay_wallets w where w.project_id = p.id and w.type = 'escrow'), 0) as escrow_balance,
               (select count(distinct c.user_id) from public.market_investment_contributions c where c.project_id = p.id) as investors_count
        from public.market_investment_projects p
      ) x
    ), '[]'::jsonb),
    'distributions', coalesce((
      select jsonb_agg(to_jsonb(y) order by y.declared_at desc)
      from (
        select d.id, d.project_id, p.name as project_name, p.profit_sharing_rules,
               d.amount, d.distributed_amount, d.currency, d.status, d.declared_at, d.reviewed_at
        from public.market_investment_distributions d
        join public.market_investment_projects p on p.id = d.project_id
      ) y
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

-- Associations et groupes financiers, avec leur nombre de membres.
create or replace function public.admin_supervision()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  perform public.admin_require();

  select jsonb_build_object(
    'organizations', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.created_at desc)
      from (
        select o.id, o.name, o.type, o.status, o.created_at,
               (select count(*) from public.memberships m where m.organization_id = o.id) as members_count
        from public.organizations o
      ) x
    ), '[]'::jsonb),
    'financial_groups', coalesce((
      select jsonb_agg(to_jsonb(y) order by y.created_at desc)
      from (
        select g.id, g.organization_id, g.name, g.type, g.status, g.created_at,
               (select count(*) from public.group_members gm where gm.group_id = g.id) as members_count
        from public.financial_groups g
      ) y
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

-- 6. DROITS D'EXÉCUTION ------------------------------------------------------
-- Appelables par l'application avec le jeton de l'utilisateur.
do $$
declare
  v_signature text;
begin
  foreach v_signature in array array[
    'pin_status()', 'pin_set(text)', 'pin_verify(text)',
    'profile_update(text, text)', 'kyc_submit(text)',
    'account_close_self()', 'org_create(text, text, text, text)',
    'admin_review_kyc(uuid, text)', 'admin_set_dispute_status(uuid, text)',
    'admin_review_moderation(uuid, text)', 'admin_set_commission(text, numeric)',
    'admin_update_config(text, text, boolean, text, text)', 'admin_update_plan(uuid, integer)',
    'admin_toggle_status(text, uuid)', 'admin_create_category(text, uuid)',
    'admin_set_user_suspended(uuid, boolean)', 'admin_users(text, integer, integer)',
    'admin_anonymized_accounts()', 'admin_overview()', 'admin_funds_summary()',
    'admin_investment_supervision()', 'admin_supervision()'
  ]
  loop
    execute format('revoke all on function public.%s from public, anon', v_signature);
    execute format('grant execute on function public.%s to authenticated', v_signature);
  end loop;
end;
$$;

-- Jamais appelables par les clients.
revoke all on function public.admin_require() from public, anon, authenticated;
revoke all on function public.admin_log(text, text, text) from public, anon, authenticated;

-- L'API (PostgREST) recharge son schéma : nouvelles fonctions et politiques.
notify pgrst, 'reload schema';
