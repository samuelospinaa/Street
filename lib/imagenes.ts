/**
 * Encuadre por producto.
 *
 * Las fotos vienen recortadas de la carta impresa y cada una arrastra algo que
 * no debe verse en la tarjeta: el título "FRIES OXFORD STREET" en la foto de
 * Vía Nassa, un párrafo de la carta en el borde izquierdo de Ocean Drive,
 * marcas de recorte en los bordes, la esquina de otra foto en Oxford Street.
 *
 * Aquí se define, para cada imagen, cuánto acercar y qué parte conservar dentro
 * del marco 4:3 de la tarjeta. Los archivos originales no se tocan.
 */
export type Encuadre = { escala: number; posicion: string }

export const ENCUADRE_POR_DEFECTO: Encuadre = { escala: 1.06, posicion: '50% 50%' }

export const ENCUADRES: Record<string, Encuadre> = {
  // El título de la carta ocupa la esquina inferior derecha: nos quedamos arriba.
  'fries-via-nassa': { escala: 1.55, posicion: '45% 5%' },
  // Esquina de otra foto arriba a la derecha + marca de recorte abajo.
  'fries-oxford-street': { escala: 1.12, posicion: '45% 45%' },
  // Línea blanca de recorte en el borde superior y marcas a la izquierda.
  'fries-broadway': { escala: 1.1, posicion: '52% 55%' },
  // Salsa cortada y marca de recorte pegadas al borde izquierdo.
  'fries-las-vegas-strip': { escala: 1.15, posicion: '60% 45%' },
  // La mitad inferior es mesa vacía con un bowl cortado: nos quedamos arriba.
  'fries-caminito': { escala: 1.15, posicion: '48% 15%' },
  // Restos de texto de la carta en el borde izquierdo.
  'fries-ocean-drive': { escala: 1.18, posicion: '70% 45%' },
}

export function encuadreDe(id: string): Encuadre {
  return ENCUADRES[id] ?? ENCUADRE_POR_DEFECTO
}

/** Recorte de la cara de la mascota (mascota-estatua.jpg) para el botón
 *  circular del asistente: solo la corona + la cara con gafas, sin el brazo
 *  ni el cono de papas que sostiene arriba a la izquierda. */
export const ENCUADRE_ASISTENTE: Encuadre = { escala: 1.85, posicion: '60% 27%' }
