import request from 'supertest'
import app from '../../../app'
import businessHoursRepo from '../businessHours.repository'
import { WEEKDAYS, Weekday } from '../businessHours.model'
import { updateBusinessHoursSchema } from '../businessHours.schema'
import { createAdminAndLogin, createService, isoDate, futureDate } from '../../../tests/helpers'

// Devuelve la proxima fecha que cae en el dia de semana pedido, siempre a
// futuro. Los tests de disponibilidad necesitan controlar el weekday (el
// horario se configura por dia) sin chocar con el filtro de "en el pasado".
const nextWeekdayDate = (weekday: Weekday, minDaysAhead = 7): Date => {
  const target = WEEKDAYS.indexOf(weekday)
  const date = futureDate(minDaysAhead)
  while (date.getDay() !== target) {
    date.setDate(date.getDate() + 1)
  }
  return date
}

const openDay = { open: '09:00', close: '18:00', closed: false }

// El default de `closed` vive en el schema, no en mongoose. Desde la API los
// dos caminos devuelven lo mismo, asi que se verifica sobre el parse: lo que
// importa es que el service reciba el dia completo.
describe('updateBusinessHoursSchema', () => {
  it('fills closed with false when the client omits it', () => {
    const parsed = updateBusinessHoursSchema.parse({
      hours: { mon: { open: '09:00', close: '18:00' } },
    })

    expect(parsed.hours?.mon).toEqual({ open: '09:00', close: '18:00', closed: false })
  })

  it('keeps closed when the client sends it', () => {
    const parsed = updateBusinessHoursSchema.parse({
      hours: { sun: { open: '09:00', close: '13:00', closed: true } },
    })

    expect(parsed.hours?.sun?.closed).toBe(true)
  })

  it('rejects an inverted range', () => {
    const result = updateBusinessHoursSchema.safeParse({
      hours: { mon: { open: '18:00', close: '09:00' } },
    })

    expect(result.success).toBe(false)
  })
})

describe('GET /api/business-hours (public)', () => {
  it('seeds and returns the default schedule on first call', async () => {
    const res = await request(app).get('/api/business-hours')

    expect(res.status).toBe(200)
    expect(res.body.slotStepMinutes).toBe(30)
    expect(res.body.hours.mon).toMatchObject({ open: '09:00', close: '18:00', closed: false })
    expect(res.body.hours.sun.closed).toBe(true)
  })

  it('returns every weekday', async () => {
    const res = await request(app).get('/api/business-hours')

    for (const day of WEEKDAYS) {
      expect(res.body.hours[day]).toBeDefined()
    }
  })

  it('keeps a single document across repeated calls', async () => {
    const first = await request(app).get('/api/business-hours')
    const second = await request(app).get('/api/business-hours')

    expect(first.body._id).toBe(second.body._id)
  })
})

describe('GET /api/admin/business-hours', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/admin/business-hours')
    expect(res.status).toBe(401)
  })

  it('returns the schedule for an authenticated admin', async () => {
    const { accessToken: token } = await createAdminAndLogin()

    const res = await request(app)
      .get('/api/admin/business-hours')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.hours.mon.open).toBe('09:00')
  })
})

