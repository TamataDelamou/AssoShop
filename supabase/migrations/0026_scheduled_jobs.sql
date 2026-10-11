-- ============================================================================
-- 0026 — Tâches planifiées en base (pg_cron), toutes les 15 minutes.
-- Appliquer après 0025_flutter_backend.sql.
--
-- Il n'y a plus d'hébergeur web pour planifier des appels (plus de
-- vercel.json) : la base planifie elle-même.
--
--  1. Dénouement des séquestres d'investissement : appel SQL direct de
--     market_settle_due_investments(), sans passer par le réseau. Un projet
--     qui ne peut pas être dénoué est signalé dans admin_audit_logs
--     (« critical »), donc visible du back-office et du Control Plane.
--  2. Envoi au Kernel : appel HTTP (pg_net) de l'Edge Function
--     control-plane-push, authentifié par CRON_SECRET. L'adresse des
--     fonctions et le secret sont lus dans Supabase Vault au moment de
--     l'appel ; tant qu'ils n'y sont pas, la tâche ne fait rien.
--
-- Secrets attendus dans Vault (voir docs/PRODUCTION.md) :
--   assoshop_functions_url   https://<ref>.supabase.co/functions/v1
--   assoshop_cron_secret     la valeur de CRON_SECRET des Edge Functions
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- 1. DÉNOUEMENT DES SÉQUESTRES -----------------------------------------------

-- Appelée par pg_cron. Idempotente comme market_settle_due_investments ;
-- chaque échec est journalisé une fois par passage.
create or replace function public.market_settle_due_investments_job()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report jsonb := public.market_settle_due_investments();
  v_failure jsonb;
begin
  for v_failure in select * from jsonb_array_elements(coalesce(v_report->'failed', '[]'::jsonb))
  loop
    insert into public.admin_audit_logs (actor, action, module, severity)
    values (
      'system',
      'investment_settlement_failed:' || (v_failure->>'project_id') || ':' || coalesce(v_failure->>'code', ''),
      'market', 'critical'
    );
  end loop;
  return v_report;
end;
$$;

-- 2. ENVOI AU KERNEL ---------------------------------------------------------

-- Appelée par pg_cron. Renvoie 'requested' (appel HTTP mis en file par
-- pg_net) ou 'skipped' (secrets absents de Vault : Control Plane non branché).
create or replace function public.cp_trigger_push()
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_url text;
  v_secret text;
begin
  select s.decrypted_secret into v_url
  from vault.decrypted_secrets s where s.name = 'assoshop_functions_url';
  select s.decrypted_secret into v_secret
  from vault.decrypted_secrets s where s.name = 'assoshop_cron_secret';

  if coalesce(trim(v_url), '') = '' or coalesce(trim(v_secret), '') = '' then
    return 'skipped';
  end if;

  perform net.http_post(
    url := rtrim(trim(v_url), '/') || '/control-plane-push',
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || trim(v_secret)
    ),
    timeout_milliseconds := 20000
  );
  return 'requested';
end;
$$;

-- 3. PLANIFICATION -----------------------------------------------------------

-- Rejouable : une tâche du même nom est remplacée.
select cron.unschedule(j.jobid)
from cron.job j
where j.jobname in ('assoshop-investments-settle', 'assoshop-control-plane-push');

select cron.schedule(
  'assoshop-investments-settle',
  '*/15 * * * *',
  $$select public.market_settle_due_investments_job()$$
);

select cron.schedule(
  'assoshop-control-plane-push',
  '*/15 * * * *',
  $$select public.cp_trigger_push()$$
);

-- 4. DROITS D'EXÉCUTION ------------------------------------------------------
-- Jamais appelables par les clients.
revoke all on function public.market_settle_due_investments_job() from public, anon, authenticated;
revoke all on function public.cp_trigger_push() from public, anon, authenticated;
