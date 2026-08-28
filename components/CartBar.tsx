'use client'

import Link from 'next/link'
import { useState } from 'react'
import { EditorLinea } from './EditorLinea'
import { LogoSticker } from './Sticker'
import { contarItems, formatCOP, subtotalCarrito, totalLinea } from '@/lib/pricing'
import { SECCIONES_CON_PAPAS, type AdicionSeleccionada, type CartLine, type MenuItem, type Salsa } from '@/lib/types'

type CartBarProps = {
  lineas: CartLine[]
  items: MenuItem[]
  salsas: Salsa[]
  adiciones: MenuItem[]
  onCantidad: (lineId: string, cantidad: number) => void
  onEliminar: (lineId: string) => void
  onEditar: (
    lineId: string,
    cambios: { salsas: string[]; adiciones: AdicionSeleccionada[]; ingredientesQuitados: string[] },
  ) => void
}

export function CartBar({ lineas, items, salsas, adiciones, onCantidad, onEliminar, onEditar }: CartBarProps) {
  const [abierto, setAbierto] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)

  if (lineas.length === 0) return null

  const itemsPorId = new Map(items.map((i) => [i.id, i]))
  const totalItems = contarItems(lineas)
  const subtotal = subtotalCarrito(lineas)

  return (
    <>
      {abierto && (
        <button
          type="button"
          aria-label="Cerrar el resumen"
          onClick={() => setAbierto(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        />
      )}

      <div className="fixed inset-x-0 bottom-0 z-50">
        {/* El sticker queda "pegado" sobre la barra del carrito. */}
        <div className="pointer-events-none mx-auto max-w-3xl px-4">
          <div className="flex justify-end">
            <LogoSticker size={66} rotacion={9} priority className="relative -bottom-2 right-2" />
          </div>
        </div>

        <div className="textura-papel textura-papel-fuerte mx-auto max-w-3xl overflow-hidden rounded-t-2xl border border-b-0 border-white/15 bg-carbon-soft/95 shadow-[0_-14px_40px_rgba(0,0,0,0.75)] backdrop-blur-md">
          {abierto && (
            <div className="animate-slide-up max-h-[45vh] overflow-y-auto border-b border-white/10 px-4 py-3">
              {lineas.map((linea) => {
                const item = itemsPorId.get(linea.menuItemId)
                const esEditable = item ? SECCIONES_CON_PAPAS.includes(item.seccion) : false
                const editandoEsta = editando === linea.lineId

                return (
                  <div key={linea.lineId} className="border-b border-white/5 py-3 last:border-0">
                    <div className="flex gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{linea.nombre}</p>
                        {linea.ingredientesQuitados.length > 0 && (
                          <p className="mt-0.5 text-xs text-white/45">
                            Sin: {linea.ingredientesQuitados.join(', ')}
                          </p>
                        )}
                        {linea.salsas.length > 0 && (
                          <p className="mt-0.5 text-xs text-white/45">Salsas: {linea.salsas.join(', ')}</p>
                        )}
                        {linea.adiciones.length > 0 && (
                          <p className="mt-0.5 text-xs text-white/45">
                            Adiciones: {linea.adiciones.map((a) => a.nombre).join(', ')}
                          </p>
                        )}
                        <div className="mt-1 flex items-center gap-3">
                          {esEditable && (
                            <button
                              type="button"
                              onClick={() => setEditando(editandoEsta ? null : linea.lineId)}
                              aria-expanded={editandoEsta}
                              className="text-xs text-amber/80 underline-offset-2 transition hover:text-amber hover:underline"
                            >
                              {editandoEsta ? 'Listo' : 'Editar ingredientes/salsas/adiciones'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onEliminar(linea.lineId)}
                            className="text-xs text-white/35 underline-offset-2 transition hover:text-red-400 hover:underline"
                          >
                            Quitar
                          </button>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span className="font-display text-base text-amber">{formatCOP(totalLinea(linea))}</span>
                        <div className="flex items-center gap-2 rounded-lg border border-white/15 px-1.5 py-0.5">
                          <button
                            type="button"
                            aria-label={`Quitar uno de ${linea.nombre}`}
                            onClick={() => onCantidad(linea.lineId, linea.cantidad - 1)}
                            className="h-6 w-6 rounded text-white/70 transition hover:bg-white/10 hover:text-white"
                          >
                            −
                          </button>
                          <span className="min-w-[1rem] text-center text-sm tabular-nums">{linea.cantidad}</span>
                          <button
                            type="button"
                            aria-label={`Agregar uno de ${linea.nombre}`}
                            onClick={() => onCantidad(linea.lineId, linea.cantidad + 1)}
                            className="h-6 w-6 rounded text-white/70 transition hover:bg-white/10 hover:text-white"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    {esEditable && editandoEsta && (
                      <EditorLinea
                        linea={linea}
                        ingredientesBase={item?.ingredientes ?? []}
                        salsas={salsas}
                        adiciones={adiciones}
                        onEditar={onEditar}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <div className="flex items-center gap-3 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={() => setAbierto((v) => !v)}
              aria-expanded={abierto}
              className="min-w-0 flex-1 text-left"
            >
              <p className="flex items-center gap-2 text-sm">
                <span className="animate-pop rounded-full bg-amber px-2 py-0.5 text-xs font-bold text-carbon">
                  {totalItems}
                </span>
                <span className="font-display text-xl">{formatCOP(subtotal)}</span>
                <span aria-hidden className="text-white/40">
                  {abierto ? '▾' : '▴'}
                </span>
              </p>
              <p className="mt-0.5 truncate text-[0.68rem] leading-tight text-white/45">
                Subtotal informativo — el precio final lo confirma Street Fries
              </p>
            </button>

            <Link href="/pedido" onClick={() => setAbierto(false)} className="btn-amber shrink-0 text-sm">
              Continuar
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
