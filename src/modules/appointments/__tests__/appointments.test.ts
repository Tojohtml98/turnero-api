import request from 'supertest'
import app from '../../../app'
import {
  createAdminAndLogin,
  createService,
  setOpenAllWeek,
  isoDate,
  futureDate,
} from '../../../tests/helpers'

const bookingDate = () => isoDate(futureDate(10)) // bien lejos: nunca "en el pasado"

describe('GET /api/appointments/availability', () => {
  it('returns time slots within business hours', async () => {
    await setOpenAllWeek()
    const { accessToken: token } = await createAdminAndLogin()
    const service = await createService(token, { durationMinutes: 30 })

    const res = await request(app)
      .get('/api/appointments/availability')
      .query({ serviceId: service._id, date: bookingDate() })

    expect(res.status).toBe(200)
    expect(res.body.slots).toContain('09:00')
    expect(res.body.slots.length).toBeGreaterThan(0)
  })

  it('returns 404 for an unknown service', async () => {
    const res = await request(app)
      .get('/api/appointments/availability')
      .query({ serviceId: '507f1f77bcf86cd799439011', date: bookingDate() })

    expect(res.status).toBe(404)
  })

  it('returns 400 for a malformed date', async () => {
    const { accessToken: token } = await createAdminAndLogin()
    const service = await createService(token)

    const res = await request(app)
      .get('/api/appointments/availability')
      .query({ serviceId: service._id, date: '10-01-2026' })

    expect(res.status).toBe(400)
  })
})

describe('POST /api/appointments', () => {
  it('books an appointment and removes the slot from availability', async () => {
    await setOpenAllWeek()
    const { accessToken: token } = await createAdminAndLogin()
    const service = await createService(token, { durationMinutes: 30 })
    const date = bookingDate()

    const bookRes = await request(app).post('/api/appointments').send({
      serviceId: service._id,
      date,
      time: '10:00',
      customerName: 'Juana Perez',
      customerPhone: '2494123456',
    })

    expect(bookRes.status).toBe(201)
    expect(bookRes.body.status).toBe('confirmed')
    expect(bookRes.body.serviceName).toBe(service.name)

    const availRes = await request(app)
      .get('/api/appointments/availability')
      .query({ serviceId: service._id, date })

    expect(availRes.body.slots).not.toContain('10:00')
  })

  it('rejects a double booking of the same slot (409)', async () => {
    await setOpenAllWeek()
    const { accessToken: token } = await createAdminAndLogin()
    const service = await createService(token, { durationMinutes: 30 })
    const date = bookingDate()
    const payload = {
      serviceId: service._id,
      date,
      time: '11:00',
      customerName: 'Cliente Uno',
      customerPhone: '111',
    }

    const first = await request(app).post('/api/appointments').send(payload)
    expect(first.status).toBe(201)

    const second = await request(app)
      .post('/api/appointments')
      .send({ ...payload, customerName: 'Cliente Dos', customerPhone: '222' })
    expect(second.status).toBe(409)
  })

  it('rejects a booking outside business hours', async () => {
    await setOpenAllWeek()
    const { accessToken: token } = await createAdminAndLogin()
    const service = await createService(token, { durationMinutes: 30 })

    const res = await request(app).post('/api/appointments').send({
      serviceId: service._id,
      date: bookingDate(),
      time: '23:00',
      customerName: 'Nocturno',
      customerPhone: '123',
    })

    expect(res.status).toBe(400)
  })

  it('rejects a booking in the past', async () => {
    await setOpenAllWeek()
    const { accessToken: token } = await createAdminAndLogin()
    const service = await createService(token, { durationMinutes: 30 })

    const res = await request(app).post('/api/appointments').send({
      serviceId: service._id,
      date: isoDate(futureDate(-5)),
      time: '10:00',
      customerName: 'Pasado',
      customerPhone: '123',
    })

    expect(res.status).toBe(400)
  })
})

describe('GET /api/admin/appointments', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/admin/appointments')
    expect(res.status).toBe(401)
  })

  it('lists booked appointments filtered by status', async () => {
    await setOpenAllWeek()
    const { accessToken: token } = await createAdminAndLogin()
    const service = await createService(token, { durationMinutes: 30 })
    const date = bookingDate()

    await request(app).post('/api/appointments').send({
      serviceId: service._id,
      date,
      time: '09:00',
      customerName: 'Cliente',
      customerPhone: '123',
    })

    const res = await request(app)
      .get('/api/admin/appointments')
      .query({ status: 'confirmed' })
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].status).toBe('confirmed')
  })
})

describe('PATCH /api/admin/appointments/:id', () => {
  it('updates the status (e.g. mark as completed)', async () => {
    await setOpenAllWeek()
    const { accessToken: token } = await createAdminAndLogin()
    const service = await createService(token, { durationMinutes: 30 })
    const date = bookingDate()

    const booked = await request(app).post('/api/appointments').send({
      serviceId: service._id,
      date,
      time: '09:00',
      customerName: 'Cliente',
      customerPhone: '123',
    })

    const res = await request(app)
      .patch(`/api/admin/appointments/${booked.body._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'completed' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('completed')
  })

  it('reschedules an appointment to a free slot', async () => {
    await setOpenAllWeek()
    const { accessToken: token } = await createAdminAndLogin()
    const service = await createService(token, { durationMinutes: 30 })
    const date = bookingDate()

    const booked = await request(app).post('/api/appointments').send({
      serviceId: service._id,
      date,
      time: '09:00',
      customerName: 'Cliente',
      customerPhone: '123',
    })

    const res = await request(app)
      .patch(`/api/admin/appointments/${booked.body._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ date, time: '14:00' })

    expect(res.status).toBe(200)

    const availRes = await request(app)
      .get('/api/appointments/availability')
      .query({ serviceId: service._id, date })

    expect(availRes.body.slots).toContain('09:00')
    expect(availRes.body.slots).not.toContain('14:00')
  })

  it('returns 404 for a non-existent appointment', async () => {
    const { accessToken: token } = await createAdminAndLogin()

    const res = await request(app)
      .patch('/api/admin/appointments/507f1f77bcf86cd799439011')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'cancelled' })

    expect(res.status).toBe(404)
  })
})
