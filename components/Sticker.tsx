import Image from 'next/image'

type StickerProps = {
  /** Grados de rotación: los stickers reales nunca quedan derechos. */
  rotacion?: number
  className?: string
  children: React.ReactNode
}

/**
 * Envoltura para elementos tipo sticker: rotación + sombra proyectada, para que
 * el elemento se lea como algo pegado encima de la página y no impreso en ella.
 */
export function Sticker({ rotacion = -6, className = '', children }: StickerProps) {
  return (
    <div
      className={`inline-block drop-shadow-[0_10px_18px_rgba(0,0,0,0.85)] ${className}`}
      style={{ transform: `rotate(${rotacion}deg)` }}
    >
      {children}
    </div>
  )
}

type LogoStickerProps = {
  size?: number
  rotacion?: number
  className?: string
  priority?: boolean
}

/** El sticker circular de la marca, listo para pegar en cualquier parte. */
export function LogoSticker({ size = 96, rotacion = -8, className = '', priority = false }: LogoStickerProps) {
  return (
    <Sticker rotacion={rotacion} className={className}>
      <span className="block rounded-full ring-1 ring-white/35">
        <Image
          src="/images/sticker-street-fries.png"
          alt="Street Fries"
          width={size}
          height={size}
          priority={priority}
          className="rounded-full"
        />
      </span>
    </Sticker>
  )
}
