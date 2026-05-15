import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import prisma from '../backend/src/lib/prisma'
import app from '../backend/src/app'
import { signAccessToken } from '../backend/src/lib/jwt'

describe('GET /api/admin/orders/export', () => {
  const slug = `export-test-${Date.now()}`
  const email = `export-${slug}@example.com`
  let token: string
  let tenantId: string

  beforeAll(async () => {
    const res = await request(app).post('/api/register').send({
      name: 'Export Test Tenant',
      slug,
      email,
      password: 'password123',
    })
    expect(res.status).toBe(200)
    tenantId = res.body.tenant.id
    const user = await prisma.user.findFirst({ where: { email } })
    token = signAccessToken({ userId: user!.id })

    // Create one test order
    await prisma.order.create({
      data: {
        tenantId,
        status: 'PENDING',
        customerName: 'Test Customer',
        customerPhone: '0555000001',
        totalAmount: 1000,
        totalWithShippingAmount: 1200,
        shippingAmount: 200,
        shippingWilayaCode: '16',
      },
    })
  })

  it('returns CSV with correct Content-Type', async () => {
    const res = await request(app)
      .get('/api/admin/orders/export?format=csv&columns=id,status,customerName')
      .set('X-Forwarded-Host', `${slug}.localhost:3000`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/csv/)
    const lines = res.text.split(/\r?\n/)
    expect(lines[0]).toContain('Order ID')
    expect(lines[0]).toContain('Status')
    expect(lines[0]).toContain('Customer Name')
  })

  it('returns TXT with tab-separated headers', async () => {
    const res = await request(app)
      .get('/api/admin/orders/export?format=txt&columns=id,status')
      .set('X-Forwarded-Host', `${slug}.localhost:3000`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/plain/)
    expect(res.text.split(/\r?\n/)[0]).toContain('\t')
  })

  it('returns XLSX binary', async () => {
    const res = await request(app)
      .get('/api/admin/orders/export?format=xlsx&columns=id,status,customerName')
      .set('X-Forwarded-Host', `${slug}.localhost:3000`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/spreadsheetml/)
  })

  it('returns PDF binary', async () => {
    const res = await request(app)
      .get('/api/admin/orders/export?format=pdf&columns=id,status')
      .set('X-Forwarded-Host', `${slug}.localhost:3000`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/pdf/)
  })

  it('returns 400 for unknown format', async () => {
    const res = await request(app)
      .get('/api/admin/orders/export?format=docx&columns=id')
      .set('X-Forwarded-Host', `${slug}.localhost:3000`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(400)
  })

  it('requires auth', async () => {
    const res = await request(app)
      .get('/api/admin/orders/export?format=csv&columns=id')
      .set('X-Forwarded-Host', `${slug}.localhost:3000`)

    expect(res.status).toBe(401)
  })

  it('returns a Google OAuth consent URL when authenticated', async () => {
    process.env.GOOGLE_OAUTH_CLIENT_ID ||= 'test-google-client-id'
    process.env.GOOGLE_OAUTH_CLIENT_SECRET ||= 'test-google-client-secret'
    delete process.env.GOOGLE_OAUTH_REDIRECT_URI

    const returnParams = new URLSearchParams({
      gsheet_columns: 'id,status,customerName',
      gsheet_status: 'PENDING',
      unsafe_redirect: 'https://example.com',
    })

    const res = await request(app)
      .get(`/api/admin/orders/export/google-auth-url?returnParams=${encodeURIComponent(returnParams.toString())}`)
      .set('X-Forwarded-Host', `${slug}.localhost:3000`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.url).toContain('https://accounts.google.com/o/oauth2/v2/auth')
    expect(res.body.url).toContain('scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fspreadsheets')
    expect(res.body.url).toContain(`redirect_uri=${encodeURIComponent(`http://${slug}.localhost:3000/api/admin/orders/export/google-callback`)}`)
    expect(res.body.url).toContain('state=')
  })

  it('fails before redirecting to Google when OAuth client config is missing', async () => {
    const originalClientId = process.env.GOOGLE_OAUTH_CLIENT_ID
    const originalClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
    process.env.GOOGLE_OAUTH_CLIENT_ID = ''
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = ''

    try {
      const res = await request(app)
        .get('/api/admin/orders/export/google-auth-url')
        .set('X-Forwarded-Host', `${slug}.localhost:3000`)
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(503)
      expect(res.body.statusMessage).toContain('GOOGLE_OAUTH_CLIENT_ID')
    } finally {
      if (originalClientId === undefined) delete process.env.GOOGLE_OAUTH_CLIENT_ID
      else process.env.GOOGLE_OAUTH_CLIENT_ID = originalClientId
      if (originalClientSecret === undefined) delete process.env.GOOGLE_OAUTH_CLIENT_SECRET
      else process.env.GOOGLE_OAUTH_CLIENT_SECRET = originalClientSecret
    }
  })

  it('requires app auth before starting Google OAuth', async () => {
    const res = await request(app)
      .get('/api/admin/orders/export/google-auth-url')
      .set('X-Forwarded-Host', `${slug}.localhost:3000`)

    expect(res.status).toBe(401)
  })

  it('rejects unsigned Google OAuth callback state', async () => {
    const forgedState = Buffer.from(JSON.stringify({
      tenantId,
      userId: 'attacker',
      returnParams: 'gsheet_columns=id',
    })).toString('base64url')

    const res = await request(app)
      .get(`/api/admin/orders/export/google-callback?code=fake-code&state=${forgedState}`)
      .set('X-Forwarded-Host', `${slug}.localhost:3000`)

    expect(res.status).toBe(400)
    expect(res.body.statusMessage).toBe('Invalid state')
  })

  it('asks the tenant user to connect Google before sheet export', async () => {
    const res = await request(app)
      .get('/api/admin/orders/export/google-export?columns=id,status')
      .set('X-Forwarded-Host', `${slug}.localhost:3000`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(401)
    expect(res.body.statusMessage).toContain('Google account not connected')
  })
})
