'use server'

import { headers } from 'next/headers'
import { getSupabase } from '@/lib/supabase'
import {
  TOSTON_ENTOCINETADO_EXTRA,
  TOSTON_ENTOCINETADO_ID,
  TOSTON_ENTOCINETADO_NOMBRE,
  TOSTON_ID,
  subtotalCarrito,
  totalLinea,
} from '@/lib/pricing'
import { ipDesdeHeaders, limitarTasa } from '@/lib/rate-limit'
import { sedePorId } from '@/lib/sedes'
import { buildOrderMessage, buildWaLink } from '@/lib/whatsapp'
import type { AdicionSeleccionada, CartLine, CreateOrderResult, OrderPayload } from '@/lib/types'

const ERROR_GENERICO =
  'No pudimos registrar tu pedido. Revisa tu conexión e inténtalo de nuevo — si el problema sigue, escríbenos directamente por WhatsApp.'

// Frena scripts/bots insertando pedidos en bucle (spam en la base de datos y
// en el chat de WhatsApp del local). Un cliente real no manda más de un par
// de pedidos reales en 10 minutos.
const LIMITE_PEDIDOS_POR_VENTANA = 5
const VENTANA_PEDIDOS_MS = 10 * 60_000
const ERROR_LIMITE_PEDIDOS =
  'Ya registramos varios pedidos desde tu conexión hace poco. Espera unos minutos e inténtalo de nuevo, o escríbenos directo por WhatsApp.'

// Topes de tamaño para los campos de texto libre: nada de esto necesita ser
// largo, y sin tope un cliente (o un bot) podría insertar filas gigantes en
// `orders`/`order_items` o mensajes de WhatsApp absurdamente largos.
const MAX_LARGO = { nombre: 80, telefono: 20, direccion: 300, unidad: 60, notas: 500 } as const
const MAX_LINEAS_PEDIDO = 40
const MAX_ADICIONES_POR_LINEA = 20
const MAX_INGREDIENTES_QUITADOS_POR_LINEA = 20

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
  // 0. Rate limit por IP — antes de tocar la base de datos.
  const ip = ipDesdeHeaders(headers())
  const limite = limitarTasa(`pedido:${ip}`, LIMITE_PEDIDOS_POR_VENTANA, VENTANA_PEDIDOS_MS)
  if (!limite.permitido) return { ok: false, error: ERROR_LIMITE_PEDIDOS }

  const { cliente, lineas: lineasCrudas } = payload
  const lineas = lineasCrudas.slice(0, MAX_LINEAS_PEDIDO)

  // 1. Validación
  const nombre = (cliente.nombre?.trim() ?? '').slice(0, MAX_LARGO.nombre)
  const tipoEntrega = cliente.tipoEntrega === 'recoger' ? 'recoger' : 'domicilio'
  const esDomicilio = tipoEntrega === 'domicilio'
  const direccion = esDomicilio ? (cliente.direccion?.trim() ?? '').slice(0, MAX_LARGO.direccion) : ''
  const telefono = (cliente.telefono?.trim() ?? '').slice(0, MAX_LARGO.telefono)
  const telefonoAlterno = (cliente.telefonoAlterno?.trim() ?? '').slice(0, MAX_LARGO.telefono)
  const unidad = esDomicilio ? (cliente.unidad?.trim() ?? '').slice(0, MAX_LARGO.unidad) : ''
  const notas = (cliente.notas?.trim() ?? '').slice(0, MAX_LARGO.notas)
  // Coordenadas fuera de rango (o no numéricas) se descartan en vez de fallar
  // todo el pedido: la dirección escrita sigue siendo válida sin ubicación.
  const lat =
    esDomicilio && typeof cliente.lat === 'number' && Number.isFinite(cliente.lat) && Math.abs(cliente.lat) <= 90
      ? cliente.lat
      : null
  const lng =
    esDomicilio && typeof cliente.lng === 'number' && Number.isFinite(cliente.lng) && Math.abs(cliente.lng) <= 180
      ? cliente.lng
      : null

  if (lineas.length === 0) return { ok: false, error: 'Tu pedido está vacío.' }
  if (!nombre) return { ok: false, error: 'Necesitamos tu nombre para el pedido.' }
  if (esDomicilio && !direccion) return { ok: false, error: 'Necesitamos una dirección de entrega.' }

  // El cliente solo manda el id de la sede — igual que los precios, el número
  // de WhatsApp al que se manda el pedido se resuelve acá contra la lista
  // fija de sedes, nunca se confía en un número que venga del navegador.
  const sede = sedePorId(cliente.sedeId)
  if (!sede) return { ok: false, error: 'Elige la sede a la que quieres mandar el pedido.' }
  if (!sede.whatsapp) {
    return { ok: false, error: 'El WhatsApp de esa sede no está configurado todavía.' }
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
  const idsAdiciones = Array.from(
    new Set(lineas.flatMap((l) => l.adicionIds.slice(0, MAX_ADICIONES_POR_LINEA))),
  )
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
    for (const idAdicion of linea.adicionIds.slice(0, MAX_ADICIONES_POR_LINEA)) {
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
    const ingredientesQuitados = linea.ingredientesQuitados
      .slice(0, MAX_INGREDIENTES_QUITADOS_POR_LINEA)
      .filter((i) => ingredientesBase.includes(i))

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
    sede_id: sede.id,
    sede_nombre: sede.nombre,
    cliente_nombre: nombre,
    cliente_telefono: telefono || null,
    cliente_telefono_alterno: telefonoAlterno || null,
    tipo_entrega: tipoEntrega,
    direccion: esDomicilio ? direccion : null,
    unidad: unidad || null,
    ubicacion_lat: lat,
    ubicacion_lng: lng,
    notas: notas || null,
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
    cliente: { ...cliente, nombre, direccion, telefono, telefonoAlterno, unidad, notas, lat, lng },
    subtotal,
    orderId,
    sedeNombre: sede.nombre,
  })

  return {
    ok: true,
    orderId,
    subtotal,
    waUrl: buildWaLink(sede.whatsapp, mensaje),
  }
}
