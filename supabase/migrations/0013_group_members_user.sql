-- Liaison des membres de groupe aux comptes auth.users.
-- Débloque la vue personnelle (situation financière Pay, groupes du Hub).
alter table public.group_members
  add column if not exists user_id uuid references auth.users (id) on delete set null;
