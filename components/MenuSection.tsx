'use client'

import { ProductCard } from './ProductCard'
import { TOSTON_ENTOCINETADO_ID, TOSTON_ID, formatCOP } from '@/lib/pricing'
import { SECCIONES_CON_PAPAS, type CartLine, type MenuItem, type Salsa } from '@/lib/types'

type MenuSectionProps = {
  titulo: string
  items: MenuItem[]
  salsas: Salsa[]
  adiciones: MenuItem[]
  onAgregar: (linea: Omit<CartLine, 'lineId'>) => void
}

export function MenuSection({ titulo, items, salsas, adiciones, onAgregar }: MenuSectionProps) {
  if (items.length === 0) return null

  const esPapas = SECCIONES_CON_PAPAS.includes(items[0].seccion)
  const esBebidas = items[0].seccion === 'bebidas'

  return (
    <section className="mt-14">
      <div className="mb-6 flex items-end gap-4">
        <h2 className="titulo text-3xl md:text-4xl">{titulo}</h2>
        <span className="separador mb-2 hidden flex-1 sm:block" />
        <span className="mb-1.5 text-xs text-white/35">{items.length}</span>
      </div>

      <div
        className={
          esBebidas
            ? 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5'
            : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
        }
      >
        {items.map((item) => (
          <ProductCard
            key={item.id}
            item={item}
            variante={esPapas ? 'fries' : 'simple'}
            compacta={esBebidas}
            salsas={esPapas ? salsas : []}
            adiciones={esPapas ? adiciones : []}
            onAgregar={onAgregar}
          />
        ))}
      </div>
    </section>
  )
}

/**
 * Las adiciones se piden dentro de cada plato de papas, así que aquí se listan
 * como referencia de precios y no como tarjetas con botón.
 */
export function ListaAdiciones({ adiciones }: { adiciones: MenuItem[] }) {
  if (adiciones.length === 0) return null

  return (
    <section className="mt-14">
      <div className="mb-2 flex items-end gap-4">
        <h2 className="titulo text-3xl md:text-4xl">Adiciones</h2>
        <span className="separador mb-2 hidden flex-1 sm:block" />
      </div>
      <p className="mb-6 text-sm text-white/45">
        Se agregan desde cada plato de papas, en el botón <span className="text-white/70">Adiciones</span> de la
        tarjeta.
      </p>

      <div className="tarjeta textura-papel grid gap-x-8 gap-y-0.5 p-5 sm:grid-cols-2 lg:grid-cols-3">
        {adiciones.map((adicion) => {
          const esToston = adicion.id === TOSTON_ID || adicion.id === TOSTON_ENTOCINETADO_ID
          return (
            <div key={adicion.id} className="flex items-baseline gap-2 border-b border-white/5 py-2 last:border-0">
              <span className={`text-sm ${esToston ? 'font-medium text-white/90' : 'text-white/75'}`}>
                {adicion.nombre}
              </span>
              <span className="min-w-4 flex-1 border-b border-dotted border-white/15" />
              <span className="font-display text-sm text-amber">{formatCOP(Number(adicion.precio_cop))}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
