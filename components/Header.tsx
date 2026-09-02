import Link from 'next/link'
import { LogoSticker } from './Sticker'
import { FILTROS_PAPAS, type Seccion } from '@/lib/types'

/**
 * `mascota-estatua.jpg` viene recortada de la carta: la estatua ocupa el ~72%
 * izquierdo y el resto es fondo negro con restos de texto. La encuadramos por
 * fondo (no object-fit) para poder excluir esa franja con precisión, y la
 * difuminamos con máscara para que no se vea el rectángulo negro.
 */
export function Mascota({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      role="presentation"
      className={`mascota-mask bg-no-repeat ${className}`}
      style={{
        backgroundImage: "url('/images/mascota-estatua.jpg')",
        backgroundSize: '133% auto',
        backgroundPosition: 'left top',
      }}
    />
  )
}

export function Header({ seccionActiva }: { seccionActiva?: Seccion }) {
  return (
    <header className="relative overflow-hidden">
      {/* Mascota: detrás del texto en móvil, al lado en desktop. */}
      <Mascota className="pointer-events-none absolute -right-10 top-0 h-[22rem] w-[13rem] opacity-40 sm:opacity-70 md:-right-4 md:h-[30rem] md:w-[18rem] lg:right-8" />

      <div className="relative mx-auto max-w-5xl px-5 pb-10 pt-8 md:pt-12">
        <div className="flex items-start gap-4">
          <LogoSticker size={84} rotacion={-8} priority className="shrink-0" />
          <div className="pt-1">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-amber">
              Made on the Street
            </p>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-white/50">
              Thinking big
            </p>
          </div>
        </div>

        <h1 className="titulo mt-7 text-[3.4rem] sm:text-7xl md:text-8xl">
          Street
          <br />
          <span className="text-amber">Fries</span>
        </h1>

        <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/70 md:max-w-md md:text-base">
          Arma tu pedido, déjanos tu dirección y envíalo por WhatsApp en un toque. Nosotros te confirmamos
          el precio final y el tiempo de entrega.
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-2.5">
          {FILTROS_PAPAS.map(({ key, etiqueta }) => {
            const activo = seccionActiva === key
            // Tocar el filtro ya activo lo quita (vuelve a ver todo el menú)
            // en vez de quedarse pegado — es la única forma de deseleccionar
            // ahora que no hay un botón aparte de "Todas las papas".
            return (
              <Link
                key={key}
                href={activo ? '/#menu' : `/?seccion=${key}#menu`}
                aria-pressed={activo}
                className={`chip flex min-w-[7.5rem] items-center justify-center text-center ${activo ? 'chip-on' : 'chip-off'}`}
              >
                {etiqueta}
              </Link>
            )
          })}
        </div>
      </div>

      <div className="separador mx-auto max-w-5xl" />
    </header>
  )
}
