'use client'

import { useMemo } from 'react'
import { CartBar } from './CartBar'
import { ListaAdiciones, MenuSection } from './MenuSection'
import { construirAdiciones, porSeccion } from '@/lib/menu'
import { useCart } from '@/lib/cart-context'
import { SECCIONES_CON_PAPAS, SECCIONES_MENU, type MenuItem, type Salsa, type Seccion } from '@/lib/types'

type OrderExperienceProps = {
  items: MenuItem[]
  salsas: Salsa[]
  /** Filtro de "Tradicionales / Especiales / Del Chef" que viene de los
   *  botones del header (vía `?seccion=`). Sin filtro, se ven todas. */
  seccionActiva?: Seccion
}

/** Navegación y armado del pedido: aquí el cliente arma su carrito desde el
 *  menú. Los datos de entrega y la edición fina del pedido ya no viven acá —
 *  eso pasó a `/pedido`, para que no se pierdan si el cliente sigue
 *  navegando el menú (el carrito en sí vive en `CartProvider`, en el layout). */
export function OrderExperience({ items, salsas, seccionActiva }: OrderExperienceProps) {
  const { lineas, agregar, cambiarCantidad, eliminar, editarLinea } = useCart()

  const mapaSeccion = useMemo(() => porSeccion(items), [items])
  const adiciones = useMemo(() => construirAdiciones(items), [items])

  return (
    <>
      <div id="menu" className="scroll-mt-4">
        {SECCIONES_MENU.filter(
          ({ key }) => !seccionActiva || key === seccionActiva || !SECCIONES_CON_PAPAS.includes(key),
        ).map(({ key, titulo }) => (
          <MenuSection
            key={key}
            titulo={titulo}
            items={mapaSeccion.get(key) ?? []}
            salsas={salsas}
            adiciones={adiciones}
            onAgregar={agregar}
          />
        ))}

        <ListaAdiciones adiciones={adiciones} />
      </div>

      <CartBar
        lineas={lineas}
        items={items}
        salsas={salsas}
        adiciones={adiciones}
        onCantidad={cambiarCantidad}
        onEliminar={eliminar}
        onEditar={editarLinea}
      />
    </>
  )
}
