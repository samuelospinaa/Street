-- Street Fries — agrega unidad/apto y teléfono alternativo al pedido
-- Correr en Supabase → SQL Editor → New query → Run.

alter table orders add column if not exists unidad text;
alter table orders add column if not exists cliente_telefono_alterno text;
