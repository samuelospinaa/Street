import Link from 'next/link'
import { LogoSticker } from '@/components/Sticker'
import { OrderForm } from '@/components/OrderForm'
import { cargarMenu } from '@/lib/menu'

// Misma revalidación que el menú de "/": los precios/ingredientes que se
// muestran acá (al editar una línea) deben ser los mismos que en el menú.
export const revalidate = 60

/**
 * Página de checkout, separada del resto del landing a propósito: si el
 * cliente sigue navegando el menú de "/" no debe perder los datos de entrega
 * que ya escribió, ni al revés — el carrito vive en `CartProvider` (layout),
 * esta página solo lo lee.
 */
export default async function PedidoPage() {
  const { items, salsas, error } = await cargarMenu()

  return (
    <main className="min-h-dvh">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 pt-6">
        <Link href="/">
          <LogoSticker size={52} rotacion={-6} />
        </Link>
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-amber">Street Fries</p>
          <p className="text-xs text-white/45">Made on the Street</p>
        </div>
      </div>

      {error ? (
        <div className="tarjeta textura-papel mx-auto mt-10 max-w-5xl p-6 md:p-8">
          <h2 className="titulo text-2xl text-amber">No pudimos cargar el menú</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/70">{error}</p>
        </div>
      ) : (
        <OrderForm items={items} salsas={salsas} />
      )}
    </main>
  )
}
