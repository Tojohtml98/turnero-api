import request from 'supertest'
import app from '../../../app'
import { createAdminAndLogin, createService } from '../../../tests/helpers'

describe('GET /api/services (public)', () => {
  it('lists only active services', async () => {
    const { accessToken: token } = await createAdminAndLogin()
    await createService(token, { name: 'Activo', active: true })
    await createService(token, { name: 'Inactivo', active: false })

    const res = await request(app).get('/api/services')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].name).toBe('Activo')
  })
})

describe('GET /api/admin/services', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/admin/services')
    expect(res.status).toBe(401)
  })

  it('lists all services including inactive ones', async () => {
    const { accessToken: token } = await createAdminAndLogin()
    await createService(token, { name: 'Activo', active: true })
    await createService(token, { name: 'Inactivo', active: false })

    const res = await request(app)
      .get('/api/admin/services')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
  })
})

describe('POST /api/admin/services', () => {
  it('creates a service', async () => {
    const { accessToken: token } = await createAdminAndLogin()

    const res = await request(app)
      .post('/api/admin/services')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Corte', durationMinutes: 30, price: 5000 })

    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Corte')
    expect(res.body.active).toBe(true)
  })

  it('returns 400 when duration is missing', async () => {
    const { accessToken: token } = await createAdminAndLogin()

    const res = await request(app)
      .post('/api/admin/services')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Corte', price: 5000 })

    expect(res.status).toBe(400)
  })
})

describe('PATCH /api/admin/services/:id', () => {
  it('updates a service', async () => {
    const { accessToken: token } = await createAdminAndLogin()
    const service = await createService(token)

    const res = await request(app)
      .patch(`/api/admin/services/${service._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ price: 9999, active: false })

    expect(res.status).toBe(200)
    expect(res.body.price).toBe(9999)
    expect(res.body.active).toBe(false)
  })

  it('returns 404 for a non-existent service', async () => {
    const { accessToken: token } = await createAdminAndLogin()

    const res = await request(app)
      .patch('/api/admin/services/507f1f77bcf86cd799439011')
      .set('Authorization', `Bearer ${token}`)
      .send({ price: 100 })

    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/admin/services/:id', () => {
  it('deletes a service and returns 204', async () => {
    const { accessToken: token } = await createAdminAndLogin()
    const service = await createService(token)

    const res = await request(app)
      .delete(`/api/admin/services/${service._id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(204)
  })
})
