import Appointment, { AppointmentStatus } from './appointment.model'

export interface AppointmentInput {
  service: string
  serviceName: string
  durationMinutes: number
  price: number
  startAt: Date
  endAt: Date
  customerName: string
  customerPhone: string
  customerEmail?: string
}

const create = (data: AppointmentInput) => Appointment.create(data)

const findById = (id: string) => Appointment.findById(id)

// Turnos "activos" (no cancelados) que se solapan con un rango dado.
// Se usa tanto para calcular disponibilidad como para validar una reserva
// nueva contra condiciones de carrera (dos personas reservando a la vez).
const findActiveInRange = (start: Date, end: Date, excludeId?: string) => {
  const query: Record<string, unknown> = {
    status: { $ne: 'cancelled' },
    startAt: { $lt: end },
    endAt: { $gt: start },
  }
  if (excludeId) query._id = { $ne: excludeId }
  return Appointment.find(query).sort({ startAt: 1 })
}

const findMany = (filter: { from?: Date; to?: Date; status?: AppointmentStatus }) => {
  const query: Record<string, unknown> = {}
  if (filter.from || filter.to) {
    query.startAt = {
      ...(filter.from && { $gte: filter.from }),
      ...(filter.to && { $lt: filter.to }),
    }
  }
  if (filter.status) query.status = filter.status
  return Appointment.find(query).sort({ startAt: 1 })
}

const update = (id: string, data: Partial<AppointmentInput> & { status?: AppointmentStatus; notes?: string }) =>
  Appointment.findByIdAndUpdate(id, data, { returnDocument: 'after', runValidators: true })

export default { create, findById, findActiveInRange, findMany, update }
