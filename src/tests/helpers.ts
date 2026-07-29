import request from 'supertest'
import app from '../app'
import User from '../modules/auth/user.model'
import businessHoursRepo from '../modules/business-hours/businessHours.repository'

type Overrides = Record<string, unknown>

// No hay registro publico: los tests crean el admin directo contra el
// modelo (igual que hace el script de seed) y despues loguean por la API.
export const createAdminAndLogin = async (overrides: Overrides = {}) => {
  const email = (overrides.email as string) || 'admin@example.com'
  const password = (overrides.password as string) || 'password123'

  await User.create({ name: 'Admin', email, password, ...overrides })

  const res = await request(app).post('/api/auth/login').send({ email, password })
  return res.body as { user: Record<string, unknown>; accessToken: string; refreshToken: string }
}

export const createService = async (token: string, overrides: Overrides = {}) => {
  const res = await request(app)
    .post('/api/admin/services')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Test Service', durationMinutes: 30, price: 1000, ...overrides })
  return res.body
}

// Fuerza un horario comercial predecible para los tests de disponibilidad/reserva.
export const setOpenAllWeek = async () => {
  const openDay = { open: '09:00', close: '18:00', closed: false }
  await businessHoursRepo.update({
    hours: {
      sun: openDay,
      mon: openDay,
      tue: openDay,
      wed: openDay,
      thu: openDay,
      fri: openDay,
      sat: openDay,
    },
    slotStepMinutes: 30,
  })
}

// Fecha local en formato YYYY-MM-DD (evitar toISOString: convierte a UTC
// y puede correr el dia si el test corre cerca de medianoche local).
export const isoDate = (date: Date): string => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const futureDate = (daysFromNow: number): Date => {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  return date
}
