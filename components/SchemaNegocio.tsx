import { SEDES } from '@/lib/sedes'

/** Datos estructurados (JSON-LD) para que buscadores y asistentes de IA
 *  (Google AI Overviews, ChatGPT, Perplexity, Gemini) entiendan qué es Street
 *  Fries, dónde opera y qué preguntas responde, sin tener que inferirlo del
 *  texto visible. Las sedes salen de `lib/sedes.ts`; `streetAddress` queda
 *  pendiente de la dirección real de cada local (ver TODO en ese archivo). */
export function SchemaNegocio() {
  const negocio = {
    '@context': 'https://schema.org',
    '@type': 'FoodEstablishment',
    name: 'Street Fries',
    description:
      'Papas artesanales con preparaciones gourmet en el sur del Valle de Aburrá. Más de 20 toneladas de papa servidas al mes desde 2020.',
    servesCuisine: 'Papas gourmet / Street food',
    priceRange: '$$',
    foundingDate: '2020-11',
    sameAs: [
      'https://instagram.com/streetfriescol',
      'https://facebook.com/streetfriescol',
      'https://tiktok.com/@streetfriescol',
    ],
    location: SEDES.map((sede) => ({
      '@type': 'Place',
      name: `Street Fries - ${sede.nombre}`,
      telephone: `+${sede.whatsapp}`,
      address: {
        '@type': 'PostalAddress',
        // La sede "florida" todavía no tiene dirección confirmada — queda
        // sin streetAddress hasta que se complete (ver TODO en lib/sedes.ts).
        ...(sede.direccion ? { streetAddress: sede.direccion } : {}),
        addressLocality: sede.ciudad,
        addressRegion: 'Antioquia',
        addressCountry: 'CO',
      },
    })),
  }

  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: PREGUNTAS_FRECUENTES.map((p) => ({
      '@type': 'Question',
      name: p.pregunta,
      acceptedAnswer: { '@type': 'Answer', text: p.respuesta },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(negocio) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />
    </>
  )
}

export const PREGUNTAS_FRECUENTES: { pregunta: string; respuesta: string }[] = [
  {
    pregunta: '¿Dónde están ubicados?',
    respuesta: `Street Fries tiene ${SEDES.length} sedes en Sabaneta, Envigado, Itagüí, Medellín y Florida: ${SEDES.map((s) => s.nombre).join(', ')}. Al hacer tu pedido en línea eliges la sede más cercana y el mensaje de confirmación se envía por WhatsApp directo a ese local.`,
  },
  {
    pregunta: '¿Hacen domicilios?',
    respuesta:
      'Sí, cada sede hace domicilio. También puedes elegir recoger en el local. El tiempo de entrega y el valor del domicilio se confirman por WhatsApp una vez envías el pedido.',
  },
  {
    pregunta: '¿Cómo hago mi pedido?',
    respuesta:
      'Armas tu pedido en la página eligiendo plato, ingredientes, salsas y adiciones, confirmas tus datos de entrega y la sede más cercana, y al finalizar se abre WhatsApp con el resumen ya redactado para confirmar con el local.',
  },
  {
    pregunta: '¿Cuál es el plato insignia de Street Fries?',
    respuesta:
      'El Tostón de Queso, disponible como adición en cualquier plato de papas, con una variante "Entocinetado" (con tocineta). Es el producto más pedido de la casa.',
  },
  {
    pregunta: '¿Cuántas salsas tienen?',
    respuesta:
      'Street Fries tiene 18 salsas agrupadas en Tradicionales, Del Chef y Especiales, sin límite de cantidad por plato.',
  },
  {
    pregunta: '¿El precio que veo en el carrito es el precio final?',
    respuesta:
      'El subtotal mostrado es informativo y no incluye el domicilio. El precio final y el tiempo de entrega o recogida se confirman por WhatsApp con el local elegido.',
  },
]
