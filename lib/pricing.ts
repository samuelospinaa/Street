import type { CartLine } from './types'

/** El Tostón de Queso es una fila normal de `menu_items` (sección
 *  `producto_destacado`), pero se ofrece como adición dentro de cada plato de
 *  papas en vez de como tarjeta propia. Su variante "entocinetado" no es una
 *  fila aparte: es el mismo tostón + este cargo extra por la tocineta. */
export const TOSTON_ID = 'toston-de-queso'
export const TOSTON_ENTOCINETADO_ID = 'toston-entocinetado'
export const TOSTON_ENTOCINETADO_NOMBRE = 'Tostón Entocinetado (con tocineta)'
export const TOSTON_ENTOCINETADO_EXTRA = 1900

/** Precio de una línea: (base + adiciones) × cantidad. */
export function totalLinea(linea: Pick<CartLine, 'precioBase' | 'cantidad' | 'adiciones'>): number {
  const adiciones = linea.adiciones.reduce((sum, a) => sum + a.precio, 0)
  return (linea.precioBase + adiciones) * linea.cantidad
}

export function subtotalCarrito(lineas: CartLine[]): number {
  return lineas.reduce((sum, l) => sum + totalLinea(l), 0)
}

export function contarItems(lineas: CartLine[]): number {
  return lineas.reduce((sum, l) => sum + l.cantidad, 0)
}

const formatoCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

/** $34.900 — sin el espacio que mete Intl entre el signo y el número. */
export function formatCOP(valor: number): string {
  return formatoCOP.format(valor).replace(/\s/g, '')
}