describe('PUT /api/admin/business-hours', () => {
  it('requires authentication', async () => {
    const res = await request(app)
      .put('/api/admin/business-hours')
      .send({ slotStepMinutes: 60 })

    expect(res.status).toBe(401)
  })

  it('updates one day and leaves the rest untouched', async () => {
    const { accessToken: token } = await createAdminAndLogin()

    const res = await request(app)
      .put('/api/admin/business-hours')
      .set('Authorization', `Bearer ${token}`)
      .send({ hours: { mon: { open: '10:00', close: '16:00', closed: false } } })

    expect(res.status).toBe(200)
    expect(res.body.hours.mon).toMatchObject({ open: '10:00', close: '16:00' })
    // El merge del repository no debe pisar los demas dias.
    expect(res.body.hours.tue).toMatchObject({ open: '09:00', close: '18:00' })
    expect(res.body.hours.sun.closed).toBe(true)
  })

  it('persists the update (not just the response)', async () => {
    const { accessToken: token } = await createAdminAndLogin()

    await request(app)
      .put('/api/admin/business-hours')
      .set('Authorization', `Bearer ${token}`)
      .send({ hours: { wed: { open: '11:00', close: '15:00', closed: false } } })

    const res = await request(app).get('/api/business-hours')
    expect(res.body.hours.wed).toMatchObject({ open: '11:00', close: '15:00' })
  })

  it('closes a day', async () => {
    const { accessToken: token } = await createAdminAndLogin()

    const res = await request(app)
      .put('/api/admin/business-hours')
      .set('Authorization', `Bearer ${token}`)
      .send({ hours: { sat: { open: '09:00', close: '13:00', closed: true } } })

    expect(res.status).toBe(200)
    expect(res.body.hours.sat.closed).toBe(true)
  })

  it('updates slotStepMinutes on its own', async () => {
    const { accessToken: token } = await createAdminAndLogin()

    const res = await request(app)
      .put('/api/admin/business-hours')
      .set('Authorization', `Bearer ${token}`)
      .send({ slotStepMinutes: 45 })

    expect(res.status).toBe(200)
    expect(res.body.slotStepMinutes).toBe(45)
  })

  it('coerces a numeric string for slotStepMinutes', async () => {
    const { accessToken: token } = await createAdminAndLogin()

    const res = await request(app)
      .put('/api/admin/business-hours')
      .set('Authorization', `Bearer ${token}`)
      .send({ slotStepMinutes: '60' })

    expect(res.status).toBe(200)
    expect(res.body.slotStepMinutes).toBe(60)
  })

  it('returns 400 for a time without a leading zero', async () => {
    const { accessToken: token } = await createAdminAndLogin()

    const res = await request(app)
      .put('/api/admin/business-hours')
      .set('Authorization', `Bearer ${token}`)
      .send({ hours: { mon: { open: '9:00', close: '18:00' } } })

    expect(res.status).toBe(400)
  })

  it('returns 400 for an hour outside 00-23', async () => {
    const { accessToken: token } = await createAdminAndLogin()

    const res = await request(app)
      .put('/api/admin/business-hours')
      .set('Authorization', `Bearer ${token}`)
      .send({ hours: { mon: { open: '25:00', close: '26:00' } } })

    expect(res.status).toBe(400)
  })

  it('returns 400 when open is not earlier than close', async () => {
    const { accessToken: token } = await createAdminAndLogin()

    const res = await request(app)
      .put('/api/admin/business-hours')
      .set('Authorization', `Bearer ${token}`)
      .send({ hours: { fri: { open: '18:00', close: '09:00', closed: false } } })

    expect(res.status).toBe(400)
    expect(res.body.error.message).toMatch(/earlier than close/i)
  })

  it('returns 400 when open equals close', async () => {
    const { accessToken: token } = await createAdminAndLogin()

    const res = await request(app)
      .put('/api/admin/business-hours')
      .set('Authorization', `Bearer ${token}`)
      .send({ hours: { fri: { open: '09:00', close: '09:00', closed: false } } })

    expect(res.status).toBe(400)
  })

  it('leaves the range unvalidated on a closed day', async () => {
    const { accessToken: token } = await createAdminAndLogin()

    // Con el dia cerrado los horarios no se leen, no hay motivo para rechazar.
    const res = await request(app)
      .put('/api/admin/business-hours')
      .set('Authorization', `Bearer ${token}`)
      .send({ hours: { sun: { open: '00:00', close: '00:00', closed: true } } })

    expect(res.status).toBe(200)
    expect(res.body.hours.sun.closed).toBe(true)
  })

  it('does not let an invalid range reach the database', async () => {
    const { accessToken: token } = await createAdminAndLogin()

    await request(app)
      .put('/api/admin/business-hours')
      .set('Authorization', `Bearer ${token}`)
      .send({ hours: { mon: { open: '20:00', close: '08:00', closed: false } } })

    const res = await request(app).get('/api/business-hours')
    expect(res.body.hours.mon).toMatchObject({ open: '09:00', close: '18:00' })
  })

  it('returns 400 for slotStepMinutes below the minimum', async () => {
    const { accessToken: token } = await createAdminAndLogin()

    const res = await request(app)
      .put('/api/admin/business-hours')
      .set('Authorization', `Bearer ${token}`)
      .send({ slotStepMinutes: 4 })

    expect(res.status).toBe(400)
  })

  it('returns 400 for slotStepMinutes above the maximum', async () => {
    const { accessToken: token } = await createAdminAndLogin()

    const res = await request(app)
      .put('/api/admin/business-hours')
      .set('Authorization', `Bearer ${token}`)
      .send({ slotStepMinutes: 121 })

    expect(res.status).toBe(400)
  })

  it('returns 400 for an empty body', async () => {
    const { accessToken: token } = await createAdminAndLogin()

    const res = await request(app)
      .put('/api/admin/business-hours')
      .set('Authorization', `Bearer ${token}`)
      .send({})

    expect(res.status).toBe(400)
  })

  it('returns 400 when the body only carries unknown fields', async () => {
    const { accessToken: token } = await createAdminAndLogin()

    // zod descarta las claves desconocidas, asi que el body queda vacio y
    // cae en el refine de "al menos un campo".
    const res = await request(app)
      .put('/api/admin/business-hours')
      .set('Authorization', `Bearer ${token}`)
      .send({ timezone: 'America/Argentina/Buenos_Aires' })

    expect(res.status).toBe(400)
  })

  it('discards unknown fields on a valid update', async () => {
    const { accessToken: token } = await createAdminAndLogin()

    const res = await request(app)
      .put('/api/admin/business-hours')
      .set('Authorization', `Bearer ${token}`)
      .send({ slotStepMinutes: 30, timezone: 'UTC' })

    expect(res.status).toBe(200)
    expect(res.body.timezone).toBeUndefined()
  })
})

