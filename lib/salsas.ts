import type { Salsa } from './types'

/**
 * Normaliza un nombre de salsa para poder cruzar `salsas_recomendadas` (texto
 * libre copiado de la carta) contra la tabla `salsas`, donde los nombres están
 * escritos de otra forma: sin acentos, sin mayúsculas, sin el prefijo "Salsa "
 * y con las palabras ordenadas — así "Maíz dulce" y "Dulce Maíz" resuelven a
 * la misma salsa.
 */
export function normalizarNombreSalsa(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/^salsa\s+/, '')
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ')
}

/**
 * Ids de las salsas recomendadas de un producto, para preseleccionarlas en la
 * tarjeta. Un nombre recomendado que no exista en la tabla `salsas` se ignora:
 * solo se preselecciona lo que el cliente puede ver y quitar en el desplegable.
 */
export function idsSalsasRecomendadas(recomendadas: string[] | null, salsas: Salsa[]): string[] {
  if (!recomendadas || recomendadas.length === 0) return []

  const porNombre = new Map(salsas.map((s) => [normalizarNombreSalsa(s.nombre), s.id]))

  return Array.from(
    new Set(
      recomendadas
        .map((nombre) => porNombre.get(normalizarNombreSalsa(nombre)))
        .filter((id): id is string => Boolean(id)),
    ),
  )
}
