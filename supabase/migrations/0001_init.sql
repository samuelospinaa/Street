-- Street Fries — esquema inicial
-- Correr en Supabase → SQL Editor → New query → Run.

-- =========================================================
-- Tablas
-- =========================================================

create table if not exists menu_items (
  id text primary key,              -- mismo slug del JSON (ej. 'fries-oxford-street')
  seccion text not null,            -- 'signature_dishes' | 'fries_especiales' | 'fries_tradicionales'
                                    -- | 'entrada' | 'adiciones' | 'bebidas' | 'producto_destacado'
  nombre text not null,
  subtitulo text,
  descripcion text,
  precio_cop numeric not null,
  imagen_url text,                  -- null si el producto no tiene foto
  activo boolean default true,
  created_at timestamptz default now(),
  -- columnas de apoyo (no alteran las anteriores)
  orden integer default 0,          -- preserva el orden del JSON dentro de cada sección
  salsas_recomendadas text[]        -- campo opcional que ya trae el JSON de algunos productos
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  cliente_nombre text not null,
  cliente_telefono text,
  direccion text not null,
  ubicacion_lat double precision,
  ubicacion_lng double precision,
  notas text,
  subtotal numeric not null,
  estado text default 'pendiente',
  created_at timestamptz default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  menu_item_id text references menu_items(id),
  nombre_snapshot text not null,
  precio_snapshot numeric not null,
  cantidad integer not null default 1,
  salsas text[],
  adiciones text[],
  created_at timestamptz default now()
);

-- Salsas: no son productos con precio, viven en su propia tabla para poder
-- activarlas/desactivarlas desde Supabase sin volver a desplegar.
create table if not exists salsas (
  id text primary key,              -- 'salsa-sriracha'
  nombre text not null,
  grupo text not null check (grupo in ('chef', 'disponible')),
  activo boolean default true,
  orden integer default 0
);

create index if not exists menu_items_seccion_idx on menu_items (seccion, orden);
create index if not exists order_items_order_id_idx on order_items (order_id);
create index if not exists orders_created_at_idx on orders (created_at desc);

-- =========================================================
-- Row Level Security
-- La anon key es pública (viaja al navegador): el menú se puede leer,
-- los pedidos SOLO se pueden insertar. Nadie puede listar, editar ni borrar
-- pedidos con esa llave — eso se hace desde el dashboard o con service_role.
-- =========================================================

alter table menu_items enable row level security;
alter table salsas enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

drop policy if exists "menu_items lectura publica" on menu_items;
create policy "menu_items lectura publica"
  on menu_items for select
  to anon, authenticated
  using (true);

drop policy if exists "salsas lectura publica" on salsas;
create policy "salsas lectura publica"
  on salsas for select
  to anon, authenticated
  using (true);

drop policy if exists "orders insercion publica" on orders;
create policy "orders insercion publica"
  on orders for insert
  to anon, authenticated
  with check (true);

drop policy if exists "order_items insercion publica" on order_items;
create policy "order_items insercion publica"
  on order_items for insert
  to anon, authenticated
  with check (true);

-- Sin policies de select/update/delete sobre orders y order_items: quedan cerradas.

-- =========================================================
-- Storage: bucket público para las fotos de producto
-- (el seed también lo crea si no existe; esto lo deja listo de una vez)
-- =========================================================

insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do update set public = true;

drop policy if exists "menu-images lectura publica" on storage.objects;
create policy "menu-images lectura publica"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'menu-images');
