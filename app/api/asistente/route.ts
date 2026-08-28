import { NextResponse } from 'next/server'
import { construirContextoCarrito, construirContextoMenu, PROMPT_SISTEMA_BASE, type ResumenLineaCarrito } from '@/lib/asistente'
import { ErrorLimiteGroq, pedirRespuestaGroq, type MensajeChat } from '@/lib/groq'
import { cargarMenu } from '@/lib/menu'

// El asistente no necesita cachear/revalidar: cada request es una pregunta puntual.
export const dynamic = 'force-dynamic'

// Groq limita esta cuenta a 8000 tokens/minuto compartidos entre todos los
// modelos, y el menú completo va en el system prompt de cada mensaje: el
// historial se mantiene corto para no comerse ese presupuesto en 2-3 turnos.
const MAX_MENSAJES_HISTORIAL = 6
const MAX_LARGO_MENSAJE = 500

function limpiarHistorial(valor: unknown): MensajeChat[] {
  if (!Array.isArray(valor)) return []

  const historial: MensajeChat[] = []
  for (const item of valor.slice(-MAX_MENSAJES_HISTORIAL)) {
    if (!item || typeof item !== 'object') continue
    const rol = (item as { role?: unknown }).role
    const contenido = (item as { content?: unknown }).content
    if ((rol !== 'user' && rol !== 'assistant') || typeof contenido !== 'string') continue
    const recortado = contenido.trim().slice(0, MAX_LARGO_MENSAJE)
    if (!recortado) continue
    historial.push({ role: rol, content: recortado })
  }
  return historial
}

function limpiarCarrito(valor: unknown): ResumenLineaCarrito[] {
  if (!Array.isArray(valor)) return []

  return valor
    .filter((l): l is Record<string, unknown> => Boolean(l) && typeof l === 'object')
    .map((l) => ({
      nombre: typeof l.nombre === 'string' ? l.nombre.slice(0, 120) : 'Producto',
      cantidad: typeof l.cantidad === 'number' && Number.isFinite(l.cantidad) ? Math.max(1, Math.trunc(l.cantidad)) : 1,
      salsas: Array.isArray(l.salsas) ? l.salsas.filter((s): s is string => typeof s === 'string').slice(0, 5) : [],
      adiciones: Array.isArray(l.adiciones)
        ? l.adiciones
            .filter((a): a is Record<string, unknown> => Boolean(a) && typeof a === 'object')
            .map((a) => ({ nombre: typeof a.nombre === 'string' ? a.nombre : '' }))
            .filter((a) => a.nombre)
            .slice(0, 10)
        : [],
      ingredientesQuitados: Array.isArray(l.ingredientesQuitados)
        ? l.ingredientesQuitados.filter((i): i is string => typeof i === 'string').slice(0, 10)
        : [],
    }))
    .slice(0, 30)
}

export async function POST(request: Request) {
  let cuerpo: unknown
  try {
    cuerpo = await request.json()
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }

  const historial = limpiarHistorial((cuerpo as { mensajes?: unknown })?.mensajes)
  const carrito = limpiarCarrito((cuerpo as { carrito?: unknown })?.carrito)

  if (historial.length === 0 || historial[historial.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'Escribe un mensaje para poder responderte.' }, { status: 400 })
  }

  const { items, salsas, error: errorMenu } = await cargarMenu()
  if (errorMenu) {
    return NextResponse.json(
      { error: 'El menú no está disponible en este momento — intenta de nuevo en un momento.' },
      { status: 503 },
    )
  }

  const mensajesGroq: MensajeChat[] = [
    {
      role: 'system',
      content: `${PROMPT_SISTEMA_BASE}\n\n${construirContextoMenu(items, salsas)}\n\n${construirContextoCarrito(carrito)}`,
    },
    ...historial,
  ]

  try {
    const respuesta = await pedirRespuestaGroq(mensajesGroq)
    return NextResponse.json({ respuesta })
  } catch (error) {
    console.error('[asistente] Groq falló:', error)

    if (error instanceof ErrorLimiteGroq) {
      return NextResponse.json(
        { error: 'Estamos con mucho movimiento en el chat — espera unos segundos y vuelve a preguntar.' },
        { status: 429 },
      )
    }

    return NextResponse.json(
      { error: 'No pudimos responder en este momento. Intenta de nuevo o escríbenos directamente por WhatsApp.' },
      { status: 502 },
    )
  }
}
