// Contrato de la capa de lenguaje natural. La API habla contra esta interfaz
// y nunca contra un proveedor concreto: cambiar de motor es cambiar una
// variable de entorno, no tocar el service ni el controller.

export interface ParsedIntent {
  /** Servicio pedido, tal como se pudo identificar en el texto. */
  service: string | null
  /** Fecha en YYYY-MM-DD, o null si el texto no la menciona. */
  date: string | null
  /** Hora en HH:mm (24h), o null si el texto no la menciona. */
  time: string | null
}

export interface IntentContext {
  /** Catalogo de servicios activos, para que el parser matchee contra lo real. */
  serviceNames?: string[]
  /** Inyectable para tests y para resolver relativos ("manana") sin sorpresas. */
  now?: Date
}

export interface IntentParser {
  /** Identifica al motor en la respuesta de la API y en los logs. */
  readonly name: string
  parseIntent(text: string, context?: IntentContext): Promise<ParsedIntent>
}

export const EMPTY_INTENT: ParsedIntent = { service: null, date: null, time: null }

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/

/**
 * Filtro de salida comun a todos los parsers. Un LLM puede devolver
 * "manana", "3pm" o "2026-13-45" con total naturalidad; nada de eso debe
 * llegar al resto de la API, que espera YYYY-MM-DD y HH:mm o null.
 */
export const sanitizeIntent = (intent: Partial<ParsedIntent>): ParsedIntent => {
  const date = typeof intent.date === 'string' && ISO_DATE.test(intent.date) ? intent.date : null
  const time = typeof intent.time === 'string' && HH_MM.test(intent.time) ? intent.time : null
  const service =
    typeof intent.service === 'string' && intent.service.trim().length > 0
      ? intent.service.trim()
      : null

  // Una fecha con formato valido pero imposible (2026-02-30) pasa el regex.
  if (date) {
    const [y, m, d] = date.split('-').map(Number)
    const check = new Date(y, m - 1, d)
    if (check.getMonth() !== m - 1 || check.getDate() !== d) {
      return { service, date: null, time }
    }
  }

  return { service, date, time }
}
