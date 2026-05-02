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
})