describe('business hours drive availability', () => {
  it('only offers slots inside the configured window', async () => {
    const { accessToken: token } = await createAdminAndLogin()
    const service = await createService(token, { durationMinutes: 30 })
    const monday = nextWeekdayDate('mon')

    await request(app)
      .put('/api/admin/business-hours')
      .set('Authorization', `Bearer ${token}`)
      .send({
        hours: { mon: { open: '10:00', close: '12:00', closed: false } },
        slotStepMinutes: 30,
      })

    const res = await request(app)
      .get('/api/appointments/availability')
      .query({ serviceId: service._id, date: isoDate(monday) })

    expect(res.status).toBe(200)
    expect(res.body.slots).toEqual(['10:00', '10:30', '11:00', '11:30'])
  })

  it('returns no slots on a closed day', async () => {
    const { accessToken: token } = await createAdminAndLogin()
    const service = await createService(token, { durationMinutes: 30 })
    const tuesday = nextWeekdayDate('tue')

    await request(app)
      .put('/api/admin/business-hours')
      .set('Authorization', `Bearer ${token}`)
      .send({ hours: { tue: { open: '09:00', close: '18:00', closed: true } } })

    const res = await request(app)
      .get('/api/appointments/availability')
      .query({ serviceId: service._id, date: isoDate(tuesday) })

    expect(res.status).toBe(200)
    expect(res.body.slots).toEqual([])
  })

  it('changes slot granularity with slotStepMinutes', async () => {
    const { accessToken: token } = await createAdminAndLogin()
    const service = await createService(token, { durationMinutes: 30 })
    const wednesday = nextWeekdayDate('wed')

    await request(app)
      .put('/api/admin/business-hours')
      .set('Authorization', `Bearer ${token}`)
      .send({
        hours: { wed: { open: '09:00', close: '12:00', closed: false } },
        slotStepMinutes: 60,
      })

    const res = await request(app)
      .get('/api/appointments/availability')
      .query({ serviceId: service._id, date: isoDate(wednesday) })

    expect(res.body.slots).toEqual(['09:00', '10:00', '11:00'])
  })

  it('drops the last slot when the service no longer fits before closing', async () => {
    const { accessToken: token } = await createAdminAndLogin()
    const long = await createService(token, { name: 'Largo', durationMinutes: 45 })
    const short = await createService(token, { name: 'Corto', durationMinutes: 30 })
    const thursday = nextWeekdayDate('thu')

    await request(app)
      .put('/api/admin/business-hours')
      .set('Authorization', `Bearer ${token}`)
      .send({
        hours: { thu: { open: '09:00', close: '10:30', closed: false } },
        slotStepMinutes: 30,
      })

    // Los slots caen en la grilla del step (09:00 / 09:30 / 10:00). Con 45
    // minutos, el de 10:00 terminaria 10:45 y se pasa del cierre -> se cae.
    const longRes = await request(app)
      .get('/api/appointments/availability')
      .query({ serviceId: long._id, date: isoDate(thursday) })
    expect(longRes.body.slots).toEqual(['09:00', '09:30'])

    // Con 30 minutos, el de 10:00 termina 10:30 justo al cierre -> entra.
    const shortRes = await request(app)
      .get('/api/appointments/availability')
      .query({ serviceId: short._id, date: isoDate(thursday) })
    expect(shortRes.body.slots).toEqual(['09:00', '09:30', '10:00'])
  })

  it('keeps a day usable after a valid range update', async () => {
    const { accessToken: token } = await createAdminAndLogin()
    const service = await createService(token, { durationMinutes: 30 })
    const friday = nextWeekdayDate('fri')

    await request(app)
      .put('/api/admin/business-hours')
      .set('Authorization', `Bearer ${token}`)
      .send({
        hours: { fri: { open: '14:00', close: '15:00', closed: false } },
        slotStepMinutes: 30,
      })

    const res = await request(app)
      .get('/api/appointments/availability')
      .query({ serviceId: service._id, date: isoDate(friday) })

    expect(res.body.slots).toEqual(['14:00', '14:30'])
  })
})

