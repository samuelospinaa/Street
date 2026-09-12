type Ventana = { conteo: number; expira: number }

// En memoria, por instancia: en Vercel cada función serverless tiene su
// propio conteo (no hay proceso persistente ni Redis en este proyecto), así
// que esto es una defensa "best effort" contra ráfagas de un mismo
// cliente/bot golpeando un endpoint, no un límite agregado exacto entre
// instancias. Para el tráfico de un solo local es suficiente sin depender de
// infraestructura externa; si el tráfico crece a multi-región, migrar a algo
// como Upstash Redis (@upstash/ratelimit).
const ventanas = new Map<string, Ventana>()

// Evita que el Map crezca sin límite mientras la instancia sigue caliente.
function limpiar(ahora: number) {
  if (ventanas.size < 1000) return
  for (const [clave, v] of ventanas) {
    if (v.expira <= ahora) ventanas.delete(clave)
  }
}

export type ResultadoLimite = { permitido: boolean; reintentarEnMs: number }

/** Limitador de ventana fija: `limite` solicitudes por `ventanaMs` para una `clave` dada. */
export function limitarTasa(clave: string, limite: number, ventanaMs: number): ResultadoLimite {
  const ahora = Date.now()
  limpiar(ahora)

  const actual = ventanas.get(clave)
  if (!actual || actual.expira <= ahora) {
    ventanas.set(clave, { conteo: 1, expira: ahora + ventanaMs })
    return { permitido: true, reintentarEnMs: 0 }
  }

  if (actual.conteo >= limite) {
    return { permitido: false, reintentarEnMs: actual.expira - ahora }
  }

  actual.conteo += 1
  return { permitido: true, reintentarEnMs: 0 }
}

/** IP del cliente a partir de los headers que pone el proxy (Vercel u otro). */
export function ipDesdeHeaders(headers: Pick<Headers, 'get'>): string {
  const reenviado = headers.get('x-forwarded-for')
  if (reenviado) return reenviado.split(',')[0].trim()
  return headers.get('x-real-ip')?.trim() || 'desconocida'
}
