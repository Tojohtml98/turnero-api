import { parseNaturalDate, parseNaturalTime } from '../../../lib/naturalDate'
import { IntentContext, ParsedIntent, sanitizeIntent } from '../intent.types'

// Lo que comparten los parsers con LLM: el prompt, la extraccion del JSON y
// la normalizacion de la respuesta. Cada proveedor solo aporta como se hace
// el pedido HTTP; nada de la logica de dominio vive en el adapter.

export const SYSTEM_PROMPT = `Sos un extractor de datos para un sistema de turnos.
Devolves UNICAMENTE un objeto JSON, sin texto alrededor y sin bloques de codigo.

Formato exacto:
{"service": string|null, "date": "YYYY-MM-DD"|null, "time": "HH:mm"|null}

Reglas:
- "date" siempre en YYYY-MM-DD. Resolve los relativos ("hoy", "manana", "el viernes") contra la fecha de hoy que te paso.
- "time" siempre en HH:mm de 24 horas. "3 de la tarde" es "15:00".
- Si el cliente dice una hora suelta entre 1 y 8 sin aclarar la franja, asumi la tarde: "a las 3" es "15:00".
- "service" es el servicio pedido. Si te paso un catalogo, elegi el nombre del catalogo que mejor coincida, copiado tal cual.
- Lo que no este en el texto va null. No inventes ni completes con valores por defecto.`

export const buildUserPrompt = (text: string, context: IntentContext): string => {
  const now = context.now ?? new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`
  const catalog = context.serviceNames?.length
    ? `\nCatalogo de servicios: ${context.serviceNames.join(', ')}`
    : ''

  return `Hoy es ${today}.${catalog}\n\nMensaje del cliente: "${text}"`
}

/**
 * Saca el primer objeto JSON del texto que devolvio el modelo. Los modelos
 * chicos suelen envolver la respuesta en ```json o agregar una frase antes,
 * asi que no alcanza con JSON.parse a secas.
 */
export const extractJson = (raw: string): Record<string, unknown> | null => {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced ? fenced[1] : raw

  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) return null

  try {
    const parsed: unknown = JSON.parse(candidate.slice(start, end + 1))
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
    return null
  } catch {
    return null
  }
}

/**
 * Convierte la respuesta cruda del modelo en un ParsedIntent confiable.
 *
 * Si el modelo devolvio la fecha u hora sin normalizar ("manana", "3pm"), se
 * intenta rescatarla con el parser deterministico antes de descartarla. Lo que
 * no se puede normalizar queda en null: preferimos un campo vacio que el
 * front pueda repreguntar antes que una fecha inventada.
 */
export const toIntent = (raw: string, text: string, context: IntentContext): ParsedIntent => {
  const json = extractJson(raw)
  if (!json) return sanitizeIntent({})

  const now = context.now ?? new Date()
  const asString = (value: unknown): string | null =>
    typeof value === 'string' && value.trim().length > 0 ? value.trim() : null

  const rawDate = asString(json.date)
  const rawTime = asString(json.time)

  const clean = sanitizeIntent({
    service: asString(json.service),
    date: rawDate,
    time: rawTime,
  })

  return {
    service: clean.service,
    date: clean.date ?? (rawDate ? parseNaturalDate(rawDate, now) : null),
    time: clean.time ?? (rawTime ? parseNaturalTime(rawTime) : null),
  }
}

export class IntentParserError extends Error {
  constructor(parser: string, cause: string) {
    super(`[${parser}] ${cause}`)
  }
}

/** fetch con timeout: un Ollama colgado no debe colgar el request HTTP. */
export const postJson = async (
  url: string,
  body: unknown,
  headers: Record<string, string>,
  timeoutMs: number
): Promise<Record<string, unknown>> => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  })

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`)
  }

  return (await res.json()) as Record<string, unknown>
}
