-- Street Fries — domicilio vs. recoger en el local
-- Correr en Supabase → SQL Editor → New query → Run.

alter table orders add column if not exists tipo_entrega text not null default 'domicilio'
  check (tipo_entrega in ('domicilio', 'recoger'));

-- Un pedido para recoger no trae dirección.
alter table orders alter column direccion drop not null;
