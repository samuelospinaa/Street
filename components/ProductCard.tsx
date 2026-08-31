'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { encuadreDe } from '@/lib/imagenes'
import { TOSTON_ENTOCINETADO_EXTRA, TOSTON_ENTOCINETADO_ID, TOSTON_ID, formatCOP } from '@/lib/pricing'
import { idsSalsasRecomendadas } from '@/lib/salsas'
import type { AdicionSeleccionada, CartLine, MenuItem, Salsa } from '@/lib/types'

type Variante = 'fries' | 'simple'

type ProductCardProps = {
  item: MenuItem
  salsas?: Salsa[]
  adiciones?: MenuItem[]
  variante: Variante
  compacta?: boolean
  onAgregar: (linea: Omit<CartLine, 'lineId'>) => void
}

function Cantidad({
  valor,
  onChange,
  compacta = false,
}: {
  valor: number
  onChange: (n: number) => void
  compacta?: boolean
}) {
  const botonClase = compacta
    ? 'h-6 w-6 rounded-md text-sm leading-none text-white/70 transition hover:bg-white/10 hover:text-white active:scale-95'
    : 'h-8 w-8 rounded-lg text-lg leading-none text-white/70 transition hover:bg-white/10 hover:text-white active:scale-95'

  return (
    <div
      className={`flex items-center justify-between rounded-xl border border-white/15 ${compacta ? 'flex-1 gap-1 px-1 py-0.5' : 'gap-3 px-2 py-1'}`}
    >
      <button type="button" onClick={() => onChange(Math.max(1, valor - 1))} aria-label="Quitar uno" className={botonClase}>
        −
      </button>
      <span
        className={`min-w-[1.25rem] text-center font-display tabular-nums ${compacta ? 'text-sm' : 'text-lg'}`}
      >
        {valor}
      </span>
      <button type="button" onClick={() => onChange(Math.min(50, valor + 1))} aria-label="Agregar uno" className={botonClase}>
        +
      </button>
    </div>
  )
}

