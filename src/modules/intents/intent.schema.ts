import { z } from 'zod'

export const parseIntentSchema = z.object({
  // Tope de 500: es un mensaje de un cliente, no un documento. Ademas evita
  // mandarle un prompt gigante a un modelo con contexto chico.
  text: z.string().trim().min(1, 'text is required').max(500),
})
