-- P3.9 : unification des portefeuilles. Le portefeuille unique de l'app est
-- pay_wallets ; le marché s'appuie sur le portefeuille personnel (type='personal').

-- Un seul portefeuille personnel par utilisateur.
create unique index if not exists idx_pay_wallets_primary
  on public.pay_wallets (user_id)
  where type = 'personal';

-- Le portefeuille marché est absorbé par pay_wallets.
drop policy if exists "market_wallets_select" on public.market_wallets;
drop policy if exists "market_wallets_insert" on public.market_wallets;
drop policy if exists "market_wallets_update" on public.market_wallets;
drop table if exists public.market_wallets;
