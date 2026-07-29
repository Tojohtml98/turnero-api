import { parseNaturalDate, parseNaturalTime, normalize } from '../../../lib/naturalDate'
import { IntentContext, IntentParser, ParsedIntent, sanitizeIntent } from '../intent.types'

// Parser deterministico: mismo texto, misma salida, sin red y sin IA. Es el
// que usan los tests (por eso el CI no depende de ningun servicio externo) y
// tambien el piso de produccion: no puede quedar caido ni cambiar de opinion.

// Palabras que nunca son parte del nombre de un servicio.
const STOPWORDS = new Set([
  'quiero',
  'querria',
  'queria',
  'necesito',
  'me',
  'gustaria',
  'reservar',
  'sacar',
  'pedir',
  'dar',
  'un',
  'una',
  'el',
  'la',
  'los',
  'las',
  'para',
  'por',
  'favor',
  'turno',
  'turnos',
  'cita',
  'hora',
  'horario',
  'de',
  'del',
  'a',
  'al',
  'en',
  'con',
  'hoy',
  'manana',
  'tarde',
  'noche',
  'pasado',
  'proximo',
  'proxima',
  'que',
  'viene',
  'si',
  'puede',
  'ser',
  'dale',
  'gracias',
  'hola',
  'buenas',
  'gustaria',
  'tenes',
  'tienen',
  'hay',
  'disponible',
  'lugar',
])

const WEEKDAYS_ES = [
  'domingo',
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
]

const MONTHS_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'setiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

// Saca la puntuacion de los extremos de cada palabra. Sin esto "buenas," no
// matchea la stopword "buenas" y termina colandose como nombre de servicio.
// Se limpian solo los extremos para no romper "15.30" ni "05/08".
const tokenize = (input: string): string[] =>
  input
    .split(' ')
    .map((word) => word.replace(/^[.,;:!?¿¡"'()]+|[.,;:!?¿¡"'()]+$/g, ''))
    .filter((word) => word.length > 0)

const isNoise = (word: string): boolean =>
  STOPWORDS.has(word) ||
  WEEKDAYS_ES.includes(word) ||
  MONTHS_ES.includes(word) ||
  /^\d+$/.test(word) ||
  /^\d{1,2}[:.]\d{2}$/.test(word) ||
  /^\d{1,2}(hs|h)$/.test(word) ||
  word.length < 3

// Match contra el catalogo real. Se prueba primero el nombre completo y
// despues palabra por palabra, asi "quiero un corte de pelo" encuentra
// "Corte de pelo" y tambien "Corte".
const matchCatalog = (input: string, serviceNames: string[]): string | null => {
  const words = tokenize(input)

  const byFullName = serviceNames.find((name) => input.includes(normalize(name)))
  if (byFullName) return byFullName

  const byWord = serviceNames.find((name) => {
    const nameWords = tokenize(normalize(name)).filter((w) => !isNoise(w))
    return nameWords.length > 0 && nameWords.some((w) => words.includes(w))
  })

  return byWord ?? null
}

// Sin catalogo (o sin match), se intenta leer el servicio de la forma en que
// la gente lo dice: "turno de corte", "turno para barba".
const extractFromPhrasing = (input: string): string | null => {
  const phrase = input.match(/\b(?:turno|cita|hora)\s+(?:de|para|del)\s+([a-z]+(?:\s+de\s+[a-z]+)?)/)
  if (phrase) {
    const candidate = tokenize(phrase[1])
      .filter((word) => !isNoise(word))
      .join(' ')
      .trim()
    if (candidate.length > 0) return candidate
  }

  // Ultimo recurso: la primera palabra que no sea ruido.
  const leftover = tokenize(input).find((word) => !isNoise(word))
  return leftover ?? null
}

export class RulesIntentParser implements IntentParser {
  readonly name = 'rules'

  async parseIntent(text: string, context: IntentContext = {}): Promise<ParsedIntent> {
    const input = normalize(text)
    const now = context.now ?? new Date()
    const catalog = context.serviceNames ?? []

    const service = matchCatalog(input, catalog) ?? extractFromPhrasing(input)

    return sanitizeIntent({
      service,
      date: parseNaturalDate(text, now),
      time: parseNaturalTime(text),
    })
  }
}

export default new RulesIntentParser()
