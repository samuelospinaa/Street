import { formatCOP } from './pricing'
import type { CartLine, DatosCliente } from './types'

export type MensajePedido = {
  lineas: CartLine[]
  cliente: DatosCliente
  subtotal: number
  orderId: string
}

function linkMaps(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`
}

/**
 * Arma el mensaje que el cliente enviará por WhatsApp. El cajero debe poder
 * leerlo de arriba a abajo y solo confirmar precio final y tiempo de entrega.
 */
export function buildOrderMessage({ lineas, cliente, subtotal, orderId }: MensajePedido): string {
  const esDomicilio = cliente.tipoEntrega !== 'recoger'
  const bloques: string[] = []

  bloques.push('*NUEVO PEDIDO — STREET FRIES*')
  bloques.push(`Pedido #${orderId.slice(0, 8).toUpperCase()}`)
  bloques.push('')
  bloques.push('*PEDIDO*')

  for (const linea of lineas) {
    const adiciones = linea.adiciones.reduce((sum, a) => sum + a.precio, 0)
    const total = (linea.precioBase + adiciones) * linea.cantidad
    bloques.push(`${linea.cantidad}x ${linea.nombre} — ${formatCOP(total)}`)

    if (linea.ingredientesQuitados.length > 0) {
      bloques.push(`   Sin: ${linea.ingredientesQuitados.join(', ')}`)
    }
    if (linea.salsas.length > 0) {
      bloques.push(`   Salsas: ${linea.salsas.join(', ')}`)
    }
    if (linea.adiciones.length > 0) {
      bloques.push(`   Adiciones: ${linea.adiciones.map((a) => a.nombre).join(', ')}`)
    }
  }

  bloques.push('')
  bloques.push(`*Subtotal: ${formatCOP(subtotal)}*${esDomicilio ? ' (sin domicilio)' : ''}`)
  bloques.push('')
  bloques.push(esDomicilio ? '*ENTREGA A DOMICILIO*' : '*RECOGER EN EL LOCAL*')
  bloques.push(`Nombre: ${cliente.nombre}`)

  if (cliente.telefono.trim()) {
    bloques.push(`Teléfono: ${cliente.telefono.trim()}`)
  }
  if (cliente.telefonoAlterno.trim()) {
    bloques.push(`Teléfono alternativo: ${cliente.telefonoAlterno.trim()}`)
  }

  if (esDomicilio) {
    bloques.push(`Dirección: ${cliente.direccion}`)

    if (cliente.unidad.trim()) {
      bloques.push(`Unidad/apto: ${cliente.unidad.trim()}`)
    }

    if (cliente.lat !== null && cliente.lng !== null) {
      bloques.push(`Ubicación: ${linkMaps(cliente.lat, cliente.lng)}`)
    }
  }

  if (cliente.notas.trim()) {
    bloques.push(`Notas: ${cliente.notas.trim()}`)
  }

  bloques.push('')
  bloques.push(
    esDomicilio
      ? 'Por favor confírmenme el *precio final* (con domicilio) y el *tiempo de entrega*. ¡Gracias!'
      : 'Por favor confírmenme el *precio final* y la *hora* para pasar a recogerlo. ¡Gracias!',
  )

  return bloques.join('\n')
}

/** Normaliza el número: solo dígitos, como lo exige wa.me (indicativo país, sin + ni espacios). */
export function normalizarTelefono(numero: string): string {
  return numero.replace(/\D/g, '')
}

export function buildWaLink(numeroRestaurante: string, mensaje: string): string {
  const numero = normalizarTelefono(numeroRestaurante)
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
}
