const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'

/**
 * Modelo por defecto: GPT-OSS 120B en Groq (`openai/gpt-oss-120b`).
 *
 * Para un asistente de mesa/menú (responder sobre precios, ingredientes,
 * salsas y el flujo de pedido en español, con el volumen de tráfico de un
 * solo local) el costo absoluto es despreciable con cualquier modelo de
 * Groq — lo que de verdad importa es que no invente productos ni precios.
 * De los modelos de texto que este proyecto tiene habilitados en Groq, el
 * 120B es el que mejor sigue instrucciones y contexto largo (el menú
 * completo va en el system prompt), sigue costando centavos por cada mil
 * conversaciones ($0.15 / $0.60 por millón de tokens) y en Groq responde en
 * menos de un segundo. Se deja configurable por env var por si el modelo se
 * retira o cambia el catálogo disponible.
 */
export const MODELO_ASISTENTE = process.env.GROQ_MODEL?.trim() || 'openai/gpt-oss-120b'

export type MensajeChat = { role: 'system' | 'user' | 'assistant'; content: string }

/** Groq devolvió 429 (límite de tokens/minuto de la cuenta): vale la pena
 *  distinguirlo para mostrarle al cliente un mensaje claro de "espera un poco"
 *  en vez del error genérico. */
export class ErrorLimiteGroq extends Error {}

/** Llama a la API de chat completions de Groq (compatible con la de OpenAI). */
export async function pedirRespuestaGroq(mensajes: MensajeChat[]): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('Falta GROQ_API_KEY en las variables de entorno.')

  const respuesta = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODELO_ASISTENTE,
      messages: mensajes,
      temperature: 0.5,
      max_tokens: 400,
      // gpt-oss es un modelo "razonador": sin esto gasta buena parte del
      // presupuesto de tokens pensando en vez de respondiendo, y con
      // preguntas más largas puede llegar a cortar la respuesta a cero.
      reasoning_effort: 'low',
    }),
  })

  if (!respuesta.ok) {
    const texto = await respuesta.text().catch(() => '')
    if (respuesta.status === 429) {
      throw new ErrorLimiteGroq(`Groq respondió 429: ${texto.slice(0, 300)}`)
    }
    throw new Error(`Groq respondió ${respuesta.status}: ${texto.slice(0, 300)}`)
  }

  const data: unknown = await respuesta.json()
  const contenido = (data as { choices?: { message?: { content?: string } }[] })?.choices?.[0]?.message?.content

  if (typeof contenido !== 'string' || !contenido.trim()) {
    throw new Error('Groq no devolvió contenido.')
  }

  return contenido.trim()
}
