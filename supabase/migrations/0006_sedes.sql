-- Street Fries — varias sedes: a cuál se manda cada pedido
-- Correr en Supabase → SQL Editor → New query → Run.

alter table orders add column if not exists sede_id text not null default 'parque-sabaneta'
  check (sede_id in ('parque-sabaneta', 'calle-larga', 'mixy-mall-los-colores', 'envigado', 'complex-ditaires'));

-- Guardamos también el nombre (no solo el id) para que el dashboard no tenga
-- que mantener el mapeo id → nombre si algún día cambia.
alter table orders add column if not exists sede_nombre text not null default 'Parque Sabaneta';


