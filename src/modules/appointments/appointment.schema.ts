import { z } from 'zod'

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD format')
const timeOnly = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:mm format')

export const availabilityQuerySchema = z.object({
  serviceId: z.string().min(1, 'serviceId is required'),
  date: dateOnly,
})

export const createAppointmentSchema = z.object({
  serviceId: z.string().min(1, 'serviceId is required'),
  date: dateOnly,
  time: timeOnly,
  customerName: z.string().trim().min(1, 'Name is required').max(120),
  customerPhone: z.string().trim().min(1, 'Phone is required').max(40),
  customerEmail: z.email('Invalid email').trim().toLowerCase().optional().or(z.literal('')),
})

export const updateAppointmentSchema = z
  .object({
    status: z.enum(['confirmed', 'cancelled', 'completed', 'no-show']).optional(),
    date: dateOnly.optional(),
    time: timeOnly.optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  })
  .refine((data) => !(data.date && !data.time) && !(data.time && !data.date), {
    message: 'Rescheduling requires both date and time',
  })

export const listAppointmentsQuerySchema = z.object({
  from: dateOnly.optional(),
  to: dateOnly.optional(),
  status: z.enum(['confirmed', 'cancelled', 'completed', 'no-show']).optional(),
})
