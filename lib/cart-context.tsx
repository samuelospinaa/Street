'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useTransition } from 'react'
import { createOrder } from '@/app/actions'
import type { AdicionSeleccionada, CartLine, CreateOrderResult, DatosCliente, UltimoPedido } from './types'

const CLAVE_STORAGE = 'street-fries-carrito-v1'
// Sobrevive al vaciado del carrito tras confirmar, para poder ofrecer
// "pedir lo mismo de siempre" la próxima vez — por navegador, no hay cuentas.
const CLAVE_ULTIMO_PEDIDO = 'street-fries-ultimo-pedido-v1'

/** Dos líneas se funden solo si son el mismo producto con las mismas salsas,
 *  adiciones e ingredientes quitados. */
function firmaLinea(linea: Omit<CartLine, 'lineId' | 'cantidad'>): string {
  return [
    linea.menuItemId,
    [...linea.salsas].sort().join('|'),
    [...linea.adiciones.map((a) => a.id)].sort().join('|'),
    [...linea.ingredientesQuitados].sort().join('|'),
  ].join('::')
}

type CambiosLinea = { salsas: string[]; adiciones: AdicionSeleccionada[]; ingredientesQuitados: string[] }

type CartContextValue = {
  lineas: CartLine[]
  resultado: CreateOrderResult | null
  enviando: boolean
  agregar: (linea: Omit<CartLine, 'lineId'>) => void
  cambiarCantidad: (lineId: string, cantidad: number) => void
  eliminar: (lineId: string) => void
  editarLinea: (lineId: string, cambios: CambiosLinea) => void
  confirmar: (cliente: DatosCliente) => void
  nuevoPedido: () => void
  ultimoPedido: UltimoPedido | null
  repetirUltimoPedido: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

/**
 * El carrito vive en un context montado en el layout raíz (no dentro de una
 * página) para que sobreviva la navegación entre "/" y "/pedido" — así el
 * cliente arma su pedido en el menú, pasa a "/pedido" a poner sus datos, y si
 * se devuelve a agregar algo más no pierde nada. También se guarda en
 * localStorage por si recarga la página a medio camino.
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lineas, setLineas] = useState<CartLine[]>([])
  const [resultado, setResultado] = useState<CreateOrderResult | null>(null)
  const [ultimoPedido, setUltimoPedido] = useState<UltimoPedido | null>(null)
  const [hidratado, setHidratado] = useState(false)
  const [enviando, iniciarEnvio] = useTransition()

  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem(CLAVE_STORAGE)
      if (guardado) setLineas(JSON.parse(guardado))
    } catch {
      // localStorage no disponible o el dato guardado está corrupto: seguimos con carrito vacío.
    }
    try {
      const guardado = window.localStorage.getItem(CLAVE_ULTIMO_PEDIDO)
      if (guardado) setUltimoPedido(JSON.parse(guardado))
    } catch {
      // Sin "pedido de siempre" guardado, simplemente no se ofrece la opción.
    }
    setHidratado(true)
  }, [])

  useEffect(() => {
    if (!hidratado) return
    try {
      window.localStorage.setItem(CLAVE_STORAGE, JSON.stringify(lineas))
    } catch {
      // Sin persistencia el carrito sigue funcionando en memoria durante la sesión.
    }
  }, [lineas, hidratado])

  const agregar = useCallback((nueva: Omit<CartLine, 'lineId'>) => {
    setResultado(null)
    setLineas((actuales) => {
      const firma = firmaLinea(nueva)
      const existente = actuales.find((l) => firmaLinea(l) === firma)

      if (existente) {
        return actuales.map((l) =>
          l.lineId === existente.lineId ? { ...l, cantidad: Math.min(50, l.cantidad + nueva.cantidad) } : l,
        )
      }

      return [...actuales, { ...nueva, lineId: `${firma}-${actuales.length}-${Date.now()}` }]
    })
  }, [])

  const cambiarCantidad = useCallback((lineId: string, cantidad: number) => {
    setResultado(null)
    if (cantidad < 1) {
      setLineas((actuales) => actuales.filter((l) => l.lineId !== lineId))
      return
    }
    setLineas((actuales) =>
      actuales.map((l) => (l.lineId === lineId ? { ...l, cantidad: Math.min(50, cantidad) } : l)),
    )
  }, [])

  const eliminar = useCallback((lineId: string) => {
    setResultado(null)
    setLineas((actuales) => actuales.filter((l) => l.lineId !== lineId))
  }, [])

  const editarLinea = useCallback((lineId: string, cambios: CambiosLinea) => {
    setResultado(null)
    setLineas((actuales) => {
      const actual = actuales.find((l) => l.lineId === lineId)
      if (!actual) return actuales

      const actualizada: CartLine = { ...actual, ...cambios }
      const otras = actuales.filter((l) => l.lineId !== lineId)
      const firma = firmaLinea(actualizada)
      const existente = otras.find((l) => firmaLinea(l) === firma)

      if (existente) {
        return otras.map((l) =>
          l.lineId === existente.lineId ? { ...l, cantidad: Math.min(50, l.cantidad + actual.cantidad) } : l,
        )
      }

      return [...otras, actualizada]
    })
  }, [])

  const confirmar = useCallback(
    (cliente: DatosCliente) => {
      iniciarEnvio(async () => {
        const respuesta = await createOrder({
          cliente,
          lineas: lineas.map((l) => ({
            menuItemId: l.menuItemId,
            cantidad: l.cantidad,
            salsas: l.salsas,
            adicionIds: l.adiciones.map((a) => a.id),
            ingredientesQuitados: l.ingredientesQuitados,
          })),
        })

        setResultado(respuesta)
        if (respuesta.ok) {
          const snapshot: UltimoPedido = {
            lineas,
            cliente: {
              nombre: cliente.nombre,
              telefono: cliente.telefono,
              telefonoAlterno: cliente.telefonoAlterno,
              sedeId: cliente.sedeId,
              tipoEntrega: cliente.tipoEntrega,
              direccion: cliente.direccion,
              unidad: cliente.unidad,
            },
          }
          setUltimoPedido(snapshot)
          try {
            window.localStorage.setItem(CLAVE_ULTIMO_PEDIDO, JSON.stringify(snapshot))
          } catch {
            // Sin persistencia no se podrá ofrecer "pedir lo mismo" luego, pero el pedido actual ya quedó guardado en Supabase.
          }
          setLineas([])
        }
      })
    },
    [lineas],
  )

  const nuevoPedido = useCallback(() => {
    setResultado(null)
    setLineas([])
  }, [])

  // Repone el carrito con las líneas del último pedido exitoso (ids de línea
  // nuevos para no chocar con nada que quede en el carrito actual).
  const repetirUltimoPedido = useCallback(() => {
    if (!ultimoPedido) return
    setResultado(null)
    setLineas(ultimoPedido.lineas.map((linea, indice) => ({ ...linea, lineId: `repetir-${indice}-${Date.now()}` })))
  }, [ultimoPedido])

  const value = useMemo<CartContextValue>(
    () => ({
      lineas,
      resultado,
      enviando,
      agregar,
      cambiarCantidad,
      eliminar,
      editarLinea,
      confirmar,
      nuevoPedido,
      ultimoPedido,
      repetirUltimoPedido,
    }),
    [
      lineas,
      resultado,
      enviando,
      agregar,
      cambiarCantidad,
      eliminar,
      editarLinea,
      confirmar,
      nuevoPedido,
      ultimoPedido,
      repetirUltimoPedido,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const contexto = useContext(CartContext)
  if (!contexto) throw new Error('useCart debe usarse dentro de <CartProvider>')
  return contexto
}
