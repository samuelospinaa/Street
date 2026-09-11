'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { EditorLinea } from './EditorLinea'
import { useCart } from '@/lib/cart-context'
import { construirAdiciones } from '@/lib/menu'
import { contarItems, formatCOP, subtotalCarrito, totalLinea } from '@/lib/pricing'
import { SEDES, SEDE_POR_DEFECTO, type SedeId } from '@/lib/sedes'
import { SECCIONES_CON_PAPAS, type MenuItem, type Salsa, type TipoEntrega } from '@/lib/types'

type OrderFormProps = {
  items: MenuItem[]
  salsas: Salsa[]
}

type EstadoUbicacion = 'idle' | 'cargando' | 'ok' | 'error'

/**
 * Contenido de `/pedido`: acá viven los datos de entrega y la edición fina
 * del carrito (ingredientes, salsas, adiciones, agregar una bebida que faltó).
 * Vive en su propia página para que no se pierda si el cliente sigue
 * navegando el menú — el carrito en sí está en `CartProvider`, no acá.
 */
export function OrderForm({ items, salsas }: OrderFormProps) {
  const router = useRouter()
  const {
    lineas,
    resultado,
    enviando,
    cambiarCantidad,
    eliminar,
    editarLinea,
    agregar,
    confirmar,
    nuevoPedido,
    ultimoPedido,
  } = useCart()

  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [telefonoAlterno, setTelefonoAlterno] = useState('')
  const [sedeId, setSedeId] = useState<SedeId>(SEDE_POR_DEFECTO)
  const [tipoEntrega, setTipoEntrega] = useState<TipoEntrega>('domicilio')
  const [direccion, setDireccion] = useState('')
  const [unidad, setUnidad] = useState('')
  const [notas, setNotas] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [estadoUbicacion, setEstadoUbicacion] = useState<EstadoUbicacion>('idle')
  const [errorLocal, setErrorLocal] = useState<string | null>(null)
  const [editandoLinea, setEditandoLinea] = useState<string | null>(null)

  // Precompleta los datos del cliente con los del último pedido exitoso guardado
  // en este navegador (ver `lib/cart-context.tsx`), sin pisar lo que ya haya escrito.
  useEffect(() => {
    if (!ultimoPedido) return
    setNombre((actual) => actual || ultimoPedido.cliente.nombre)
    setTelefono((actual) => actual || ultimoPedido.cliente.telefono)
    setTelefonoAlterno((actual) => actual || ultimoPedido.cliente.telefonoAlterno)
    setDireccion((actual) => actual || ultimoPedido.cliente.direccion)
    setUnidad((actual) => actual || ultimoPedido.cliente.unidad)
    setSedeId((actual) => (actual === SEDE_POR_DEFECTO ? ultimoPedido.cliente.sedeId : actual))
    setTipoEntrega((actual) => (actual === 'domicilio' ? ultimoPedido.cliente.tipoEntrega : actual))
  }, [ultimoPedido])

  const itemsPorId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])
  const adiciones = useMemo(() => construirAdiciones(items), [items])
  const bebidas = useMemo(() => items.filter((i) => i.seccion === 'bebidas'), [items])

  const subtotal = subtotalCarrito(lineas)
  const totalItems = contarItems(lineas)
  const exito = resultado?.ok === true
  const esDomicilio = tipoEntrega === 'domicilio'

  function compartirUbicacion() {
    if (!('geolocation' in navigator)) {
      setEstadoUbicacion('error')
      return
    }

    setEstadoUbicacion('cargando')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setEstadoUbicacion('ok')
      },
      // Si la niega o falla, el pedido sigue normal solo con la dirección.
      () => setEstadoUbicacion('error'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErrorLocal(null)

    if (lineas.length === 0) return setErrorLocal('Tu pedido está vacío: agrega al menos un producto del menú.')
    if (!nombre.trim()) return setErrorLocal('Escribe tu nombre.')
    if (esDomicilio && !direccion.trim()) return setErrorLocal('Escribe la dirección de entrega.')

    confirmar({
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      telefonoAlterno: telefonoAlterno.trim(),
      sedeId,
      tipoEntrega,
      direccion: esDomicilio ? direccion.trim() : '',
      unidad: esDomicilio ? unidad.trim() : '',
      notas: notas.trim(),
      lat: esDomicilio ? (coords?.lat ?? null) : null,
      lng: esDomicilio ? (coords?.lng ?? null) : null,
    })
  }

  function agregarBebida(bebida: MenuItem) {
    agregar({
      menuItemId: bebida.id,
      nombre: bebida.nombre,
      precioBase: Number(bebida.precio_cop),
      cantidad: 1,
      salsas: [],
      adiciones: [],
      ingredientesQuitados: [],
    })
  }

  function otroPedido() {
    nuevoPedido()
    router.push('/')
  }

  // ------------------------------------------------------ pedido ya registrado
  if (exito && resultado.ok) {
    return (
      <section className="mx-auto max-w-2xl px-5 py-16">
        <div className="tarjeta textura-papel textura-papel-fuerte overflow-hidden p-6 text-center md:p-10">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-amber">Pedido registrado</p>
          <h2 className="titulo mt-3 text-3xl md:text-4xl">Último paso</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/70">
            Guardamos tu pedido{' '}
            <span className="font-semibold text-white">#{resultado.orderId.slice(0, 8).toUpperCase()}</span>. Toca
            el botón, se abrirá WhatsApp con el mensaje ya escrito y solo tienes que darle enviar.
          </p>

          <a
            href={resultado.waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-7 inline-flex items-center gap-2.5 rounded-xl bg-[#25D366] px-7 py-4 font-semibold text-black transition hover:brightness-110 active:scale-[0.98]"
          >
            <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="currentColor">
              <path d="M17.47 14.38c-.3-.15-1.74-.86-2-.96-.27-.1-.47-.15-.66.15-.2.3-.76.96-.94 1.16-.17.2-.34.22-.64.08-.3-.15-1.24-.46-2.36-1.46-.87-.78-1.46-1.73-1.63-2.03-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.66-1.6-.9-2.19-.24-.57-.48-.5-.66-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47s1.06 2.86 1.21 3.06c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.74-.71 1.99-1.4.24-.69.24-1.28.17-1.4-.07-.13-.27-.2-.57-.35z" />
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.17 8.17 0 0 1-1.25-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.25 8.23z" />
            </svg>
            Enviar pedido por WhatsApp
          </a>

          <p className="mt-4 text-xs text-white/40">
            Tu pedido ya quedó guardado aunque cierres WhatsApp, pero solo lo empezamos a preparar cuando nos
            llegue el mensaje.
          </p>

          <button type="button" onClick={otroPedido} className="btn-ghost mt-7">
            Hacer otro pedido
          </button>
        </div>
      </section>
    )
  }

  // --------------------------------------------------------------- formulario
  return (
    <section className="mx-auto max-w-5xl px-5 py-10">
      <div className="mb-6 flex items-end gap-4">
        <Link href="/" className="text-sm text-white/45 underline-offset-2 transition hover:text-white hover:underline">
          ← Seguir viendo el menú
        </Link>
      </div>

      <div className="mb-6 flex items-end gap-4">
        <h1 className="titulo text-3xl md:text-4xl">Tu pedido</h1>
        <span className="separador mb-2 hidden flex-1 sm:block" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <form onSubmit={enviar} className="tarjeta flex flex-col gap-4 p-5 md:p-6">
          <div>
            <span className="text-xs uppercase tracking-wider text-white/50">
              Sede <span className="text-amber">*</span>
            </span>
            <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SEDES.map((sede) => (
                <button
                  key={sede.id}
                  type="button"
                  onClick={() => setSedeId(sede.id)}
                  aria-pressed={sedeId === sede.id}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                    sedeId === sede.id
                      ? 'border-amber bg-amber/10 text-amber'
                      : 'border-white/15 text-white/60 hover:border-white/30'
                  }`}
                >
                  {sede.nombre}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs uppercase tracking-wider text-white/50">Entrega</span>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTipoEntrega('domicilio')}
                aria-pressed={esDomicilio}
                className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
                  esDomicilio
                    ? 'border-amber bg-amber/10 text-amber'
                    : 'border-white/15 text-white/60 hover:border-white/30'
                }`}
              >
                🛵 Domicilio
              </button>
              <button
                type="button"
                onClick={() => setTipoEntrega('recoger')}
                aria-pressed={!esDomicilio}
                className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
                  !esDomicilio
                    ? 'border-amber bg-amber/10 text-amber'
                    : 'border-white/15 text-white/60 hover:border-white/30'
                }`}
              >
                🏠 Recoger en el local
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs uppercase tracking-wider text-white/50">
                Nombre <span className="text-amber">*</span>
              </span>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="¿Cómo te llamas?"
                autoComplete="name"
                required
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs uppercase tracking-wider text-white/50">Teléfono</span>
              <input
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Opcional"
                inputMode="tel"
                autoComplete="tel"
              />
            </label>
          </div>

          {esDomicilio ? (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs uppercase tracking-wider text-white/50">
                  Dirección de entrega <span className="text-amber">*</span>
                </span>
                <input
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Calle, número, barrio, punto de referencia"
                  autoComplete="street-address"
                  required
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs uppercase tracking-wider text-white/50">Unidad / apartamento</span>
                  <input
                    value={unidad}
                    onChange={(e) => setUnidad(e.target.value)}
                    placeholder="Torre, apto, oficina (si aplica)"
                    autoComplete="address-line2"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs uppercase tracking-wider text-white/50">Teléfono alternativo</span>
                  <input
                    value={telefonoAlterno}
                    onChange={(e) => setTelefonoAlterno(e.target.value)}
                    placeholder="Opcional"
                    inputMode="tel"
                    autoComplete="tel"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={compartirUbicacion}
                  disabled={estadoUbicacion === 'cargando'}
                  className="btn-ghost disabled:opacity-50"
                >
                  {estadoUbicacion === 'cargando' ? 'Buscando…' : '📍 Compartir mi ubicación'}
                </button>

                {estadoUbicacion === 'ok' && coords && (
                  <span className="text-xs text-green-400">
                    Ubicación lista ({coords.lat.toFixed(5)}, {coords.lng.toFixed(5)})
                  </span>
                )}
                {estadoUbicacion === 'error' && (
                  <span className="text-xs text-white/45">
                    No pudimos obtenerla — seguimos solo con la dirección escrita.
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-sm text-white/70">
                Perfecto, lo dejamos listo para recoger. Te confirmamos por WhatsApp la hora en que puedes pasar
                por el local.
              </p>
              <label className="mt-3 flex flex-col gap-1.5">
                <span className="text-xs uppercase tracking-wider text-white/50">Teléfono alternativo</span>
                <input
                  value={telefonoAlterno}
                  onChange={(e) => setTelefonoAlterno(e.target.value)}
                  placeholder="Opcional"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </label>
            </div>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wider text-white/50">Notas</span>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              placeholder={esDomicilio ? 'Timbre dañado, dejar en portería…' : 'Hora en la que pasas a recogerlo…'}
              className="resize-y"
            />
          </label>

          {(errorLocal || (resultado && !resultado.ok)) && (
            <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {errorLocal ?? (resultado && !resultado.ok ? resultado.error : '')}
            </p>
          )}

          <button type="submit" disabled={enviando || lineas.length === 0} className="btn-amber mt-1">
            {enviando ? 'Registrando pedido…' : 'Confirmar pedido'}
          </button>

          <p className="text-center text-xs text-white/40">
            Al confirmar guardamos el pedido y te damos el botón para enviarlo por WhatsApp.
          </p>
        </form>

        <aside className="tarjeta textura-papel h-fit p-5">
          <h3 className="titulo text-xl">Resumen</h3>

          {lineas.length === 0 ? (
            <p className="mt-4 text-sm text-white/45">
              Todavía no has agregado nada.{' '}
              <Link href="/" className="text-amber underline-offset-2 hover:underline">
                Elige algo del menú
              </Link>
              .
            </p>
          ) : (
            <>
              <ul className="mt-4 space-y-3">
                {lineas.map((linea) => {
                  const item = itemsPorId.get(linea.menuItemId)
                  const esEditable = item ? SECCIONES_CON_PAPAS.includes(item.seccion) : false
                  const editandoEsta = editandoLinea === linea.lineId

                  return (
                    <li key={linea.lineId} className="border-b border-white/5 pb-3 text-sm last:border-0">
                      <div className="flex items-start gap-2">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{linea.nombre}</span>
                          {linea.ingredientesQuitados.length > 0 && (
                            <span className="block text-xs leading-snug text-white/40">
                              Sin: {linea.ingredientesQuitados.join(', ')}
                            </span>
                          )}
                          {(linea.salsas.length > 0 || linea.adiciones.length > 0) && (
                            <span className="block text-xs leading-snug text-white/40">
                              {[...linea.salsas, ...linea.adiciones.map((a) => a.nombre)].join(' · ')}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 tabular-nums text-white/70">{formatCOP(totalLinea(linea))}</span>
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          {esEditable && (
                            <button
                              type="button"
                              onClick={() => setEditandoLinea(editandoEsta ? null : linea.lineId)}
                              aria-expanded={editandoEsta}
                              className="text-xs text-amber/80 underline-offset-2 transition hover:text-amber hover:underline"
                            >
                              {editandoEsta ? 'Listo' : 'Editar'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => eliminar(linea.lineId)}
                            className="text-xs text-white/35 underline-offset-2 transition hover:text-red-400 hover:underline"
                          >
                            Quitar
                          </button>
                        </div>

                        <div className="flex items-center gap-2 rounded-lg border border-white/15 px-1.5 py-0.5">
                          <button
                            type="button"
                            aria-label={`Quitar uno de ${linea.nombre}`}
                            onClick={() => cambiarCantidad(linea.lineId, linea.cantidad - 1)}
                            className="h-6 w-6 rounded text-white/70 transition hover:bg-white/10 hover:text-white"
                          >
                            −
                          </button>
                          <span className="min-w-[1rem] text-center text-sm tabular-nums">{linea.cantidad}</span>
                          <button
                            type="button"
                            aria-label={`Agregar uno de ${linea.nombre}`}
                            onClick={() => cambiarCantidad(linea.lineId, linea.cantidad + 1)}
                            className="h-6 w-6 rounded text-white/70 transition hover:bg-white/10 hover:text-white"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {esEditable && editandoEsta && (
                        <EditorLinea
                          linea={linea}
                          ingredientesBase={item?.ingredientes ?? []}
                          salsas={salsas}
                          adiciones={adiciones}
                          onEditar={editarLinea}
                        />
                      )}
                    </li>
                  )
                })}
              </ul>

              {bebidas.length > 0 && (
                <div className="mt-4">
                  <p className="mb-1.5 text-[0.65rem] uppercase tracking-wider text-white/30">¿Falta una bebida?</p>
                  <div className="flex flex-wrap gap-1.5">
                    {bebidas.map((bebida) => (
                      <button
                        key={bebida.id}
                        type="button"
                        onClick={() => agregarBebida(bebida)}
                        className="chip chip-off"
                      >
                        + {bebida.nombre}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="separador my-4" />

              <div className="flex items-baseline justify-between">
                <span className="text-sm text-white/60">
                  Subtotal · {totalItems} {totalItems === 1 ? 'ítem' : 'ítems'}
                </span>
                <span className="font-display text-2xl text-amber">{formatCOP(subtotal)}</span>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-white/40">
                Este subtotal es informativo{esDomicilio ? ' y no incluye domicilio' : ''}. El precio final
                {esDomicilio ? ' y el tiempo de entrega' : ' y la hora para recoger'} te los confirma Street Fries
                por WhatsApp.
              </p>
            </>
          )}
        </aside>
      </div>
    </section>
  )
}
