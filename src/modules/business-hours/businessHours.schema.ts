import { z } from 'zod'

const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:mm format')

const daySchema = z.object({
  open: timeString,
  close: timeString,
  closed: z.boolean().optional(),
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
