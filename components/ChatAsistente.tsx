'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { Sticker } from './Sticker'
import { useCart } from '@/lib/cart-context'
import { ENCUADRE_ASISTENTE } from '@/lib/imagenes'

type MensajeUI = { role: 'user' | 'assistant'; content: string }

const SALUDO_INICIAL: MensajeUI = {
  role: 'assistant',
  content:
    '¡Hola! Soy Liberty 🗽🍟 Pregúntame lo que sea del menú — ingredientes, salsas, si algo es picante o vegetariano — o cuéntame qué se te antoja y te ayudo a elegir.',
}

/**
 * Asistente flotante (Groq + el menú en vivo). Vive en el layout raíz para
 * seguir disponible tanto en "/" como en "/pedido" sin perder la conversación
 * al navegar entre las dos. Se ubica a la izquierda a propósito: la barra del
 * carrito ya ocupa el centro/derecha de la parte de abajo.
 */
export function ChatAsistente() {
  const { lineas } = useCart()
  const [abierto, setAbierto] = useState(false)
  const [mensajes, setMensajes] = useState<MensajeUI[]>([SALUDO_INICIAL])
  const [entrada, setEntrada] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const finRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    finRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [mensajes, enviando, abierto])

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    const texto = entrada.trim()
    if (!texto || enviando) return

    const historial = [...mensajes, { role: 'user' as const, content: texto }]
    setMensajes(historial)
    setEntrada('')
    setError(null)
    setEnviando(true)

    try {
      const respuesta = await fetch('/api/asistente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensajes: historial, carrito: lineas }),
      })
      const data: { respuesta?: string; error?: string } = await respuesta.json()

      if (!respuesta.ok || !data.respuesta) {
        throw new Error(data.error ?? 'No pudimos responder en este momento.')
      }

      setMensajes((actuales) => [...actuales, { role: 'assistant', content: data.respuesta! }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos responder en este momento.')
    } finally {
      setEnviando(false)
    }
  }

  const posicion = lineas.length > 0 ? 'bottom-20 sm:bottom-24' : 'bottom-4 sm:bottom-5'

  if (!abierto) {
    return (
      <div className={`fixed left-3 z-30 transition-all sm:left-4 ${posicion}`}>
        <button
          type="button"
          onClick={() => setAbierto(true)}
          aria-label="Abrir el asistente de Street Fries"
          className="group relative block transition active:scale-95"
        >
          <Sticker rotacion={-6}>
            {/* Más chico en móvil (44px, tamaño táctil mínimo recomendado) para
                que estorbe menos; en desktop conserva el ancho original (64px).
                El alto sigue la proporción real de la foto (907×2550) para
                mostrar a Liberty completa, sin recortarla ni dejar espacio
                vacío alrededor. */}
            <span
              className="block w-11 overflow-hidden rounded-2xl ring-2 ring-amber/70 shadow-sticker transition group-hover:ring-amber sm:w-16 sm:rounded-[1.75rem]"
              style={{ aspectRatio: '907 / 2550' }}
            >
              <span className="relative block h-full w-full">
                <Image
                  src="/images/mascota-estatua.jpg"
                  alt="Liberty, la asistente de Street Fries"
                  fill
                  sizes="192px"
                  quality={90}
                  className="object-cover"
                />
              </span>
            </span>
          </Sticker>

          <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3 sm:h-4 sm:w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-amber ring-2 ring-carbon sm:h-4 sm:w-4" />
          </span>
        </button>
      </div>
    )
  }

  return (
    <div className={`fixed left-4 right-4 z-30 sm:right-auto ${posicion}`}>
      <div className="tarjeta textura-papel flex h-[28rem] max-h-[70vh] w-full flex-col overflow-hidden border border-amber/20 sm:w-[22rem]">
        <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-3">
          <span className="relative block h-9 w-9 shrink-0 overflow-hidden rounded-full ring-1 ring-amber/50">
            <Image
              src="/images/mascota-estatua.jpg"
              alt=""
              fill
              sizes="72px"
              quality={90}
              className="object-cover"
              style={{
                objectPosition: ENCUADRE_ASISTENTE.posicion,
                transform: `scale(${ENCUADRE_ASISTENTE.escala})`,
                transformOrigin: ENCUADRE_ASISTENTE.posicion,
              }}
            />
          </span>
          <div className="min-w-0 flex-1">
            <p className="titulo text-lg leading-none">Liberty</p>
            <p className="mt-0.5 text-[0.65rem] text-white/40">Asistente Street Fries</p>
          </div>
          <button
            type="button"
            onClick={() => setAbierto(false)}
            aria-label="Cerrar el asistente"
            className="shrink-0 rounded-lg p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {mensajes.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <p
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                  m.role === 'user' ? 'bg-amber text-carbon' : 'bg-white/8 text-white/85'
                }`}
              >
                {m.content}
              </p>
            </div>
          ))}

          {enviando && (
            <div className="flex justify-start">
              <p className="rounded-2xl bg-white/8 px-3.5 py-2 text-sm text-white/50">Escribiendo…</p>
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {error}
            </p>
          )}

          <div ref={finRef} />
        </div>

        <form onSubmit={enviar} className="flex shrink-0 gap-2 border-t border-white/10 p-3">
          <input
            value={entrada}
            onChange={(e) => setEntrada(e.target.value)}
            placeholder="Escribe tu pregunta…"
            maxLength={500}
            disabled={enviando}
            className="min-w-0 flex-1"
          />
          <button type="submit" disabled={enviando || !entrada.trim()} className="btn-amber px-4 py-2 text-sm">
            Enviar
          </button>
        </form>
      </div>
    </div>
  )
}
