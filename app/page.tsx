import { Header, Mascota } from '@/components/Header'
import { OrderExperience } from '@/components/OrderExperience'
import { cargarMenu } from '@/lib/menu'
import { FILTROS_PAPAS } from '@/lib/types'
import menuJson from '@/street_fries_menu.json'

// El menú se lee de Supabase; se revalida cada minuto para que un cambio de
// precio o un producto desactivado se refleje sin volver a desplegar.
export const revalidate = 60

const { restaurante } = menuJson

function AvisoConfiguracion({ mensaje }: { mensaje: string }) {
  return (
    <div className="tarjeta textura-papel mt-10 p-6 md:p-8">
      <h2 className="titulo text-2xl text-amber">Falta un paso de configuración</h2>
      <p className="mt-3 text-sm leading-relaxed text-white/70">{mensaje}</p>
      <ol className="mt-5 space-y-2 text-sm text-white/60">
        <li>1. Crea el proyecto en Supabase y corre `supabase/migrations/0001_init.sql`.</li>
        <li>2. Copia `.env.example` a `.env.local` y pega las llaves.</li>
        <li>3. Corre `npm run seed` para cargar el menú y subir las fotos.</li>
      </ol>
      <p className="mt-5 text-xs text-white/40">Los detalles están en el README.</p>
    </div>
  )
}

function SobreNosotros() {
  return (
    <section className="mt-16">
      <div className="tarjeta textura-papel textura-papel-fuerte relative overflow-hidden p-6 md:p-10">
        <Mascota className="pointer-events-none absolute -right-6 -top-6 hidden h-[26rem] w-[15rem] opacity-45 md:block" />

        <div className="relative max-w-xl">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-amber">
            {restaurante.eslogan}
          </p>
          <h2 className="titulo mt-3 text-3xl md:text-4xl">Sobre nosotros</h2>
          <p className="mt-4 text-sm leading-relaxed text-white/70">{restaurante.historia}</p>
          <p className="mt-5 text-sm text-white/45">
            {restaurante.redes_sociales.instagram} · Instagram · TikTok · Facebook
          </p>
        </div>
      </div>
    </section>
  )
}

type PageProps = { searchParams: { seccion?: string } }

export default async function Page({ searchParams }: PageProps) {
  const { items, salsas, error } = await cargarMenu()

  // El filtro de papas viaja en la URL (?seccion=fries_tradicionales) para que
  // los botones del header y la lista de abajo se mantengan sincronizados sin
  // duplicar estado en el cliente.
  const seccionActiva = FILTROS_PAPAS.find((f) => f.key === searchParams.seccion)?.key

  return (
    <main className="pb-carrito">
      <Header seccionActiva={seccionActiva} />

      <div className="mx-auto max-w-5xl px-5">
        {error ? (
          <AvisoConfiguracion mensaje={error} />
        ) : (
          <OrderExperience items={items} salsas={salsas} seccionActiva={seccionActiva} />
        )}

        <SobreNosotros />

        <footer className="mt-16 border-t border-white/10 py-8 text-center text-xs text-white/35">
          <p className="titulo text-base text-white/60">{restaurante.nombre}</p>
          <p className="mt-1">{restaurante.eslogan}</p>
          <p className="mt-3">Precios en {restaurante.moneda}. El precio final lo confirma el restaurante.</p>
        </footer>
      </div>
    </main>
  )
}
