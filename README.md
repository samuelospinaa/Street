# Street Fries — Landing de pedidos

Landing de pedidos para Street Fries, un puesto de papas premium. El cliente arma su pedido del menú,
deja dirección (o elige recoger en el local) y datos de contacto, y al confirmar **el pedido se guarda en
Supabase** y aparece un botón que abre WhatsApp con el resumen ya redactado. El cajero solo confirma precio
final y tiempo de entrega/recogida por WhatsApp.

Sin pagos en línea. Sin login. Next.js 14 (App Router) + TypeScript + Tailwind + Supabase, listo para Vercel.
Incluye un asistente de chat ("Liberty") que responde preguntas sobre el menú usando Groq.

---

## Tabla de contenido

1. [Puesta en marcha](#1-crear-el-proyecto-en-supabase)
2. [Funcionalidades](#funcionalidades)
3. [Arquitectura y decisiones de diseño](#arquitectura-y-decisiones-de-diseño)
4. [Modelo de datos](#modelo-de-datos)
5. [Estructura del repo](#estructura-del-repo)
6. [Operación del día a día](#ver-los-pedidos-que-entran)

---

## 1. Crear el proyecto en Supabase

1. Entra a [supabase.com](https://supabase.com) → **New project**. Guarda la contraseña de la base.
2. En el panel, abre **SQL Editor → New query**, pega todo el contenido de
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) y dale **Run**.
3. Corre en orden las migraciones siguientes (cada una agrega algo puntual sobre el esquema inicial):
   [`0002_add_unidad_telefono_alterno.sql`](supabase/migrations/0002_add_unidad_telefono_alterno.sql),
   [`0003_salsas_tradicionales.sql`](supabase/migrations/0003_salsas_tradicionales.sql),
   [`0004_ingredientes.sql`](supabase/migrations/0004_ingredientes.sql),
   [`0005_tipo_entrega.sql`](supabase/migrations/0005_tipo_entrega.sql).

Eso crea las tablas `menu_items`, `orders`, `order_items` y `salsas`, las políticas de seguridad (RLS) y el
bucket público `menu-images`.

**Sobre la seguridad:** la `anon key` viaja al navegador, así que las políticas dejan *leer* el menú y
*insertar* pedidos, nada más. Nadie puede listar, editar ni borrar pedidos con esa llave — eso solo se hace
desde el dashboard de Supabase o con la `service_role` (local, ver abajo).

## 2. Configurar las variables de entorno

```bash
cp .env.example .env.local
```

Llena `.env.local` con:

| Variable | Dónde sacarla |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` `public` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` |
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) → API Keys — la usa el asistente del chat (`/api/asistente`) |
| `GROQ_MODEL` | Opcional. Modelo de Groq a usar; por defecto `openai/gpt-oss-120b` (ver [`lib/groq.ts`](lib/groq.ts)) |
| `NEXT_PUBLIC_SITE_URL` | El dominio real en producción, `https://www.streetfries.online`. Sin esta, Open Graph/`sitemap.xml`/`robots.txt` caen al subdominio interno de Vercel (ver [`lib/site.ts`](lib/site.ts)) — debe agregarse en Vercel → Settings → Environment Variables |

El WhatsApp de cada sede ya no es una env var: son 5 locales, así que sus números viven en
[`lib/sedes.ts`](lib/sedes.ts) (campo `whatsapp` de cada `Sede`, mismo formato de antes: solo dígitos con
indicativo, ej. `573001234567`). El cliente elige la sede en `/pedido`; el servidor valida ese id contra
esta lista antes de armar el link de WhatsApp — nunca confía en un número que venga del navegador.

> La `service_role` da acceso total a la base. Solo se usa localmente para el seed: **no va a Vercel y no se
> commitea.** `GROQ_API_KEY` es distinta: no es pública (no lleva `NEXT_PUBLIC_`), pero sí corre en el
> servidor en producción — **esa sí va a Vercel.**

## 3. Cargar el menú y las fotos

```bash
npm install
npm run seed
```

El seed ([`scripts/seed-menu.ts`](scripts/seed-menu.ts)) lee `street_fries_menu.json` (fuente de verdad),
sube las fotos reales de `menu-images/` al bucket `menu-images` y llena las tablas `menu_items` y `salsas`.
Es idempotente: puedes correrlo las veces que quieras, no duplica filas.

Debe imprimir 45 productos (1 destacado, 1 entrada, 6 signature, 5 especiales, 10 tradicionales, 17
adiciones, 5 bebidas), 7 de ellos con foto, y 18 salsas.

## 4. Correr en local

```bash
npm run dev
```

En [http://localhost:3000](http://localhost:3000). Otros comandos disponibles:

```bash
npm run build   # build de producción
npm run start   # sirve el build de producción
npm run lint    # eslint (next lint)
```

No hay suite de tests en este proyecto.

## 5. Desplegar en Vercel

1. Sube el repo a GitHub e impórtalo en [vercel.com](https://vercel.com) (**New Project**). Vercel detecta
   Next.js solo.
2. En **Settings → Environment Variables** agrega:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GROQ_API_KEY` (para el asistente del chat)
   - `GROQ_MODEL` (opcional)
3. **Deploy**. El link resultante es el que se comparte por WhatsApp e Instagram.

---

## Funcionalidades

### Explorar el menú (`/`)

- El menú se carga desde Supabase en el Server Component de [`app/page.tsx`](app/page.tsx) vía
  [`lib/menu.ts`](lib/menu.ts) (`cargarMenu`), revalidado cada 60 segundos (`export const revalidate = 60`
  implícito por el fetch de Supabase con `next: { revalidate }` / recarga de página). Solo se traen filas con
  `activo = true`.
- Las secciones visibles son `Signature Dishes`, `Fries Especiales`, `Fries Tradicionales`, `Entrada` y
  `Bebidas` (`SECCIONES_MENU` en [`lib/types.ts`](lib/types.ts)). La sección `producto_destacado` (el Tostón
  de Queso) no tiene tarjeta propia — ver más abajo.
- El header (`Header.tsx`) ofrece tres botones de filtro rápido — Tradicionales / Especiales / Del Chef
  (`FILTROS_PAPAS`) — que navegan a `/?seccion=<key>` y hacen que `OrderExperience` muestre solo esa sección
  de papas (las demás secciones, como bebidas o entrada, se siguen mostrando siempre).
- Cada producto se renderiza como una `ProductCard` (`components/ProductCard.tsx`). Hay dos variantes:
  - **`simple`** (entradas y bebidas): nombre, descripción, precio, selector de cantidad y botón "Agregar".
  - **`fries`** (signature/especiales/tradicionales, es decir cualquier sección en `SECCIONES_CON_PAPAS`):
    además de lo anterior, tres desplegables opcionales por tarjeta:
    - **Ingredientes** — lista de ingredientes base del plato (`menu_items.ingredientes`); el cliente
      desmarca los que no quiere ("sin guacamole", etc.) y eso viaja como `ingredientesQuitados`.
    - **Adiciones** — extras que suman a esa línea (ver la sección dedicada abajo).
    - **Salsas** — sin límite de cantidad, agrupadas en Tradicionales / Del chef / Especiales. Si el plato
      trae `salsas_recomendadas` en el JSON, esas empiezan marcadas (el cliente puede quitarlas o añadir
      otras).
- Solo 7 productos tienen foto real (los de la carta oficial); el resto se muestra solo con texto **a
  propósito** — no hay placeholders grises. El encuadre/zoom de cada foto (porque las fotos de la carta traen
  texto y marcas pegados al borde) se define por producto en [`lib/imagenes.ts`](lib/imagenes.ts), sin tocar
  los archivos originales.
- Un carrito flotante (`CartBar.tsx`) siempre visible resume cantidad de ítems y subtotal, con acceso rápido
  a editar cada línea (reusa `EditorLinea.tsx`, el mismo editor que usa la página `/pedido`) sin salir del
  menú.

### El "Tostón de Queso" como adición universal

El producto insignia de la casa (`producto_destacado`, id `toston-de-queso`) no aparece como tarjeta en el
menú. En su lugar:

- `construirAdiciones()` en [`lib/menu.ts`](lib/menu.ts) lo antepone, junto con una entrada sintética
  **"Tostón Entocinetado"** (tostón + tocineta, `TOSTON_ENTOCINETADO_EXTRA` = $1.900 extra, no existe como
  fila en `menu_items`), a la lista de adiciones de **cualquier** plato de papas.
- En `ProductCard`, marcar el tostón simple desmarca automáticamente el entocinetado y viceversa (son
  mutuamente excluyentes).
- Si el cliente le da "Agregar" a un plato de papas sin haber marcado ninguna de las dos variantes, aparece
  un diálogo de upsell ofreciendo el tostón simple, el entocinetado, o continuar sin él.
- El precio del entocinetado nunca se confía del navegador: `app/actions.ts` lo vuelve a calcular en el
  servidor a partir del precio real del tostón + el cargo fijo.

### Carrito y edición de líneas

- El carrito vive en [`lib/cart-context.tsx`](lib/cart-context.tsx) (`CartProvider`/`useCart()`), montado una
  sola vez en [`app/layout.tsx`](app/layout.tsx) — así sobrevive la navegación entre `/` y `/pedido`, y
  también se persiste en `localStorage` (`street-fries-carrito-v1`) para no perderse si el cliente recarga a
  medio camino.
- Dos líneas del carrito se fusionan automáticamente si son el mismo producto con exactamente las mismas
  salsas, adiciones e ingredientes quitados (`firmaLinea`); si no, quedan como líneas independientes aunque
  sean el mismo producto.
- `EditorLinea.tsx` es el editor compartido de una línea existente (ingredientes/salsas/adiciones), usado
  tanto desde `CartBar` (edición rápida mientras se navega el menú) como desde el resumen editable de
  `/pedido`.

### Checkout (`/pedido`)

Página aparte (`components/OrderForm.tsx`) para no perder el progreso del menú si el cliente vuelve atrás a
agregar algo:

- **Tipo de entrega**: domicilio o recoger en el local. Si es domicilio, se piden dirección (obligatoria),
  unidad/apto (opcional) y hay un botón de geolocalización opcional (`navigator.geolocation`); si el cliente
  la niega o falla, el pedido sigue solo con la dirección escrita. Si sí la comparte, el mensaje final de
  WhatsApp incluye un link de Google Maps con las coordenadas. Si es recoger, no se pide dirección.
- **Datos de contacto**: nombre (obligatorio), teléfono y teléfono alternativo (ambos opcionales), notas
  libres.
- **Resumen editable**: cada línea del carrito se puede editar (si es un producto de papas, reabre
  `EditorLinea`), cambiar de cantidad o quitar; hay chips de acceso rápido para agregar una bebida que faltó
  sin volver al menú.
- El subtotal mostrado es **siempre informativo** — nunca incluye domicilio, y el texto lo aclara en el
  carrito, en el resumen y en el mensaje de WhatsApp.
- Al confirmar, se llama a la server action `createOrder` (`app/actions.ts`). Si todo sale bien, la página
  cambia a una pantalla de "Último paso" con un botón verde que abre `wa.me` con el mensaje ya redactado; si
  algo falla, se muestra el error devuelto por la action sin perder lo que el cliente ya escribió.

### Guardado del pedido (trust boundary del lado servidor)

Toda la lógica de guardado vive en la única server action del proyecto: [`app/actions.ts`](app/actions.ts)
(`createOrder`, `'use server'`). El cliente nunca decide el precio final:

1. **Validación** de campos obligatorios (nombre; dirección si es domicilio; carrito no vacío).
2. **Recalculo de precios en el servidor**: el payload del navegador solo trae `menuItemId`s, cantidades,
   salsas (texto libre por línea) y `adicionIds` — nunca precios. `createOrder` vuelve a leer
   `menu_items` con la `anon key` (que solo puede `select`) antes de construir cada línea, así nadie puede
   fabricar un precio manipulando el cliente. También valida que cada `menuItemId` siga `activo` y que los
   `ingredientesQuitados` reportados de verdad pertenezcan al plato (`menu_items.ingredientes`).
3. **Escritura en dos fases, no atómica** (porque RLS no da `select`/`RETURNING` sobre `orders`): se genera
   el `id` con `crypto.randomUUID()` en el servidor, se inserta en `orders`, y luego en `order_items`. Si el
   insert de los ítems falla, se borra el pedido recién creado para no dejar una fila huérfana.
4. Solo **después** de que ambos inserts tienen éxito se construye el mensaje (`lib/whatsapp.ts`,
   `buildOrderMessage`) y el link `wa.me` (`buildWaLink`) — es decir, un pedido siempre queda registrado en
   la base antes de que exista la posibilidad de enviarlo por WhatsApp, incluso si el cliente nunca llega a
   tocar "Enviar".

### Precios

Todo el cálculo de precios pasa por [`lib/pricing.ts`](lib/pricing.ts):

- `totalLinea(linea)` = (precio base + suma de adiciones) × cantidad.
- `subtotalCarrito(lineas)` = suma de `totalLinea` de todas las líneas.
- `formatCOP(valor)` formatea a pesos colombianos sin el espacio que mete `Intl` entre el signo y el número
  (`$34.900`, no `$ 34.900`).

Tanto el carrito del cliente (`CartBar`, `OrderForm`) como el recalculo en `app/actions.ts` usan estas mismas
funciones, así nunca hay divergencia entre lo que ve el cliente y lo que se guarda.

### Asistente de chat ("Liberty")

`components/ChatAsistente.tsx` está montado en el layout raíz (persiste entre `/` y `/pedido`, como el
carrito) y habla con [`app/api/asistente/route.ts`](app/api/asistente/route.ts):

- El endpoint arma un system prompt (`lib/asistente.ts`) con el **menú completo activo** (nombre, precio e
  ingredientes o descripción — nunca ambos, para ahorrar tokens) más un resumen del **carrito actual del
  cliente**, y lo manda junto con el historial de la conversación a Groq (`lib/groq.ts`,
  `openai/gpt-oss-120b` por defecto vía `MODELO_ASISTENTE`).
- El asistente es **solo consultivo**: puede explicar el menú, sugerir un plato, describir el flujo de
  pedido, o comentar lo que hay en el carrito — pero no tiene tool-calling, así que nunca puede agregar ni
  quitar nada del carrito por sí mismo; siempre remite al cliente a los botones del menú.
- El system prompt (`PROMPT_SISTEMA_BASE`) le prohíbe inventar productos, precios, ingredientes, promos u
  horarios que no estén en el contexto real, y le pide respuestas breves (2–4 frases) en el idioma del
  cliente.
- **Límites duros por el plan de Groq (8000 tokens/minuto compartidos entre todos los modelos):**
  - El historial que se manda se recorta a los últimos 6 mensajes y 500 caracteres cada uno
    (`MAX_MENSAJES_HISTORIAL`, `MAX_LARGO_MENSAJE` en `route.ts`).
  - El contexto del menú lista `ingredientes` en vez de `descripcion` cuando existen (son redundantes) para
    mantenerlo compacto.
  - `reasoning_effort: 'low'` es obligatorio en la llamada a Groq: `gpt-oss-120b` es un modelo "razonador" y
    sin ese límite puede gastar todo el presupuesto de `max_tokens` "pensando" y devolver contenido vacío.
  - Un 429 de Groq (límite de tokens/minuto alcanzado) se distingue (`ErrorLimiteGroq`) para mostrarle al
    cliente un mensaje de "hay mucho movimiento, espera un poco" en vez del error genérico.
- El endpoint no cachea (`export const dynamic = 'force-dynamic'`): cada pregunta es un request independiente
  y el contexto del menú se reconstruye siempre desde Supabase, así nunca queda desactualizado si alguien
  cambia un precio directo en la base.

---

## Arquitectura y decisiones de diseño

- **Fuente de verdad del menú**: `street_fries_menu.json` es el origen de todo el contenido. `npm run seed`
  lo sube (junto con las fotos de `menu-images/`) a las tablas de Supabase `menu_items` y `salsas`. La app
  lee el menú desde Supabase en runtime (revalidado cada 60s) — editar filas directamente en el Table
  Editor de Supabase es la forma normal de cambiar un precio/descripción/disponibilidad sin volver a
  correr el seed; solo los cambios estructurales (nuevo producto, nueva sección) vuelven a pasar por el
  JSON + reseed.
- **Frontera de confianza en la server action**: `app/actions.ts` es el único lugar donde se escriben
  pedidos. Ver la sección "Guardado del pedido" arriba.
- **Cliente Supabase dual**: [`lib/supabase.ts`](lib/supabase.ts) expone `getSupabase()` (llave `anon`,
  usada en el Server Component que lee el menú y en la server action de pedidos) y `getSupabaseAdmin()`
  (`service_role`, solo para el script de seed — nunca se importa desde código que corre en el navegador o
  en Vercel).
- **Carrito fuera de las páginas, checkout en su propia ruta**: el `CartProvider` vive en el layout raíz, no
  dentro de una página, para sobrevivir la navegación `/` ↔ `/pedido`. `lib/menu.ts` centraliza el fetch del
  menú y la derivación de "inyectar el Tostón en adiciones", compartida por los Server Components de ambas
  páginas.
- **Imágenes**: recortadas por CSS (`object-position`/`transform: scale`), no por edición del archivo
  fuente, porque las fotos oficiales de la carta traen texto y logo pegados a los bordes que hay que
  encuadrar distinto según dónde se use la foto (tarjeta grande vs. diálogo de upsell).

## Modelo de datos

Tablas (ver [`supabase/migrations/`](supabase/migrations/)):

- **`menu_items`** — catálogo del menú. `id` es el slug del JSON. `seccion` distingue
  `producto_destacado` / `entrada` / `signature_dishes` / `fries_especiales` / `fries_tradicionales` /
  `adiciones` / `bebidas`. `ingredientes` (`text[]`, migración 0004) habilita el "sin X" por plato.
  `salsas_recomendadas` (`text[]`) pre-marca salsas en la tarjeta. `activo=false` oculta el producto sin
  borrar histórico.
- **`salsas`** — catálogo separado (no tienen precio). `grupo` es `tradicional` | `chef` | `disponible`
  (migración 0003 agregó `tradicional`).
- **`orders`** — un pedido. `tipo_entrega` (`domicilio` | `recoger`, migración 0005; `direccion` es
  nullable desde entonces porque "recoger" no la necesita). `unidad` y `cliente_telefono_alterno`
  (migración 0002). Sin política de `select`: nadie puede leer pedidos con la `anon key`, solo insertar.
  `estado` arranca en `'pendiente'` y queda libre para que el restaurante lo mueva a `'confirmado'` /
  `'entregado'` / `'cancelado'` desde el dashboard.
- **`order_items`** — líneas de un pedido, con `nombre_snapshot`/`precio_snapshot` (copia congelada al
  momento del pedido, no una referencia viva al precio actual del producto) y `ingredientes_quitados`
  (migración 0004).
- **Storage** — bucket público `menu-images`, con policy de lectura pública; el seed sube ahí las 7 fotos
  reales.

RLS: `menu_items` y `salsas` permiten `select` público; `orders` y `order_items` permiten `insert` público
y nada más. Todo lo demás (leer, editar, borrar pedidos) requiere el dashboard de Supabase o la
`service_role`.

---

## Ver los pedidos que entran

Supabase → **Table Editor → `orders`** (ordena por `created_at` descendente); los productos de cada pedido
están en `order_items`. O en el SQL Editor:

```sql
select o.created_at, o.cliente_nombre, o.tipo_entrega, o.direccion, o.subtotal, o.estado,
       json_agg(json_build_object(
         'producto', i.nombre_snapshot, 'cantidad', i.cantidad,
         'salsas', i.salsas, 'adiciones', i.adiciones,
         'sin', i.ingredientes_quitados)) as items
from orders o join order_items i on i.order_id = o.id
group by o.id order by o.created_at desc limit 50;
```

Cada pedido queda guardado **aunque el cliente no llegue a enviar el WhatsApp**: la inserción ocurre antes de
generar el link. Si la inserción falla, no se genera el link y el cliente ve un error — así nunca hay pedidos
sin registro.

El campo `estado` arranca en `'pendiente'` y está libre para que el restaurante lo use (`'confirmado'`,
`'entregado'`, `'cancelado'`) desde el dashboard.

## Cambiar el menú

Todo se lee de Supabase en runtime, con revalidación cada 60 segundos:

- **Cambiar un precio o una descripción** → edítalo en Table Editor → `menu_items`.
- **Ocultar un producto** → pon `activo = false`. Desaparece de la landing sin borrar el histórico.
- **Quitar una salsa** → `activo = false` en la tabla `salsas`.
- **Cambio grande (producto nuevo, nueva sección)** → edita `street_fries_menu.json` y vuelve a correr
  `npm run seed`.

## Detalles que conviene conocer

- **Subtotal informativo.** La landing nunca promete el precio final: no calcula domicilio. Lo dice en el
  carrito, en el resumen y en el mensaje de WhatsApp.
- **Precios recalculados en el servidor.** El pedido que llega del navegador solo trae ids y cantidades; los
  precios se releen de `menu_items` antes de guardar, así nadie puede fabricar un precio desde el navegador.
- **Adiciones.** Se piden dentro de cada plato de papas (botón *Adiciones* en la tarjeta) y suman a esa
  línea. La sección "Adiciones" de la página es la lista de precios de referencia.
- **Tostón de queso.** No tiene tarjeta propia: es la primera adición de cada plato de papas (resaltada
  levemente), junto con su variante *Tostón Entocinetado* (+$1.900 con tocineta, mutuamente excluyente con
  el tostón simple). Si al agregar un plato de papas al carrito el cliente no lo marcó, aparece un diálogo
  ofreciéndolo — puede aceptar el simple, el entocinetado, o seguir sin él.
- **Ingredientes.** Cada plato de papas lista sus ingredientes base; el cliente puede desmarcar los que no
  quiera y eso viaja como "Sin: ..." en el resumen y en el mensaje de WhatsApp.
- **Salsas.** Sin límite de cantidad por plato. Viven en un desplegable dentro de la tarjeta (igual que
  Adiciones) para no saturarla, agrupadas en Tradicionales, Del chef y Especiales.
- **Domicilio vs. recoger.** El cliente elige el tipo de entrega en `/pedido`; si es domicilio, la
  dirección es obligatoria y hay geolocalización opcional. Si es recoger, no se pide dirección y el mensaje
  de WhatsApp cambia su texto para pedir la hora de recogida en vez del tiempo de entrega.
- **Ubicación.** El botón de geolocalización es opcional; si el cliente la niega, el pedido sigue con la
  dirección escrita. Cuando sí la comparte, el mensaje incluye el link de Google Maps.
- **Fotos.** Solo 7 productos tienen foto (las de la carta oficial). Los demás se muestran solo con texto, a
  propósito: no hay placeholders grises. Como los recortes de la carta arrastran texto y marcas en los
  bordes, cada foto tiene su encuadre definido en [`lib/imagenes.ts`](lib/imagenes.ts); los archivos
  originales no se modifican.
- **Asistente de chat.** "Liberty" (Groq) responde preguntas sobre el menú y el flujo de pedido, pero no
  puede modificar el carrito — siempre remite al cliente a los botones de la página. Ver la sección de
  funcionalidades arriba para los límites de tokens que hay que respetar si se toca ese código.

## Estructura del repo

```
app/
  page.tsx                 "/" — Server Component: lee el menú (cargarMenu) y renderiza OrderExperience
  pedido/page.tsx           "/pedido" — Server Component: lee el menú y renderiza OrderForm (checkout)
  actions.ts                createOrder: única server action que escribe pedidos (ver "Guardado del pedido")
  api/asistente/route.ts    endpoint del chat, llama a Groq
  layout.tsx                monta CartProvider + ChatAsistente para toda la app
  globals.css                estilos base / utilidades Tailwind

components/
  Header.tsx                logo, navegación y filtros rápidos de sección (?seccion=)
  MenuSection.tsx            grilla de ProductCard por sección + ListaAdiciones (precios de referencia)
  ProductCard.tsx             tarjeta de producto: cantidad, ingredientes, adiciones, salsas, upsell tostón
  CartBar.tsx                 carrito flotante mientras se navega el menú
  EditorLinea.tsx             editor de una línea existente (ingredientes/salsas/adiciones), compartido
  OrderForm.tsx                checkout completo: datos de entrega + resumen editable + confirmación
  OrderExperience.tsx          orquesta menú + carrito en "/"
  ChatAsistente.tsx            widget de chat ("Liberty"), montado en el layout raíz
  Sticker.tsx                   elemento decorativo

lib/
  supabase.ts                getSupabase() (anon) y getSupabaseAdmin() (service_role, solo seed)
  menu.ts                     cargarMenu, porSeccion, construirAdiciones (inyecta el Tostón)
  cart-context.tsx             CartProvider/useCart — estado del carrito + localStorage
  pricing.ts                   totalLinea, subtotalCarrito, formatCOP, constantes del Tostón Entocinetado
  whatsapp.ts                  buildOrderMessage, buildWaLink, normalizarTelefono
  imagenes.ts                  encuadre (posición/escala) por producto con foto
  salsas.ts                    helpers de salsas recomendadas
  types.ts                     tipos compartidos (MenuItem, CartLine, OrderPayload, secciones, etc.)
  groq.ts                      cliente HTTP de Groq (chat completions)
  asistente.ts                 construcción del system prompt y contexto de menú/carrito para Liberty

scripts/
  seed-menu.ts                carga street_fries_menu.json + menu-images/ a Supabase (idempotente)

supabase/migrations/
  0001_init.sql                            esquema base + RLS + bucket de imágenes
  0002_add_unidad_telefono_alterno.sql      unidad/apto y teléfono alternativo en orders
  0003_salsas_tradicionales.sql             agrega el grupo "tradicional" a salsas
  0004_ingredientes.sql                     ingredientes por plato + ingredientes_quitados por línea
  0005_tipo_entrega.sql                     domicilio vs. recoger; dirección deja de ser obligatoria

public/images/    copia de menu-images/ (servida estáticamente)
street_fries_menu.json    fuente de verdad del contenido del menú
```

## Convenciones del código

- Comentarios de código, nombres de variables/tipos y textos de cara al usuario están en español; mantén
  el código nuevo consistente con esto.
- `lib/supabase.ts` expone dos clientes: `getSupabase()` (llave `anon`, para el Server Component que lee el
  menú y para la server action de pedidos) y `getSupabaseAdmin()` (`service_role`, solo para el script de
  seed — nunca se importa desde código que corre en el navegador o en Vercel).
- Los precios que llegan del cliente son siempre informativos; cualquier código nuevo que toque pedidos debe
  recalcular contra `menu_items` en el servidor, nunca confiar en lo que manda el navegador.

## Licencia

Proyecto privado para uso de Street Fries. Sin licencia de código abierto declarada.
