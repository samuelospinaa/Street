'use client'

import { TOSTON_ENTOCINETADO_ID, TOSTON_ID, formatCOP } from '@/lib/pricing'
import type { AdicionSeleccionada, CartLine, MenuItem, Salsa } from '@/lib/types'

export type CambiosLinea = { salsas: string[]; adiciones: AdicionSeleccionada[]; ingredientesQuitados: string[] }

/** Editor de ingredientes/salsas/adiciones de una línea ya agregada al carrito:
 *  cada click aplica el cambio de una vez sobre `linea` (no hay borrador ni
 *  "Guardar"). Se usa tanto en la barra flotante del menú como en `/pedido`. */
export function EditorLinea({
  linea,
  ingredientesBase,
  salsas,
  adiciones,
  onEditar,
}: {
  linea: CartLine
  ingredientesBase: string[]
  salsas: Salsa[]
  adiciones: MenuItem[]
  onEditar: (lineId: string, cambios: CambiosLinea) => void
}) {
  const idsAdicionesSel = new Set(linea.adiciones.map((a) => a.id))

  function toggleAdicion(id: string) {
    let ids: string[]
    if (idsAdicionesSel.has(id)) {
      ids = [...idsAdicionesSel].filter((x) => x !== id)
    } else {
      // El tostón simple y el entocinetado son alternativas del mismo
      // producto: marcar uno desmarca el otro (igual que en la tarjeta).
      const sinAlternativa = [...idsAdicionesSel].filter((x) => {
        if (id === TOSTON_ID) return x !== TOSTON_ENTOCINETADO_ID
        if (id === TOSTON_ENTOCINETADO_ID) return x !== TOSTON_ID
        return true
      })
      ids = [...sinAlternativa, id]
    }

    const nuevasAdiciones = adiciones
      .filter((a) => ids.includes(a.id))
      .map((a) => ({ id: a.id, nombre: a.nombre, precio: Number(a.precio_cop) }))
    onEditar(linea.lineId, {
      salsas: linea.salsas,
      adiciones: nuevasAdiciones,
      ingredientesQuitados: linea.ingredientesQuitados,
    })
  }

  function toggleSalsa(salsa: Salsa) {
    const tieneSalsa = linea.salsas.includes(salsa.nombre)
    const nuevasSalsas = tieneSalsa ? linea.salsas.filter((s) => s !== salsa.nombre) : [...linea.salsas, salsa.nombre]
    onEditar(linea.lineId, {
      salsas: nuevasSalsas,
      adiciones: linea.adiciones,
      ingredientesQuitados: linea.ingredientesQuitados,
    })
  }

  function toggleIngrediente(nombre: string) {
    const quitado = linea.ingredientesQuitados.includes(nombre)
    const nuevosQuitados = quitado
      ? linea.ingredientesQuitados.filter((i) => i !== nombre)
      : [...linea.ingredientesQuitados, nombre]
    onEditar(linea.lineId, { salsas: linea.salsas, adiciones: linea.adiciones, ingredientesQuitados: nuevosQuitados })
  }

  const gruposSalsas = [
    { titulo: 'Tradicionales', lista: salsas.filter((s) => s.grupo === 'tradicional') },
    { titulo: 'Del chef', lista: salsas.filter((s) => s.grupo === 'chef') },
    { titulo: 'Especiales', lista: salsas.filter((s) => s.grupo === 'disponible') },
  ].filter((g) => g.lista.length > 0)

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-white/10 bg-white/5 p-3">
      {ingredientesBase.length > 0 && (
        <div>
          <p className="mb-1.5 text-[0.65rem] uppercase tracking-wider text-white/30">Ingredientes</p>
          <div className="grid gap-1">
            {ingredientesBase.map((ingrediente) => {
              const quitado = linea.ingredientesQuitados.includes(ingrediente)
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
        </div>
      )}

      {adiciones.length > 0 && (
        <div>
          <p className="mb-1.5 text-[0.65rem] uppercase tracking-wider text-white/30">Adiciones</p>
          <div className="grid max-h-40 gap-1 overflow-y-auto pr-1">
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
                    checked={idsAdicionesSel.has(adicion.id)}
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
        </div>
      )}

      {gruposSalsas.length > 0 && (
        <div>
          <p className="mb-1.5 text-[0.65rem] uppercase tracking-wider text-white/30">Salsas</p>
          <div className="space-y-2">
            {gruposSalsas.map((grupo) => (
              <div key={grupo.titulo}>
                <p className="mb-1 text-[0.6rem] uppercase tracking-wider text-white/25">{grupo.titulo}</p>
                <div className="flex flex-wrap gap-1.5">
                  {grupo.lista.map((salsa) => {
                    const activa = linea.salsas.includes(salsa.nombre)
                    return (
                      <button
                        key={salsa.id}
                        type="button"
                        aria-pressed={activa}
                        onClick={() => toggleSalsa(salsa)}
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
        </div>
      )}
    </div>
  )
}
