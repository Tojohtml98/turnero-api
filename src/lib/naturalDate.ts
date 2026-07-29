// Normalizacion de fechas y horas dichas en español a los formatos que ya
// usa la API (YYYY-MM-DD y HH:mm). Logica pura: texto adentro, strings
// afuera. Sin DB, sin Express y sin IA — la usan tanto el parser
// deterministico como los parsers con LLM para normalizar lo que devuelven.

const MONTHS: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
}

// Indice igual al de Date.getDay() y al de WEEKDAYS del modelo (0 = domingo).
const WEEKDAY_NAMES: Record<string, number> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
}

const pad2 = (n: number): string => String(n).padStart(2, '0')

const toIsoDate = (date: Date): string =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`

const addDays = (from: Date, days: number): Date => {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  date.setDate(date.getDate() + days)
  return date
}

// Minusculas y sin tildes, para poder matchear "miércoles" y "miercoles" con
// el mismo patron. Ojo que esto convierte la ñ en n: "mañana" -> "manana".
export const normalize = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

// "manana" es ambiguo: puede ser el dia siguiente o la franja horaria. Si
// viene precedido de un articulo ("a la manana", "por la manana") es la
// franja; si va solo, es el dia siguiente.
const MORNING_PHRASE = /\b(?:de|por|a|en)\s+la\s+manana\b/
const AFTERNOON_PHRASE = /\b(?:de|por|a|en)\s+la\s+tarde\b/
const NIGHT_PHRASE = /\b(?:de|por|a|en)\s+la\s+noche\b/

// Saca las frases de franja horaria antes de buscar la fecha. Sin esto,
// "manana a las 10 de la manana" perderia el dia: la frase de franja apagaria
// el chequeo del "manana" que si era el dia siguiente.
const stripTimeBands = (input: string): string =>
  input
    .replace(/\b(?:de|por|a|en)\s+la\s+(?:manana|tarde|noche)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const isValidDayForMonth = (day: number, month: number, year: number): boolean => {
  const date = new Date(year, month - 1, day)
  return date.getMonth() === month - 1 && date.getDate() === day
}

// Arma una fecha dia/mes eligiendo el año que la deje en el futuro: si el
// cliente dice "5 de enero" en diciembre, se refiere al enero que viene.
const resolveDayMonth = (day: number, month: number, now: Date): string | null => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  for (const year of [now.getFullYear(), now.getFullYear() + 1]) {
    if (!isValidDayForMonth(day, month, year)) continue
    const candidate = new Date(year, month - 1, day)
    if (candidate >= today) return toIsoDate(candidate)
  }
  return null
}

/**
 * Devuelve la fecha en YYYY-MM-DD, o null si el texto no menciona ninguna.
 * Nunca devuelve una fecha pasada: los nombres de dia y las fechas sin año
 * se resuelven siempre hacia adelante.
 */
export const parseNaturalDate = (text: string, now: Date = new Date()): string | null => {
  const input = stripTimeBands(normalize(text))

  // 1. ISO explicito: 2026-08-05
  const iso = input.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)
  if (iso) {
    const [, y, m, d] = iso
    if (isValidDayForMonth(Number(d), Number(m), Number(y))) {
      return `${y}-${m}-${d}`
    }
    return null
  }

  // 2. Numerico: 5/8, 05/08/2026, 5-8
  const numeric = input.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/)
  if (numeric) {
    const day = Number(numeric[1])
    const month = Number(numeric[2])
    if (numeric[3]) {
      const raw = Number(numeric[3])
      const year = raw < 100 ? 2000 + raw : raw
      if (!isValidDayForMonth(day, month, year)) return null
      return toIsoDate(new Date(year, month - 1, day))
    }
    return resolveDayMonth(day, month, now)
  }

  // 3. "5 de agosto", "el 5 de ago"
  const written = input.match(/\b(\d{1,2}) de ([a-z]+)\b/)
  if (written) {
    const monthKey = Object.keys(MONTHS).find((name) => name.startsWith(written[2].slice(0, 3)))
    if (monthKey) return resolveDayMonth(Number(written[1]), MONTHS[monthKey], now)
  }

  // 4. Relativos. "pasado manana" antes que "manana" para que no lo tape.
  if (/\bpasado manana\b/.test(input)) return toIsoDate(addDays(now, 2))
  if (/\bhoy\b/.test(input)) return toIsoDate(addDays(now, 0))
  if (/\bmanana\b/.test(input)) return toIsoDate(addDays(now, 1))

  // 5. Nombre de dia: siempre la proxima ocurrencia futura, nunca hoy.
  for (const [name, index] of Object.entries(WEEKDAY_NAMES)) {
    if (!new RegExp(`\\b${name}s?\\b`).test(input)) continue
    const delta = (index - now.getDay() + 7) % 7
    return toIsoDate(addDays(now, delta === 0 ? 7 : delta))
  }

  return null
}

// Lleva una hora de reloj de 12 a formato 24 segun la franja mencionada. Sin
// franja explicita, 1-8 se interpreta como tarde: un negocio que abre 09-18
// no da turnos a las 3 de la madrugada.
const applyMeridiem = (hour: number, input: string): number => {
  const morning = MORNING_PHRASE.test(input) || /\bam\b/.test(input)
  const afternoon = AFTERNOON_PHRASE.test(input) || /\bpm\b/.test(input)
  const night = NIGHT_PHRASE.test(input)

  if (hour === 12 && morning) return 0
  if (hour === 12) return 12
  if (hour > 12) return hour

  if (morning) return hour
  if (afternoon || night) return hour + 12
  if (hour >= 1 && hour <= 8) return hour + 12
  return hour
}

/**
 * Devuelve la hora en HH:mm, o null si el texto no menciona ninguna.
 */
export const parseNaturalTime = (text: string): string | null => {
  const input = normalize(text)

  if (/\bmediodia\b/.test(input)) return '12:00'

  // 1. Hora con minutos explicitos: 15:30, 15.30, "15 30" no (demasiado ruido)
  const withMinutes = input.match(/\b(\d{1,2})[:.](\d{2})\b/)
  if (withMinutes) {
    const hour = Number(withMinutes[1])
    const minutes = Number(withMinutes[2])
    if (hour > 23 || minutes > 59) return null
    return `${pad2(applyMeridiem(hour, input))}:${pad2(minutes)}`
  }

  // 2. "3 y media", "3 y cuarto", "4 menos cuarto"
  const fraction = input.match(/\b(\d{1,2}) (y media|y cuarto|menos cuarto)\b/)
  if (fraction) {
    const base = Number(fraction[1])
    if (base > 23) return null
    if (fraction[2] === 'y media') return `${pad2(applyMeridiem(base, input))}:30`
    if (fraction[2] === 'y cuarto') return `${pad2(applyMeridiem(base, input))}:15`
    // "4 menos cuarto" = 15:45 si la franja lleva el 4 a las 16.
    const hour = applyMeridiem(base, input)
    return `${pad2((hour + 23) % 24)}:45`
  }

  // 3. Hora sola, pero solo si el texto la marca como hora ("a las 3", "15hs").
  const bare = input.match(/\b(?:a las?|las?|al?) (\d{1,2})\b|\b(\d{1,2})\s?(?:hs|h|horas)\b/)
  if (bare) {
    const hour = Number(bare[1] ?? bare[2])
    if (hour > 23) return null
    return `${pad2(applyMeridiem(hour, input))}:00`
  }

  return null
}
