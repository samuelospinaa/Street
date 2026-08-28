-- Street Fries — agrega el grupo "tradicional" a salsas (Roja, Mayonesa, Rosada, Mostaza...)
-- Correr en Supabase → SQL Editor → New query → Run.

alter table salsas drop constraint if exists salsas_grupo_check;
alter table salsas add constraint salsas_grupo_check check (grupo in ('tradicional', 'chef', 'disponible'));
