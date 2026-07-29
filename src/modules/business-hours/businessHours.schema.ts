import { z } from 'zod'

const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:mm format')

// `closed` se resuelve aca, no en el default de mongoose: el service recibe
// siempre un dia completo y el contrato de la API queda explicito.
const daySchema = z
  .object({
    open: timeString,
    close: timeString,
    closed: z.boolean().default(false),
  })
  // Un rango invertido (open >= close) antes se aceptaba con 200 y dejaba el
  // dia sin disponibilidad, sin ningun error visible. En un dia cerrado los
  // horarios no se leen, asi que ahi no se valida.
  .refine((day) => day.closed || day.open < day.close, {
    message: 'open must be earlier than close',
    path: ['open'],
  })

export const updateBusinessHoursSchema = z
  .object({
    hours: z
      .object({
        sun: daySchema.optional(),
        mon: daySchema.optional(),
        tue: daySchema.optional(),
        wed: daySchema.optional(),
        thu: daySchema.optional(),
        fri: daySchema.optional(),
        sat: daySchema.optional(),
      })
      .optional(),
    slotStepMinutes: z.coerce.number().int().min(5).max(120).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  })
