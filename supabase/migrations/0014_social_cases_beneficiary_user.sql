-- Liaison du bénéficiaire d'un cas social à un compte auth.users.
-- Débloque le calcul des aides reçues (situation Pay).
alter table public.social_cases
  add column if not exists beneficiary_user_id uuid references auth.users (id) on delete set null;
