import request from 'supertest'
import app from '../../../app'
import { createAdminAndLogin } from '../../../tests/helpers'

describe('POST /api/auth/login', () => {
  it('logs in with valid credentials', async () => {
    await createAdminAndLogin({ email: 'owner@example.com', password: 'password123' })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'owner@example.com', password: 'password123' })

    expect(res.status).toBe(200)
    expect(res.body.accessToken).toBeDefined()
    expect(res.body.refreshToken).toBeDefined()
    expect(res.body.user.email).toBe('owner@example.com')
    expect(res.body.user.password).toBeUndefined()
  })

  it('rejects wrong password', async () => {
    await createAdminAndLogin({ email: 'owner2@example.com', password: 'password123' })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'owner2@example.com', password: 'wrong-password' })

    expect(res.status).toBe(401)
  })

  it('rejects an email that does not exist', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' })

    expect(res.status).toBe(401)
  })

  it('returns 400 for an invalid body', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email' })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/auth/refresh', () => {
  it('issues a new token pair from a valid refresh token', async () => {
    const { refreshToken } = await createAdminAndLogin({ email: 'refresh@example.com' })

    const res = await request(app).post('/api/auth/refresh').send({ refreshToken })

    expect(res.status).toBe(200)
    expect(res.body.accessToken).toBeDefined()
    expect(res.body.refreshToken).toBeDefined()
  })

  it('rejects an invalid refresh token', async () => {
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: 'garbage' })
    expect(res.status).toBe(401)
  })
})

describe('POST /api/auth/logout', () => {
  it('requires a bearer token', async () => {
    const res = await request(app).post('/api/auth/logout')
    expect(res.status).toBe(401)
  })

  it('invalidates the refresh token after logging out', async () => {
    const { accessToken, refreshToken } = await createAdminAndLogin({ email: 'logout@example.com' })

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
    expect(logoutRes.status).toBe(200)

    const refreshRes = await request(app).post('/api/auth/refresh').send({ refreshToken })
    expect(refreshRes.status).toBe(401)
  })
})