describe('business hours guard booking', () => {
  it('rejects a booking on a closed day', async () => {
    const { accessToken: token } = await createAdminAndLogin()
    const service = await createService(token, { durationMinutes: 30 })
    const saturday = nextWeekdayDate('sat')

    await businessHoursRepo.update({
      hours: { sat: { open: '09:00', close: '13:00', closed: true } },
    })

    const res = await request(app).post('/api/appointments').send({
      serviceId: service._id,
      date: isoDate(saturday),
      time: '10:00',
      customerName: 'Cliente Sabado',
      customerPhone: '2494123456',
    })

    expect(res.status).toBe(400)
    expect(res.body.error.message).toMatch(/closed/i)
  })

  it('rejects a booking that starts before opening', async () => {
    const { accessToken: token } = await createAdminAndLogin()
    const service = await createService(token, { durationMinutes: 30 })
    const monday = nextWeekdayDate('mon')

    await businessHoursRepo.update({ hours: { mon: { ...openDay, open: '10:00' } } })

    const res = await request(app).post('/api/appointments').send({
      serviceId: service._id,
      date: isoDate(monday),
      time: '09:30',
      customerName: 'Temprano',
      customerPhone: '123',
    })

    expect(res.status).toBe(400)
    expect(res.body.error.message).toMatch(/outside business hours/i)
  })

  it('rejects a booking that would end after closing', async () => {
    const { accessToken: token } = await createAdminAndLogin()
    const service = await createService(token, { durationMinutes: 60 })
    const monday = nextWeekdayDate('mon')

    await businessHoursRepo.update({ hours: { mon: { ...openDay, close: '18:00' } } })

    const res = await request(app).post('/api/appointments').send({
      serviceId: service._id,
      date: isoDate(monday),
      time: '17:30',
      customerName: 'Se pasa del cierre',
      customerPhone: '123',
    })

    expect(res.status).toBe(400)
    expect(res.body.error.message).toMatch(/outside business hours/i)
  })

  it('accepts a booking that ends exactly at closing time', async () => {
    const { accessToken: token } = await createAdminAndLogin()
    const service = await createService(token, { durationMinutes: 60 })
    const monday = nextWeekdayDate('mon')

    await businessHoursRepo.update({ hours: { mon: { ...openDay, close: '18:00' } } })

    const res = await request(app).post('/api/appointments').send({
      serviceId: service._id,
      date: isoDate(monday),
      time: '17:00',
      customerName: 'Ultimo turno',
      customerPhone: '123',
    })

    expect(res.status).toBe(201)
  })

  it('accepts a booking that starts exactly at opening time', async () => {
    const { accessToken: token } = await createAdminAndLogin()
    const service = await createService(token, { durationMinutes: 30 })
    const monday = nextWeekdayDate('mon')

    await businessHoursRepo.update({ hours: { mon: openDay } })

    const res = await request(app).post('/api/appointments').send({
      serviceId: service._id,
      date: isoDate(monday),
      time: '09:00',
      customerName: 'Primer turno',
      customerPhone: '123',
    })

    expect(res.status).toBe(201)
  })

  it('frees the day again when the admin reopens it', async () => {
    const { accessToken: token } = await createAdminAndLogin()
    const service = await createService(token, { durationMinutes: 30 })
    const tuesday = nextWeekdayDate('tue')

    await request(app)
      .put('/api/admin/business-hours')
      .set('Authorization', `Bearer ${token}`)
      .send({ hours: { tue: { open: '09:00', close: '18:00', closed: true } } })

    const closed = await request(app).post('/api/appointments').send({
      serviceId: service._id,
      date: isoDate(tuesday),
      time: '10:00',
      customerName: 'Cliente',
      customerPhone: '123',
    })
    expect(closed.status).toBe(400)

    await request(app)
      .put('/api/admin/business-hours')
      .set('Authorization', `Bearer ${token}`)
      .send({ hours: { tue: { open: '09:00', close: '18:00', closed: false } } })

    const reopened = await request(app).post('/api/appointments').send({
      serviceId: service._id,
      date: isoDate(tuesday),
      time: '10:00',
      customerName: 'Cliente',
      customerPhone: '123',
    })
    expect(reopened.status).toBe(201)
  })
})
