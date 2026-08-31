'use server'

import { getSupabase } from '@/lib/supabase'
import {
  TOSTON_ENTOCINETADO_EXTRA,
  TOSTON_ENTOCINETADO_ID,
  TOSTON_ENTOCINETADO_NOMBRE,
  TOSTON_ID,
  subtotalCarrito,
  totalLinea,
} from '@/lib/pricing'
import { buildOrderMessage, buildWaLink } from '@/lib/whatsapp'
import type { AdicionSeleccionada, CartLine, CreateOrderResult, OrderPayload } from '@/lib/types'

const ERROR_GENERICO =
  'No pudimos registrar tu pedido. Revisa tu conexión e inténtalo de nuevo — si el problema sigue, escríbenos directamente por WhatsApp.'

export async function createOrder(payload: OrderPayload): Promise<CreateOrderResult> {
  // Cualquier fallo inesperado (red del cliente, timeout de Supabase, etc.) se
  // atrapa acá: sin este try/catch, una excepción no controlada en una server
  // action tumba toda la página en vez de mostrar el mensaje de error normal.
  try {
    return await crearPedido(payload)
  } catch (error) {
    console.error('[createOrder] excepción no controlada:', error)
    return { ok: false, error: ERROR_GENERICO }
  }
}

async function crearPedido(payload: OrderPayload): Promise<CreateOrderResult> {
  const { cliente, lineas } = payload

  // 1. Validación
  const nombre = cliente.nombre?.trim() ?? ''
  const tipoEntrega = cliente.tipoEntrega === 'recoger' ? 'recoger' : 'domicilio'
  const esDomicilio = tipoEntrega === 'domicilio'
  const direccion = esDomicilio ? (cliente.direccion?.trim() ?? '') : ''

  if (lineas.length === 0) return { ok: false, error: 'Tu pedido está vacío.' }
  if (!nombre) return { ok: false, error: 'Necesitamos tu nombre para el pedido.' }
  if (esDomicilio && !direccion) return { ok: false, error: 'Necesitamos una dirección de entrega.' }

  const numeroRestaurante = process.env.NEXT_PUBLIC_RESTAURANT_WHATSAPP
  if (!numeroRestaurante) {
    return { ok: false, error: 'El número de WhatsApp del restaurante no está configurado.' }
  }

  let supabase
  try {
    supabase = getSupabase()
  } catch {
    return { ok: false, error: ERROR_GENERICO }
  }

  // 2. Los precios se recalculan contra la base: nunca se confía en los que
  //    manda el navegador (la anon key es pública).
  const idsProductos = Array.from(new Set(lineas.map((l) => l.menuItemId)))
  const idsAdiciones = Array.from(new Set(lineas.flatMap((l) => l.adicionIds)))
  const idsConsulta = Array.from(
    new Set([...idsProductos, ...idsAdiciones.filter((id) => id !== TOSTON_ENTOCINETADO_ID)]),
  )

  const { data: productos, error: errorMenu } = await supabase
    .from('menu_items')
    .select('id, nombre, precio_cop, seccion, activo, ingredientes')
    .in('id', idsConsulta)

  if (errorMenu || !productos) {
    console.error('[createOrder] lectura de menu_items falló:', errorMenu)
    return { ok: false, error: ERROR_GENERICO }
  }

  const porId = new Map(productos.map((p) => [p.id, p]))

  const lineasResueltas: CartLine[] = []

  for (const [indice, linea] of lineas.entries()) {
    const producto = porId.get(linea.menuItemId)
    if (!producto || producto.activo === false) {
      return {
        ok: false,
        error: 'Uno de los productos de tu pedido ya no está disponible. Actualiza la página e inténtalo de nuevo.',
      }
    }

    const cantidad = Math.min(Math.max(Math.trunc(linea.cantidad), 1), 50)

    const adiciones: AdicionSeleccionada[] = []
    for (const idAdicion of linea.adicionIds) {
      // El "entocinetado" no es una fila de menu_items: es el tostón de queso
      // + este cargo extra, ofrecido como adición dentro de cualquier plato
      // de papas (ya no solo dentro de la tarjeta del tostón, que se quitó).
      if (idAdicion === TOSTON_ENTOCINETADO_ID) {
        const toston = porId.get(TOSTON_ID)
        if (!toston || toston.activo === false) continue
        adiciones.push({
          id: TOSTON_ENTOCINETADO_ID,
          nombre: TOSTON_ENTOCINETADO_NOMBRE,
          precio: Number(toston.precio_cop) + TOSTON_ENTOCINETADO_EXTRA,
        })
        continue
      }

      const adicion = porId.get(idAdicion)
      if (!adicion || adicion.activo === false) continue
      // El tostón de queso vive en `producto_destacado`, no en `adiciones`,
      // pero se puede pedir como adición de cualquier plato de papas.
      if (adicion.seccion !== 'adiciones' && adicion.id !== TOSTON_ID) continue
      adiciones.push({ id: adicion.id, nombre: adicion.nombre, precio: Number(adicion.precio_cop) })
    }

    // Solo se aceptan como "quitados" ingredientes que de verdad son base del
    // plato: lo que mande el navegador se valida contra `menu_items.ingredientes`.
    const ingredientesBase: string[] = producto.ingredientes ?? []
    const ingredientesQuitados = linea.ingredientesQuitados.filter((i) => ingredientesBase.includes(i))

    lineasResueltas.push({
      lineId: `${linea.menuItemId}-${indice}`,
      menuItemId: producto.id,
      nombre: producto.nombre,
      precioBase: Number(producto.precio_cop),
      cantidad,
      salsas: linea.salsas.slice(0, 2),
      adiciones,
      ingredientesQuitados,
    })
  }

  if (lineasResueltas.length === 0) return { ok: false, error: 'Tu pedido está vacío.' }

  const subtotal = subtotalCarrito(lineasResueltas)

  // 3. Persistencia: primero el pedido, luego sus ítems.
  // El id se genera acá (no con `.select().single()`) porque RLS no tiene
  // policy de SELECT sobre `orders` — pedir el row de vuelta con RETURNING
  // hace que Postgres exija esa policy y revierte el insert entero.
  const orderId = crypto.randomUUID()

  const { error: errorOrden } = await supabase.from('orders').insert({
    id: orderId,
    cliente_nombre: nombre,
    cliente_telefono: cliente.telefono?.trim() || null,
    cliente_telefono_alterno: cliente.telefonoAlterno?.trim() || null,
    tipo_entrega: tipoEntrega,
    direccion: esDomicilio ? direccion : null,
    unidad: esDomicilio ? cliente.unidad?.trim() || null : null,
    ubicacion_lat: esDomicilio ? cliente.lat : null,
    ubicacion_lng: esDomicilio ? cliente.lng : null,
    notas: cliente.notas?.trim() || null,
    subtotal,
  })

  if (errorOrden) {
    console.error('[createOrder] insert en orders falló:', errorOrden)
    return { ok: false, error: ERROR_GENERICO }
  }

  const items = lineasResueltas.map((linea) => ({
    order_id: orderId,
    menu_item_id: linea.menuItemId,
    nombre_snapshot: linea.nombre,
    // Precio unitario ya con adiciones incluidas; el total de la línea es este × cantidad.
    precio_snapshot: totalLinea({ ...linea, cantidad: 1 }),
    cantidad: linea.cantidad,
    salsas: linea.salsas,
    adiciones: linea.adiciones.map((a) => a.nombre),
    ingredientes_quitados: linea.ingredientesQuitados,
  }))

  const { error: errorItems } = await supabase.from('order_items').insert(items)

  if (errorItems) {
    console.error('[createOrder] insert en order_items falló:', errorItems)
    // No dejamos un pedido a medias en la base; si el borrado tampoco pasa (RLS),
    // el pedido queda marcado por subtotal sin ítems y se revisa en el dashboard.
    await supabase.from('orders').delete().eq('id', orderId)
    return { ok: false, error: ERROR_GENERICO }
  }

  // 4. Solo con el pedido ya registrado se genera el link de WhatsApp.
  const mensaje = buildOrderMessage({
    lineas: lineasResueltas,
    cliente: { ...cliente, nombre, direccion },
    subtotal,
    orderId,
  })

  return {
    ok: true,
    orderId,
    subtotal,
    waUrl: buildWaLink(numeroRestaurante, mensaje),
  }
}
