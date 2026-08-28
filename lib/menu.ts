import { getSupabase, supabaseConfigurado } from './supabase'
import { TOSTON_ENTOCINETADO_EXTRA, TOSTON_ENTOCINETADO_ID, TOSTON_ENTOCINETADO_NOMBRE } from './pricing'
import type { MenuItem, Salsa } from './types'

export type DatosMenu = { items: MenuItem[]; salsas: Salsa[]; error: string | null }

/** Lee el menú activo desde Supabase. Se usa en `/` y en `/pedido` (cada una
 *  es un Server Component distinto, así que no comparten el fetch en sí, pero
 *  sí esta misma lógica de carga y sus mensajes de error). */
export async function cargarMenu(): Promise<DatosMenu> {
  if (!supabaseConfigurado()) {
    return {
      items: [],
      salsas: [],
      error:
        'Supabase no está configurado. Copia .env.example a .env.local, completa las llaves y corre `npm run seed`.',
    }
  }

  try {
    const supabase = getSupabase()

    const [menu, salsas] = await Promise.all([
      supabase
        .from('menu_items')
        .select('*')
        .eq('activo', true)
        .order('seccion')
        .order('orden'),
      supabase.from('salsas').select('*').eq('activo', true).order('grupo').order('orden'),
    ])

    if (menu.error) throw new Error(menu.error.message)
    if (salsas.error) throw new Error(salsas.error.message)

    if ((menu.data?.length ?? 0) === 0) {
      return {
        items: [],
        salsas: [],
        error: 'La tabla `menu_items` está vacía. Corre `npm run seed` para cargar el menú y las fotos.',
      }
    }

    return { items: (menu.data ?? []) as MenuItem[], salsas: (salsas.data ?? []) as Salsa[], error: null }
  } catch (error) {
    return {
      items: [],
      salsas: [],
      error: `No pudimos leer el menú desde Supabase: ${
        error instanceof Error ? error.message : String(error)
      }`,
    }
  }
}

export function porSeccion(items: MenuItem[]): Map<string, MenuItem[]> {
  const mapa = new Map<string, MenuItem[]>()
  for (const item of items) {
    const lista = mapa.get(item.seccion) ?? []
    lista.push(item)
    mapa.set(item.seccion, lista)
  }
  return mapa
}

/** El tostón de queso no tiene tarjeta propia: se ofrece como la primera
 *  adición de cada plato de papas, junto con su variante entocinetada. Esta
 *  lista de "adiciones ampliada" se usa tanto para armar/editar un plato como
 *  para el `ListaAdiciones` de referencia. */
export function construirAdiciones(items: MenuItem[]): MenuItem[] {
  const mapa = porSeccion(items)
  const adicionesMenu = mapa.get('adiciones') ?? []
  const destacado = mapa.get('producto_destacado')?.[0]
  if (!destacado) return adicionesMenu

  const tostonEntocinetado: MenuItem = {
    ...destacado,
    id: TOSTON_ENTOCINETADO_ID,
    nombre: TOSTON_ENTOCINETADO_NOMBRE,
    precio_cop: Number(destacado.precio_cop) + TOSTON_ENTOCINETADO_EXTRA,
  }

  return [destacado, tostonEntocinetado, ...adicionesMenu]
}
