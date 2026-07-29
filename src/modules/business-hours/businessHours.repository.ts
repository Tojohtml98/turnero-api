import BusinessHours, { WeekSchedule } from './businessHours.model'

const DEFAULT_HOURS: WeekSchedule = {
  sun: { open: '09:00', close: '13:00', closed: true },
  mon: { open: '09:00', close: '18:00', closed: false },
  tue: { open: '09:00', close: '18:00', closed: false },
  wed: { open: '09:00', close: '18:00', closed: false },
  thu: { open: '09:00', close: '18:00', closed: false },
  fri: { open: '09:00', close: '18:00', closed: false },
  sat: { open: '09:00', close: '13:00', closed: false },
}

// Singleton: siempre hay como maximo un documento. Si no existe, se crea
// con un horario comercial razonable por defecto (editable desde el admin).
const getOrCreate = async () => {
  let doc = await BusinessHours.findOne()
  if (!doc) {
    doc = await BusinessHours.create({ hours: DEFAULT_HOURS, slotStepMinutes: 30 })
  }
  return doc
}

interface UpdateInput {
  hours?: Partial<WeekSchedule>
  slotStepMinutes?: number
}

const update = async (data: UpdateInput) => {
  const current = await getOrCreate()
  if (data.hours) {
    current.hours = { ...current.hours, ...data.hours }
  }
  if (data.slotStepMinutes !== undefined) {
    current.slotStepMinutes = data.slotStepMinutes
  }
  await current.save()
  return current
}

export default { getOrCreate, update, DEFAULT_HOURS }
