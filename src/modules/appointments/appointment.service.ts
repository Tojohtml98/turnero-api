import serviceRepo from '../services/service.repository'
import businessHoursRepo from '../business-hours/businessHours.repository'
import { WEEKDAYS } from '../business-hours/businessHours.model'
import appointmentRepo, { AppointmentInput } from './appointment.repository'
import { AppointmentStatus } from './appointment.model'
import { AppError } from '../../middleware/errorHandler'
import { getAvailableSlots, combineDateAndTime, formatTime } from '../../lib/slots'
import { sendConfirmationEmail } from '../../lib/mailer'

const parseDate = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const dayStart = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate())
const dayEnd = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)

const getAvailability = async (serviceId: string, dateStr: string): Promise<string[]> => {
  const service = await serviceRepo.findById(serviceId)
  if (!service || !service.active) throw new AppError('Service not found', 404)

  const date = parseDate(dateStr)
  const businessHours = await businessHoursRepo.getOrCreate()
  const daySchedule = businessHours.hours[WEEKDAYS[date.getDay()]]

  const existing = await appointmentRepo.findActiveInRange(dayStart(date), dayEnd(date))
  const busy = existing.map((a) => ({ start: a.startAt, end: a.endAt }))

  const slots = getAvailableSlots({
    date,
    daySchedule,
    durationMinutes: service.durationMinutes,
    slotStepMinutes: businessHours.slotStepMinutes,
    busy,
  })

  return slots.map(formatTime)
}

interface BookInput {
  serviceId: string
  date: string
  time: string
  customerName: string
  customerPhone: string
  customerEmail?: string
}

const book = async (input: BookInput) => {
  const service = await serviceRepo.findById(input.serviceId)
  if (!service || !service.active) throw new AppError('Service not found', 404)

  const date = parseDate(input.date)
  const startAt = combineDateAndTime(date, input.time)
  const endAt = new Date(startAt.getTime() + service.durationMinutes * 60_000)

  if (startAt < new Date()) throw new AppError('Cannot book a time in the past', 400)

  const businessHours = await businessHoursRepo.getOrCreate()
  const daySchedule = businessHours.hours[WEEKDAYS[date.getDay()]]
  if (daySchedule.closed) throw new AppError('Business is closed that day', 400)

  const openAt = combineDateAndTime(date, daySchedule.open)
  const closeAt = combineDateAndTime(date, daySchedule.close)
  if (startAt < openAt || endAt > closeAt) throw new AppError('Outside business hours', 400)

  // Re-chequeo contra condiciones de carrera: puede haber pasado tiempo entre
  // que el cliente vio el horario libre y confirmo la reserva.
  const overlapping = await appointmentRepo.findActiveInRange(startAt, endAt)
  if (overlapping.length > 0) throw new AppError('That time is no longer available', 409)

  const appointment = await appointmentRepo.create({
    service: input.serviceId,
    serviceName: service.name,
    durationMinutes: service.durationMinutes,
    price: service.price,
    startAt,
    endAt,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    customerEmail: input.customerEmail || '',
  })

  if (appointment.customerEmail) {
    // El envio de mail nunca debe romper la reserva si falla.
    sendConfirmationEmail({
      customerEmail: appointment.customerEmail,
      customerName: appointment.customerName,
      serviceName: appointment.serviceName,
      startAt: appointment.startAt,
    }).catch(() => {})
  }

  return appointment
}

const listAdmin = (filter: { from?: string; to?: string; status?: AppointmentStatus }) =>
  appointmentRepo.findMany({
    from: filter.from ? parseDate(filter.from) : undefined,
    to: filter.to ? dayEnd(parseDate(filter.to)) : undefined,
    status: filter.status,
  })

interface UpdateInput {
  status?: AppointmentStatus
  date?: string
  time?: string
  notes?: string
}

const update = async (id: string, data: UpdateInput) => {
  const appointment = await appointmentRepo.findById(id)
  if (!appointment) throw new AppError('Appointment not found', 404)

  const patch: Partial<AppointmentInput> & { status?: AppointmentStatus; notes?: string } = {}

  if (data.date && data.time) {
    const date = parseDate(data.date)
    const startAt = combineDateAndTime(date, data.time)
    const endAt = new Date(startAt.getTime() + appointment.durationMinutes * 60_000)

    const overlapping = await appointmentRepo.findActiveInRange(startAt, endAt, id)
    if (overlapping.length > 0) throw new AppError('That time is no longer available', 409)

    patch.startAt = startAt
    patch.endAt = endAt
  }

  if (data.status) patch.status = data.status
  if (data.notes !== undefined) patch.notes = data.notes

  const updated = await appointmentRepo.update(id, patch)
  if (!updated) throw new AppError('Appointment not found', 404)
  return updated
}

export default { getAvailability, book, listAdmin, update }
