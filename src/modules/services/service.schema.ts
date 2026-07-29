import { z } from 'zod'

export const createServiceSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  description: z.string().trim().max(500).optional(),
  durationMinutes: z.coerce.number().int().min(5, 'Minimum duration is 5 minutes').max(480),
  price: z.coerce.number().min(0, 'Price cannot be negative'),
  active: z.boolean().optional(),
})

export const updateServiceSchema = createServiceSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  })
