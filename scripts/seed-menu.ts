/**
 * Seed del menú de Street Fries.
 *
 *   npm run seed
 *
 * Lee `street_fries_menu.json` (fuente de verdad), sube las 7 fotos reales de
 * `menu-images/` al bucket público `menu-images` de Supabase Storage y puebla
 * las tablas `menu_items` y `salsas`.
 *
 * Es idempotente: usa upsert por id, así que se puede correr las veces que sea.
 * Requiere SUPABASE_SERVICE_ROLE_KEY (solo local, nunca en Vercel).
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { config as loadEnv } from 'dotenv'
import { getSupabaseAdmin } from '../lib/supabase'
import type { Seccion } from '../lib/types'

loadEnv({ path: '.env.local' })
loadEnv({ path: '.env' })

const RAIZ = process.cwd()
const BUCKET = 'menu-images'

/** Solo estos 7 productos tienen foto real recortada de la carta.
 *  El resto del menú se muestra sin imagen, a propósito. */
const IMAGENES: Record<string, string> = {
  'toston-de-queso': 'toston-de-queso.jpg',
  'fries-via-nassa': 'fries-via-nassa.jpg',
  'fries-oxford-street': 'fries-oxford-street.jpg',
  'fries-broadway': 'fries-broadway.jpg',
  'fries-las-vegas-strip': 'fries-las-vegas-strip.jpg',
  'fries-caminito': 'fries-caminito.jpg',
  'fries-ocean-drive': 'fries-ocean-drive.jpg',
}

type FilaMenu = {
  id: string
  seccion: Seccion
  nombre: string
  subtitulo: string | null
  descripcion: string | null
  precio_cop: number
  imagen_url: string | null
  activo: boolean
  orden: number
  salsas_recomendadas: string[] | null
  ingredientes: string[] | null
}

type FilaSalsa = {
  id: string
  nombre: string
  grupo: 'tradicional' | 'chef' | 'disponible'
  activo: boolean
  orden: number
}

type ProductoJSON = {
  id: string
  nombre: string
  subtitulo?: string
  descripcion?: string
  cantidad?: string
  categoria?: string
  nota?: string
  precio_cop: number
  salsas_recomendadas?: string[]
  ingredientes?: string[]
}

type MenuJSON = {
  restaurante: { nombre: string }
  salsas: {
    salsas_tradicionales: { id: string; nombre: string }[]
    salsas_del_chef: { id: string; nombre: string }[]
    salsas_disponibles: { id: string; nombre: string }[]
  }
  producto_destacado: {
    id: string
    nombre: string
    marca: string
    descripcion: string
    opciones: { id: string; nombre: string; precio_cop?: number; precio_total_cop?: number }[]
  }
  categorias: Record<string, ProductoJSON[]>
}

const supabase = getSupabaseAdmin()

async function asegurarBucket(): Promise<void> {
  const { data: buckets, error } = await supabase.storage.listBuckets()
  if (error) throw new Error(`No se pudieron listar los buckets: ${error.message}`)

  if (buckets?.some((b) => b.name === BUCKET)) {
    console.log(`  bucket "${BUCKET}" ya existe`)
    return
  }

  const { error: errorCrear } = await supabase.storage.createBucket(BUCKET, { public: true })
  if (errorCrear) throw new Error(`No se pudo crear el bucket "${BUCKET}": ${errorCrear.message}`)
  console.log(`  bucket "${BUCKET}" creado (público)`)
}

/** Sube las 7 fotos y devuelve { idProducto: urlPublica }. */
async function subirImagenes(): Promise<Record<string, string>> {
  const urls: Record<string, string> = {}

  for (const [idProducto, archivo] of Object.entries(IMAGENES)) {
    const ruta = resolve(RAIZ, 'menu-images', archivo)
    const contenido = readFileSync(ruta)

    const { error } = await supabase.storage.from(BUCKET).upload(archivo, contenido, {
      contentType: 'image/jpeg',
      upsert: true,
      cacheControl: '31536000',
    })
    if (error) throw new Error(`Falló la subida de ${archivo}: ${error.message}`)

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(archivo)
    urls[idProducto] = data.publicUrl
    console.log(`  ↑ ${archivo}`)
  }

  return urls
}

