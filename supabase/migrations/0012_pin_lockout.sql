-- Verrouillage du PIN après échecs répétés (anti-brute-force).
alter table public.user_profiles
  add column if not exists pin_attempts integer not null default 0,
  add column if not exists pin_locked_until timestamptz;
