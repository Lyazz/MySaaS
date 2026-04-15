import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'

describe('Order bordereau PDF', () => {
    const slug = `bordereau-${Date.now()}`
    const host = `${slug}.localhost:3000`

    let tenantId: string
    let token: string
    let orderId: string
    let productId: string

    beforeAll(async () => {
        const tenant = await prisma.tenant.create({ data: { name: 'Bordereau Tenant', slug } })
        tenantId = tenant.id

        const user = await prisma.user.create({
            data: { tenantId, email: `admin-${slug}@example.com`, role: 'admin', passwordHash: 'x' }
        })
        token = signAccessToken({ userId: user.id, email: user.email, role: user.role, tenantId: user.tenantId })

        const product = await prisma.product.create({
            data: { tenantId, title: 'Bordereau Product', slug: `bord-prod-${Date.now()}`, price: 100, isActive: true, stock: 10 }
        })
        productId = product.id

        const order = await prisma.order.create({
            data: {
                tenantId,
                status: 'PENDING',
                totalAmount: 100,
                customerName: 'Buyer',
                customerPhone: '0550123456',
                items: { create: [{ productId, quantity: 1, price: 100 }] }
            }
        })
        orderId = order.id
    })

    afterAll(async () => {
        await prisma.orderItem.deleteMany({ where: { tenantId } })
        await prisma.order.deleteMany({ where: { tenantId } })
        await prisma.product.deleteMany({ where: { tenantId } })
        await prisma.user.deleteMany({ where: { tenantId } })
        await prisma.tenant.deleteMany({ where: { id: tenantId } })
    })

    it('returns a generic PDF for non-carrier orders', async () => {
        const res = await request(app)
            .get(`/api/admin/orders/${orderId}/bordereau`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${token}`)
            .buffer(true)
            .parse((response, callback) => {
                const chunks: Buffer[] = []
                response.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
                response.on('end', () => callback(null, Buffer.concat(chunks)))
            })

        expect(res.status).toBe(200)
        expect(res.headers['content-type']).toContain('application/pdf')
        expect(Buffer.isBuffer(res.body)).toBe(true)
        expect(res.body.subarray(0, 4).toString('utf8')).toBe('%PDF')
    })
})
