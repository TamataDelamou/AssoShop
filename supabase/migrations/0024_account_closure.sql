-- ============================================================================
-- 0024 — Fermeture de compte : suppression refusée tant que le compte porte
-- des engagements financiers ; il est alors anonymisé.
-- Appliquer après 0023_investment_escrow_settlement.sql.
--
--  1. account_deletion_blockers() : motifs qui interdisent la suppression
--     (solde non nul, contribution en séquestre, commande non livrée, part
--     dans un projet d'investissement).
--  2. Garde en base : un trigger sur auth.users refuse toute suppression d'un
--     tel compte, d'où qu'elle vienne (application, tableau de bord Supabase,
--     script). Les lignes comptables rattachées au compte par cascade
--     (portefeuilles, transactions, contributions) ne peuvent donc plus
--     disparaître : le dénouement des séquestres (0023) ne trouve plus de
--     séquestre incohérent pour ce motif.
--  3. account_close() : décide entre suppression et anonymisation. Anonymiser
--     efface l'identité (nom, e-mail, téléphone) et bloque la connexion, en
--     gardant l'identifiant du compte pour la comptabilité.
--
-- Code d'erreur ajouté : AC001 suppression refusée (compte à anonymiser).
-- ============================================================================

-- 1. TRACE DES ANONYMISATIONS ------------------------------------------------

create table if not exists public.account_anonymizations (
  user_id uuid primary key references auth.users (id) on delete cascade,
  reasons text[] not null default '{}',
  anonymized_at timestamptz not null default now()
);

-- Table technique : aucune politique, aucun accès pour les rôles client.
alter table public.account_anonymizations enable row level security;
revoke all on public.account_anonymizations from anon, authenticated;

-- 2. MOTIFS DE BLOCAGE -------------------------------------------------------

-- Interne. Renvoie les motifs qui interdisent de supprimer le compte :
--   wallet_balance      un portefeuille au solde non nul ;
--   escrow_contribution une contribution non remboursée dans un projet non dénoué ;
--   undelivered_order   une commande ni livrée ni annulée, comme acheteur ou revendeur ;
--   project_share       une mise dans un projet financé, ou un projet porté
--                       qui est financé ou a reçu des contributions.
create or replace function public.account_deletion_blockers(p_user_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select array_remove(array[
    case when exists (
      select 1 from public.pay_wallets w
      where w.user_id = p_user_id and w.balance <> 0
    ) then 'wallet_balance' end,
    case when exists (
      select 1
      from public.market_investment_contributions c
      join public.market_investment_projects p on p.id = c.project_id
      where c.user_id = p_user_id and c.refunded_at is null and p.settled_at is null
    ) then 'escrow_contribution' end,
    case when exists (
      select 1 from public.market_orders o
      where o.status not in ('delivered', 'cancelled')
        and (
          o.buyer_id = p_user_id
          or exists (
            select 1 from public.market_resellers r
            where r.id = o.reseller_id and r.user_id = p_user_id
          )
        )
    ) then 'undelivered_order' end,
    case when exists (
      select 1
      from public.market_investment_contributions c
      join public.market_investment_projects p on p.id = c.project_id
      where c.user_id = p_user_id and c.refunded_at is null and p.status = 'funded'
    ) or exists (
      select 1 from public.market_investment_projects p
      where p.created_by = p_user_id
        and (
          p.status = 'funded'
          or exists (
            select 1 from public.market_investment_contributions c
            where c.project_id = p.id and c.refunded_at is null
          )
        )
    ) then 'project_share' end
  ], null);
$$;

-- 3. GARDE EN BASE -----------------------------------------------------------

-- security definer : le trigger est déclenché par le service d'authentification,
-- qui n'a pas accès aux tables du schéma public.
create or replace function public.account_guard_user_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_blockers text[] := public.account_deletion_blockers(old.id);
begin
  if coalesce(array_length(v_blockers, 1), 0) > 0 then
    raise exception 'Compte non supprimable (%) : il doit être anonymisé', array_to_string(v_blockers, ', ')
      using errcode = 'AC001';
  end if;
  return old;
end;
$$;

drop trigger if exists account_guard_user_delete on auth.users;
create trigger account_guard_user_delete
  before delete on auth.users
  for each row execute function public.account_guard_user_delete();

-- 4. FERMETURE D'UN COMPTE ---------------------------------------------------

-- Réservée au serveur (service_role). Renvoie :
--   { "action": "delete" }      aucun engagement : l'appelant supprime le
--                               compte par l'API d'administration de l'auth ;
--   { "action": "anonymized" }  engagements en cours : identité effacée,
--                               connexion bloquée, identifiant et écritures
--                               comptables conservés.
-- Idempotente : un compte déjà anonymisé le reste, sans nouvelle écriture.
create or replace function public.account_close(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_blockers text[];
begin
  perform 1 from auth.users u where u.id = p_user_id for update;
  if not found then
    raise exception 'Compte introuvable' using errcode = 'PY018';
  end if;

  if exists (select 1 from public.account_anonymizations a where a.user_id = p_user_id) then
    return jsonb_build_object('action', 'anonymized', 'already', true, 'reasons', '[]'::jsonb);
  end if;

  v_blockers := public.account_deletion_blockers(p_user_id);
  if coalesce(array_length(v_blockers, 1), 0) = 0 then
    return jsonb_build_object('action', 'delete', 'reasons', '[]'::jsonb);
  end if;

  -- Identité de connexion : e-mail remplacé par une adresse neutre dérivée de
  -- l'identifiant, téléphone, mot de passe et métadonnées effacés, compte banni.
  update auth.users
  set email = 'anonyme-' || id::text || '@anonymise.invalid',
      phone = null,
      encrypted_password = null,
      raw_user_meta_data = '{}'::jsonb,
      banned_until = now() + interval '100 years',
      updated_at = now()
  where id = p_user_id;

  -- Plus aucun moyen de connexion ni session ouverte.
  delete from auth.identities where user_id = p_user_id;
  delete from auth.sessions where user_id = p_user_id;

  -- Identité dans les tables métier.
  update public.members
  set name = 'Compte anonymisé', email = null, phone = null, updated_at = now()
  where user_id = p_user_id;

  update public.market_reseller_applications
  set contact_name = 'Compte anonymisé', id_document = ''
  where user_id = p_user_id;

  update public.admin_kyc
  set user_name = 'Compte anonymisé'
  where user_id = p_user_id;

  delete from public.pay_methods where user_id = p_user_id;

  -- Un compte anonymisé n'administre plus la plateforme.
  delete from public.platform_admins where user_id = p_user_id;

  insert into public.account_anonymizations (user_id, reasons)
  values (p_user_id, v_blockers);

  insert into public.admin_audit_logs (actor, action, module, severity)
  values ('system', 'account_anonymized:' || p_user_id::text, 'hub', 'warning');

  return jsonb_build_object('action', 'anonymized', 'already', false, 'reasons', to_jsonb(v_blockers));
end;
$$;

-- 5. DROITS D'EXÉCUTION ------------------------------------------------------
-- Jamais appelables par les clients.
revoke all on function public.account_deletion_blockers(uuid) from public, anon, authenticated;
revoke all on function public.account_guard_user_delete() from public, anon, authenticated;
revoke all on function public.account_close(uuid) from public, anon, authenticated;
grant execute on function public.account_close(uuid) to service_role;

-- L'API (PostgREST) recharge son schéma : nouvelle fonction.
notify pgrst, 'reload schema';
