-- Contrainte d'unicité : un seul enregistrement de retrait par commande
-- (requis par l'upsert ON CONFLICT du scan de colis).
alter table public.market_pickup_records
  add constraint market_pickup_records_order_id_key unique (order_id);