function construirFilas(menu: MenuJSON, urls: Record<string, string>): FilaMenu[] {
  const filas: FilaMenu[] = []

  // Producto destacado: el precio base es la adición simple; el "entocinetado"
  // (+$1.900) es una opción de la tarjeta, no un producto aparte.
  const destacado = menu.producto_destacado
  const simple = destacado.opciones.find((o) => o.id === 'toston-simple')
  if (!simple?.precio_cop) throw new Error('El JSON no trae precio para la opción toston-simple')

  filas.push({
    id: destacado.id,
    seccion: 'producto_destacado',
    nombre: destacado.nombre,
    subtitulo: destacado.marca ?? null,
    descripcion: destacado.descripcion ?? null,
    precio_cop: simple.precio_cop,
    imagen_url: urls[destacado.id] ?? null,
    activo: true,
    orden: 0,
    salsas_recomendadas: null,
    ingredientes: null,
  })

  const secciones: Seccion[] = [
    'entrada',
    'signature_dishes',
    'fries_especiales',
    'fries_tradicionales',
    'adiciones',
    'bebidas',
  ]

  for (const seccion of secciones) {
    const productos = menu.categorias[seccion]
    if (!productos) throw new Error(`El JSON no trae la categoría "${seccion}"`)

    productos.forEach((producto, indice) => {
      // El JSON usa campos distintos según la categoría; se mapean sin
      // reescribir ningún texto: `cantidad` (entrada) y `categoria` (bebidas)
      // caben en subtitulo, y `nota` (bebidas) en descripcion.
      const subtitulo = producto.subtitulo ?? producto.cantidad ?? producto.categoria ?? null
      const descripcion = producto.descripcion ?? producto.nota ?? null

      filas.push({
        id: producto.id,
        seccion,
        nombre: producto.nombre,
        subtitulo,
        descripcion,
        precio_cop: producto.precio_cop,
        imagen_url: urls[producto.id] ?? null,
        activo: true,
        orden: indice,
        salsas_recomendadas: producto.salsas_recomendadas ?? null,
        ingredientes: producto.ingredientes ?? null,
      })
    })
  }

  return filas
}

function construirSalsas(menu: MenuJSON): FilaSalsa[] {
  const tradicionales = menu.salsas.salsas_tradicionales.map((s, i) => ({
    id: s.id,
    nombre: s.nombre,
    grupo: 'tradicional' as const,
    activo: true,
    orden: i,
  }))

  const chef = menu.salsas.salsas_del_chef.map((s, i) => ({
    id: s.id,
    nombre: s.nombre,
    grupo: 'chef' as const,
    activo: true,
    orden: i,
  }))

  const disponibles = menu.salsas.salsas_disponibles.map((s, i) => ({
    id: s.id,
    nombre: s.nombre,
    grupo: 'disponible' as const,
    activo: true,
    orden: i,
  }))

  return [...tradicionales, ...chef, ...disponibles]
}

async function main(): Promise<void> {
  const menu: MenuJSON = JSON.parse(readFileSync(resolve(RAIZ, 'street_fries_menu.json'), 'utf8'))
  console.log(`\nSeed de ${menu.restaurante.nombre}\n`)

  console.log('1. Storage')
  await asegurarBucket()
  const urls = await subirImagenes()

  console.log('\n2. menu_items')
  const filas = construirFilas(menu, urls)
  const { error: errorMenu } = await supabase.from('menu_items').upsert(filas, { onConflict: 'id' })
  if (errorMenu) throw new Error(`Falló el upsert de menu_items: ${errorMenu.message}`)

  const porSeccion = filas.reduce<Record<string, number>>((acc, f) => {
    acc[f.seccion] = (acc[f.seccion] ?? 0) + 1
    return acc
  }, {})
  for (const [seccion, total] of Object.entries(porSeccion)) {
    console.log(`  ${seccion}: ${total}`)
  }
  console.log(`  total: ${filas.length} productos (${Object.keys(urls).length} con foto)`)

  console.log('\n3. salsas')
  const salsas = construirSalsas(menu)
  const { error: errorSalsas } = await supabase.from('salsas').upsert(salsas, { onConflict: 'id' })
  if (errorSalsas) throw new Error(`Falló el upsert de salsas: ${errorSalsas.message}`)
  console.log(`  total: ${salsas.length} salsas`)

  console.log('\nListo.\n')
}

main().catch((error: unknown) => {
  console.error(`\nError en el seed: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
})
