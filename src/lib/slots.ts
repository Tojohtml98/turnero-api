// Logica pura de calculo de horarios disponibles. Sin DB, sin Express:
// solo fechas y numeros adentro, numeros y fechas afuera. Facil de testear
// y facil de reusar si el front necesita recalcular algo.

export interface DaySchedule {
  open: string // "HH:mm"
  close: string // "HH:mm"
  closed: boolean
}

export interface BusyRange {
  start: Date
  end: Date
}

export interface GetAvailableSlotsParams {
  date: Date // dia consultado (solo se usa year/month/day)
  daySchedule: DaySchedule
  durationMinutes: number
  slotStepMinutes: number
  busy: BusyRange[]
  now?: Date // inyectable para tests; default = new Date()
}

// Combina un dia (year/month/day de `date`) con una hora "HH:mm" en un Date nuevo.
export const combineDateAndTime = (date: Date, time: string): Date => {
  const [hours, minutes] = time.split(':').map(Number)
  const combined = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  combined.setHours(hours, minutes, 0, 0)
  return combined
}

const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean =>
  aStart < bEnd && aEnd > bStart

export const getAvailableSlots = ({
  date,
  daySchedule,
  durationMinutes,
  slotStepMinutes,
  busy,
  now = new Date(),
}: GetAvailableSlotsParams): Date[] => {
  if (daySchedule.closed) return []
  if (durationMinutes <= 0 || slotStepMinutes <= 0) return []

  const openAt = combineDateAndTime(date, daySchedule.open)
  const closeAt = combineDateAndTime(date, daySchedule.close)
  if (openAt >= closeAt) return []

  const slots: Date[] = []
  const durationMs = durationMinutes * 60_000
  const stepMs = slotStepMinutes * 60_000

  for (let start = openAt.getTime(); start + durationMs <= closeAt.getTime(); start += stepMs) {
    const slotStart = new Date(start)
    const slotEnd = new Date(start + durationMs)

    if (slotStart < now) continue

    const isBusy = busy.some((b) => overlaps(slotStart, slotEnd, b.start, b.end))
    if (isBusy) continue

    slots.push(slotStart)
  }

  return slots
}

// "HH:mm" en horario local, para la respuesta de la API.
export const formatTime = (date: Date): string =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
