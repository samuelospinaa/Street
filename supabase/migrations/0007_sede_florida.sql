-- Street Fries — nueva sede: Florida
-- Correr en Supabase → SQL Editor → New query → Run.

alter table orders drop constraint if exists orders_sede_id_check;

alter table orders add constraint orders_sede_id_check
  check (sede_id in ('parque-sabaneta', 'calle-larga', 'mixy-mall-los-colores', 'envigado', 'complex-ditaires', 'florida'));
