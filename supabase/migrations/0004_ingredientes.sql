-- Street Fries — ingredientes de cada plato de papas (para poder pedir "sin X")
-- Correr en Supabase → SQL Editor → New query → Run.

alter table menu_items add column if not exists ingredientes text[];
alter table order_items add column if not exists ingredientes_quitados text[];