export function ProductCard({
  item,
  salsas = [],
  adiciones = [],
  variante,
  compacta = false,
  onAgregar,
}: ProductCardProps) {
  // Las salsas que la carta recomienda arrancan marcadas; el cliente puede
  // quitarlas o agregar otras desde el desplegable.
  const salsasRecomendadas = useMemo(
    () => idsSalsasRecomendadas(item.salsas_recomendadas, salsas),
    [item.salsas_recomendadas, salsas],
  )

  const [cantidad, setCantidad] = useState(1)
  const [salsasSel, setSalsasSel] = useState<string[]>(salsasRecomendadas)
  const [adicionesSel, setAdicionesSel] = useState<string[]>([])
  const [ingredientesQuitados, setIngredientesQuitados] = useState<string[]>([])
  const [verAdiciones, setVerAdiciones] = useState(false)
  const [verSalsas, setVerSalsas] = useState(false)
  const [verIngredientes, setVerIngredientes] = useState(false)
  const [agregado, setAgregado] = useState(false)
  const [mostrarUpsellToston, setMostrarUpsellToston] = useState(false)

  const permiteSalsas = variante === 'fries' && salsas.length > 0
  const permiteAdiciones = variante === 'fries' && adiciones.length > 0
  const permiteIngredientes = variante === 'fries' && (item.ingredientes?.length ?? 0) > 0

  // El tostón de queso y su variante entocinetada viajan al frente de
  // `adiciones` (los inyecta OrderExperience); se ubican aquí para
  // resaltarlos en la lista y para el diálogo de upsell al agregar al carrito.
  const tostonSimple = adiciones.find((a) => a.id === TOSTON_ID)
  const tostonEntocinetado = adiciones.find((a) => a.id === TOSTON_ENTOCINETADO_ID)

  function construirAdicionesElegidas(idsExtra: string[] = []): AdicionSeleccionada[] {
    const ids = new Set([...adicionesSel, ...idsExtra])
    return adiciones
      .filter((a) => ids.has(a.id))
      .map((a) => ({ id: a.id, nombre: a.nombre, precio: Number(a.precio_cop) }))
  }

  const adicionesElegidas = construirAdicionesElegidas()
  const precioUnitario = Number(item.precio_cop) + adicionesElegidas.reduce((s, a) => s + a.precio, 0)

  function toggleSalsa(id: string) {
    setSalsasSel((actual) => (actual.includes(id) ? actual.filter((s) => s !== id) : [...actual, id]))
  }

  function toggleIngrediente(nombre: string) {
    setIngredientesQuitados((actual) =>
      actual.includes(nombre) ? actual.filter((i) => i !== nombre) : [...actual, nombre],
    )
  }

  function toggleAdicion(id: string) {
    setAdicionesSel((actual) => {
      if (actual.includes(id)) return actual.filter((a) => a !== id)

      // El tostón simple y el entocinetado son alternativas del mismo
      // producto: marcar uno desmarca el otro.
      const sinAlternativa = actual.filter((a) => {
        if (id === TOSTON_ID) return a !== TOSTON_ENTOCINETADO_ID
        if (id === TOSTON_ENTOCINETADO_ID) return a !== TOSTON_ID
        return true
      })
      return [...sinAlternativa, id]
    })
  }

  function agregar(idsExtra: string[] = []) {
    onAgregar({
      menuItemId: item.id,
      nombre: item.nombre,
      precioBase: Number(item.precio_cop),
      cantidad,
      salsas: salsas.filter((s) => salsasSel.includes(s.id)).map((s) => s.nombre),
      adiciones: construirAdicionesElegidas(idsExtra),
      ingredientesQuitados,
    })

    setCantidad(1)
    setSalsasSel(salsasRecomendadas)
    setAdicionesSel([])
    setIngredientesQuitados([])
    setVerAdiciones(false)
    setVerSalsas(false)
    setVerIngredientes(false)
    setMostrarUpsellToston(false)
    setAgregado(true)
    setTimeout(() => setAgregado(false), 1600)
  }

  // Antes de agregar un plato de papas sin tostón, se ofrece una vez como
  // adición — el cliente decide si lo quiere, y en qué versión.
  function clicAgregar() {
    const yaTieneToston = adicionesSel.includes(TOSTON_ID) || adicionesSel.includes(TOSTON_ENTOCINETADO_ID)
    if (tostonSimple && !yaTieneToston) {
      setMostrarUpsellToston(true)
      return
    }
    agregar()
  }

  const encuadre = encuadreDe(item.id)
  const salsasTradicionales = salsas.filter((s) => s.grupo === 'tradicional')
  const salsasChef = salsas.filter((s) => s.grupo === 'chef')
  const salsasEspeciales = salsas.filter((s) => s.grupo === 'disponible')

  // ------------------------------------------------------- bebidas y entradas
  if (variante === 'simple') {
    if (compacta) {
      return (
        <article className="tarjeta flex flex-col gap-2 p-3">
          <div>
            <h3 className="titulo text-sm leading-tight">{item.nombre}</h3>
            {item.subtitulo && (
              <p className="mt-0.5 text-[0.6rem] uppercase tracking-[0.14em] text-white/40">{item.subtitulo}</p>
            )}
            {item.descripcion && <p className="mt-1 text-xs leading-snug text-white/65">{item.descripcion}</p>}
          </div>

          <div className="mt-auto flex flex-col gap-2">
            <span className="font-display text-lg text-amber">{formatCOP(Number(item.precio_cop))}</span>
            <Cantidad valor={cantidad} onChange={setCantidad} compacta />
            <button type="button" onClick={() => agregar()} className="btn-amber w-full px-2 py-2 text-xs">
              {agregado ? '✓' : 'Agregar'}
            </button>
          </div>
        </article>
      )
    }

    return (
      <article className="tarjeta flex flex-col gap-4 p-5">
        <div>
          <h3 className="titulo text-xl">{item.nombre}</h3>
          {item.subtitulo && (
            <p className="mt-0.5 text-[0.7rem] uppercase tracking-[0.18em] text-white/40">{item.subtitulo}</p>
          )}
          {item.descripcion && <p className="mt-2 text-sm leading-relaxed text-white/65">{item.descripcion}</p>}
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
          <span className="font-display text-2xl text-amber">{formatCOP(Number(item.precio_cop))}</span>
          <div className="flex items-center gap-2">
            <Cantidad valor={cantidad} onChange={setCantidad} />
            <button type="button" onClick={() => agregar()} className="btn-amber px-4 py-2.5 text-sm">
              {agregado ? '✓' : 'Agregar'}
            </button>
          </div>
        </div>
      </article>
    )
  }

  // ------------------------------------------------------------------- papas
  return (
    <>
      <article className="tarjeta flex flex-col overflow-hidden">
      {/* Solo 7 productos tienen foto. Los demás se muestran sin bloque de
          imagen a propósito: nada de placeholders grises. */}
      {item.imagen_url && (
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-carbon">
          <Image
            src={item.imagen_url}
            alt={item.nombre}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
            style={{
              objectPosition: encuadre.posicion,
              transform: `scale(${encuadre.escala})`,
              // El zoom debe girar sobre el mismo punto que ancla el encuadre;
              // si no, escala desde el centro y deshace el object-position.
              transformOrigin: encuadre.posicion,
            }}
          />
        </div>
      )}

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          {!item.imagen_url && <div className="mb-3 h-[3px] w-10 rounded-full bg-amber" />}
          <h3 className={`titulo ${item.imagen_url ? 'text-2xl' : 'text-3xl'}`}>{item.nombre}</h3>
          {item.subtitulo && (
            <p className="mt-1 text-[0.7rem] uppercase tracking-[0.18em] text-amber/80">{item.subtitulo}</p>
          )}
          {item.descripcion && (
            <p className="mt-2.5 text-sm leading-relaxed text-white/65">{item.descripcion}</p>
          )}
          {item.salsas_recomendadas && item.salsas_recomendadas.length > 0 && (
            <p className="mt-2.5 text-xs text-white/40">
              Van bien con: {item.salsas_recomendadas.join(' · ')}
              {permiteSalsas && salsasRecomendadas.length > 0 && (
                <span className="text-white/30"> — ya vienen marcadas, puedes cambiarlas</span>
              )}
            </p>
          )}
        </div>

        {permiteIngredientes && (
          <div>
            <button
              type="button"
              onClick={() => setVerIngredientes((v) => !v)}
              aria-expanded={verIngredientes}
              className="flex w-full items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-left text-xs text-white/60 transition hover:border-white/25 hover:text-white"
            >
              <span>
                Ingredientes
                {ingredientesQuitados.length > 0 && (
                  <span className="ml-2 rounded-full bg-amber px-1.5 py-0.5 text-[0.65rem] font-bold text-carbon">
                    sin {ingredientesQuitados.length}
                  </span>
                )}
              </span>
              <span aria-hidden>{verIngredientes ? '−' : '+'}</span>
            </button>

            {verIngredientes && (
              <div className="mt-2 grid gap-1">
                <p className="mb-0.5 text-[0.65rem] text-white/35">Desmarca lo que no quieras en tu pedido</p>
                {item.ingredientes?.map((ingrediente) => {
                  const quitado = ingredientesQuitados.includes(ingrediente)
                  return (
                    <label
                      key={ingrediente}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-xs transition hover:bg-white/5"
                    >
                      <input
                        type="checkbox"
                        checked={!quitado}
                        onChange={() => toggleIngrediente(ingrediente)}
                        className="h-4 w-4 shrink-0 accent-[#F7A818]"
                      />
                      <span className={quitado ? 'flex-1 text-white/35 line-through' : 'flex-1 text-white/75'}>
                        {ingrediente}
                      </span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {permiteAdiciones && (
          <div>
            <button
              type="button"
              onClick={() => setVerAdiciones((v) => !v)}
              aria-expanded={verAdiciones}
              className="flex w-full items-center justify-between rounded-lg border border-amber/25 bg-amber/5 px-3 py-2 text-left text-xs font-medium text-white/80 transition hover:border-amber/50 hover:text-white"
            >
              <span>
                Adiciones
                {adicionesSel.length > 0 && (
                  <span className="ml-2 rounded-full bg-amber px-1.5 py-0.5 text-[0.65rem] font-bold text-carbon">
                    {adicionesSel.length}
                  </span>
                )}
              </span>
              <span aria-hidden>{verAdiciones ? '−' : '+'}</span>
            </button>

            {verAdiciones && (
              <div className="mt-2 grid max-h-56 gap-1 overflow-y-auto pr-1">
                {adiciones.map((adicion) => {
                  const esToston = adicion.id === TOSTON_ID || adicion.id === TOSTON_ENTOCINETADO_ID
                  return (
                    <label
                      key={adicion.id}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-xs transition hover:bg-white/5 ${
                        esToston ? 'bg-amber/5 ring-1 ring-inset ring-amber/20' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={adicionesSel.includes(adicion.id)}
                        onChange={() => toggleAdicion(adicion.id)}
                        className="h-4 w-4 shrink-0 accent-[#F7A818]"
                      />
                      <span className={`flex-1 ${esToston ? 'font-medium text-white/90' : 'text-white/75'}`}>
                        {adicion.nombre}
                      </span>
                      <span className="text-white/45">+{formatCOP(Number(adicion.precio_cop))}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {permiteSalsas && (
          <div>
            <button
              type="button"
              onClick={() => setVerSalsas((v) => !v)}
              aria-expanded={verSalsas}
              className="flex w-full items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-left text-xs text-white/60 transition hover:border-white/25 hover:text-white"
            >
              <span>
                Salsas
                {salsasSel.length > 0 && (
                  <span className="ml-2 rounded-full bg-amber px-1.5 py-0.5 text-[0.65rem] font-bold text-carbon">
                    {salsasSel.length}
                  </span>
                )}
              </span>
              <span aria-hidden>{verSalsas ? '−' : '+'}</span>
            </button>

            {verSalsas && (
              <div className="mt-2.5 space-y-2.5">
                {[
                  { titulo: 'Tradicionales', lista: salsasTradicionales },
                  { titulo: 'Del chef', lista: salsasChef },
                  { titulo: 'Especiales', lista: salsasEspeciales },
                ]
                  .filter((g) => g.lista.length > 0)
                  .map((grupo) => (
                    <div key={grupo.titulo}>
                      <p className="mb-1.5 text-[0.65rem] uppercase tracking-wider text-white/30">
                        {grupo.titulo}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {grupo.lista.map((salsa) => {
                          const activa = salsasSel.includes(salsa.id)
                          return (
                            <button
                              key={salsa.id}
                              type="button"
                              aria-pressed={activa}
                              onClick={() => toggleSalsa(salsa.id)}
                              className={`chip ${activa ? 'chip-on' : 'chip-off'}`}
                            >
                              {salsa.nombre}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-1">
          <div>
            <span className="font-display text-2xl text-amber">{formatCOP(precioUnitario)}</span>
            {adicionesElegidas.length > 0 && (
              <span className="ml-2 text-[0.7rem] text-white/40">c/adiciones</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Cantidad valor={cantidad} onChange={setCantidad} />
            <button type="button" onClick={clicAgregar} className="btn-amber px-4 py-2.5 text-sm">
              {agregado ? '✓' : 'Agregar'}
            </button>
          </div>
        </div>
      </div>
    </article>

    {mostrarUpsellToston && tostonSimple && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`upsell-toston-${item.id}`}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 py-8"
          onClick={() => agregar()}
        >
          <div
            className="tarjeta textura-papel my-auto max-h-full w-full max-w-sm overflow-y-auto overflow-x-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {tostonSimple.imagen_url && (
              /* Mismo recorte que usaba la tarjeta del tostón: la foto trae
                 letras de la carta pegadas al borde derecho, así que se
                 encuadra por fondo para dejarlas fuera. */
              <div
                role="img"
                aria-label={tostonSimple.nombre}
                className="aspect-[4/3] w-full bg-carbon bg-no-repeat"
                style={{
                  backgroundImage: `url('${tostonSimple.imagen_url}')`,
                  backgroundSize: '122% auto',
                  backgroundPosition: '0% 10%',
                }}
              />
            )}

            <div className="p-6">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber">
                ¿Le agregamos algo más?
              </p>
              <h3 id={`upsell-toston-${item.id}`} className="titulo mt-2 text-2xl">
                Tostón de Queso
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/65">
                El producto insignia de la casa. ¿Se lo agregamos a tu {item.nombre}?
              </p>

              <button
                type="button"
                onClick={() => agregar([TOSTON_ID])}
                className="mt-5 flex w-full items-center justify-between rounded-xl border border-white/15 px-4 py-3 text-left text-sm transition hover:border-white/30"
              >
                <span>Tostón de Queso</span>
                <span className="font-display text-amber">+{formatCOP(Number(tostonSimple.precio_cop))}</span>
              </button>

              {tostonEntocinetado && (
                <button
                  type="button"
                  onClick={() => agregar([TOSTON_ENTOCINETADO_ID])}
                  className="mt-2.5 flex w-full flex-col gap-1 rounded-xl border border-amber/50 bg-amber/10 px-4 py-3 text-left text-sm transition hover:border-amber/70 hover:bg-amber/15"
                >
                  <span className="flex items-center justify-between">
                    <span className="font-semibold">Tostón Entocinetado</span>
                    <span className="font-display text-amber">
                      +{formatCOP(Number(tostonEntocinetado.precio_cop))}
                    </span>
                  </span>
                  <span className="text-xs text-amber/80">
                    Por solo +{formatCOP(TOSTON_ENTOCINETADO_EXTRA)} más llévalo con tocineta
                  </span>
                </button>
              )}

              <button type="button" onClick={() => agregar()} className="btn-ghost mt-5 w-full text-sm">
                No gracias, continuar sin tostón
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
