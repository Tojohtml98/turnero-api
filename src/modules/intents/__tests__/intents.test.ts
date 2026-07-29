import request from 'supertest'
import app from '../../../app'
import { createAdminAndLogin, createService, isoDate, futureDate } from '../../../tests/helpers'

// Integracion del endpoint. Corre con el parser deterministico (el default),
// asi que no depende de ningun servicio externo y el CI no necesita ni Ollama
// ni una API key.

const tomorrow = () => isoDate(futureDate(1))

describe('POST /api/intents/parse', () => {
  it('parses the canonical request against the real catalog', async () => {
    const { accessToken: token } = await createAdminAndLogin()
    const service = await createService(token, { name: 'Corte', durationMinutes: 30, price: 5000 })

    const res = await request(app)
      .post('/api/intents/parse')
      .send({ text: 'quiero turno de corte manana a las 3' })

    expect(res.status).toBe(200)
    expect(res.body.parser).toBe('rules')
    expect(res.body.intent).toEqual({
      service: 'Corte',
      date: tomorrow(),
      time: '15:00',
    })
    expect(res.body.match).toMatchObject({
      serviceId: String(service._id),
      name: 'Corte',
      durationMinutes: 30,
      price: 5000,
    })
    expect(res.body.missing).toEqual([])
    expect(res.body.ready).toBe(true)
  })

  it('does not book anything', async () => {
    const { accessToken: token } = await createAdminAndLogin()
    await createService(token, { name: 'Corte' })

    await request(app)
      .post('/api/intents/parse')
      .send({ text: 'quiero turno de corte manana a las 3' })

    const appointments = await request(app)
      .get('/api/admin/appointments')
      .set('Authorization', `Bearer ${token}`)

    expect(appointments.body).toHaveLength(0)
  })

  it('reports what is missing when the text has no time', async () => {
    const { accessToken: token } = await createAdminAndLogin()
    await createService(token, { name: 'Corte' })

    const res = await request(app)
      .post('/api/intents/parse')
      .send({ text: 'quiero turno de corte manana' })

    expect(res.body.intent.time).toBeNull()
    expect(res.body.missing).toEqual(['time'])
    expect(res.body.ready).toBe(false)
  })

  it('reports every missing field for a vague message', async () => {
    const { accessToken: token } = await createAdminAndLogin()
    await createService(token, { name: 'Corte' })

    const res = await request(app).post('/api/intents/parse').send({ text: 'hola buenas' })

    expect(res.body.missing).toEqual(['service', 'date', 'time'])
    expect(res.body.ready).toBe(false)
  })

  it('leaves match null when the service is not in the catalog', async () => {
    const { accessToken: token } = await createAdminAndLogin()
    await createService(token, { name: 'Corte' })

    const res = await request(app)
      .post('/api/intents/parse')
      .send({ text: 'quiero turno de masajes manana a las 3' })

    // El texto se entendio, pero el negocio no ofrece eso.
    expect(res.body.intent.service).toBe('masajes')
    expect(res.body.match).toBeNull()
    expect(res.body.missing).toContain('service')
  })

  it('does not match an inactive service', async () => {
    const { accessToken: token } = await createAdminAndLogin()
    await createService(token, { name: 'Corte', active: false })

    const res = await request(app)
      .post('/api/intents/parse')
      .send({ text: 'quiero turno de corte manana a las 3' })

    expect(res.body.match).toBeNull()
  })

  it('resolves a partial service name to the catalog entry', async () => {
    const { accessToken: token } = await createAdminAndLogin()
    const service = await createService(token, { name: 'Corte de pelo' })

    const res = await request(app)
      .post('/api/intents/parse')
      .send({ text: 'necesito un corte manana a las 4' })

    expect(res.body.match.serviceId).toBe(String(service._id))
    expect(res.body.match.name).toBe('Corte de pelo')
  })

  it('works with an empty catalog', async () => {
    const res = await request(app)
      .post('/api/intents/parse')
      .send({ text: 'quiero turno de corte manana a las 3' })

    expect(res.status).toBe(200)
    expect(res.body.match).toBeNull()
    expect(res.body.intent.date).toBe(tomorrow())
  })

  it('returns 400 when text is missing', async () => {
    const res = await request(app).post('/api/intents/parse').send({})
    expect(res.status).toBe(400)
  })

  it('returns 400 for an empty text', async () => {
    const res = await request(app).post('/api/intents/parse').send({ text: '   ' })
    expect(res.status).toBe(400)
  })

  it('returns 400 for a text over the length cap', async () => {
    const res = await request(app)
      .post('/api/intents/parse')
      .send({ text: 'a'.repeat(501) })

    expect(res.status).toBe(400)
  })

  it('discards unknown fields', async () => {
    const res = await request(app)
      .post('/api/intents/parse')
      .send({ text: 'turno de corte manana', customerPhone: '2494123456' })

    expect(res.status).toBe(200)
    expect(res.body.customerPhone).toBeUndefined()
  })

  it('does not require authentication', async () => {
    const res = await request(app).post('/api/intents/parse').send({ text: 'turno manana' })
    expect(res.status).toBe(200)
  })

  it('never calls the network with the default parser', async () => {
    const spy = jest.spyOn(global, 'fetch')

    await request(app)
      .post('/api/intents/parse')
      .send({ text: 'quiero turno de corte manana a las 3' })

    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('feeds the availability endpoint with what it resolved', async () => {
    // El intent no reserva, pero deja todo listo para el paso siguiente.
    const { accessToken: token } = await createAdminAndLogin()
    await createService(token, { name: 'Corte', durationMinutes: 30 })

    const parsed = await request(app)
      .post('/api/intents/parse')
      .send({ text: 'quiero turno de corte manana a las 10' })

    const availability = await request(app)
      .get('/api/appointments/availability')
      .query({ serviceId: parsed.body.match.serviceId, date: parsed.body.intent.date })

    expect(availability.status).toBe(200)
    expect(Array.isArray(availability.body.slots)).toBe(true)
  })
})
