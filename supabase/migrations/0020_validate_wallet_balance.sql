-- 0020 — Validation de la contrainte de solde non négatif.
-- Appliquer après 0019_market_topup_integrity.sql.
--
-- 0017 a créé pay_wallets_balance_non_negative en « not valid » pour ne pas
-- bloquer sur d'éventuelles lignes existantes. Contrôle fait avant
-- application : aucun portefeuille à solde négatif. La contrainte est donc
-- validée ; elle couvre désormais toutes les lignes, existantes et à venir.
alter table public.pay_wallets
  validate constraint pay_wallets_balance_non_negative;
