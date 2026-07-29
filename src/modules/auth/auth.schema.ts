import { z } from 'zod'

export const loginSchema = z.object({
  email: z.email('Invalid email').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
})

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
})
