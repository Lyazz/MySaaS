import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'

describe('Order blacklist (fraud prevention)', () => {
    const slug = `blacklist-${Date.now()}`
    const hostHeader = `${slug}.localhost:3000`
    let tenantId: string
    let adminToken: string
    let productId: string
    let variantId: string

    beforeAll(async () => {
        const tenant = await prisma.tenant.create({ data: { name: 'Blacklist Tenant', slug } })
        tenantId = tenant.id

        const admin = await prisma.user.create({
            data: { tenantId, email: `admin-${slug}@example.com`, role: 'admin', passwordHash: 'x' }
        })
        adminToken = signAccessToken({ userId: admin.id, email: admin.email, role: admin.role, tenantId: admin.tenantId })

        await prisma.storeSettings.create({
            data: { tenantId, cartEnabled: true, codEnabled: true, minimumOrderAmountDzd: 0, hideOptionalAddress: true }
        })

        const product = await prisma.product.create({
            data: { tenantId, title: 'Blacklist Product', slug: `bl-${Date.now()}`, price: 150, stock: 50, isActive: true }
        })
        productId = product.id

        const variant = await prisma.productVariant.create({
            data: { tenantId, productId, sku: `BL-${Date.now()}`, price: 150, stock: 50 }
        })
        variantId = variant.id
    })

    afterAll(async () => {
        await prisma.blacklistEntry.deleteMany({ where: { tenantId } })
        await prisma.orderItem.deleteMany({ where: { tenantId } })
        await prisma.order.deleteMany({ where: { tenantId } })
        await prisma.productVariant.deleteMany({ where: { tenantId } })
        await prisma.product.deleteMany({ where: { tenantId } })
        await prisma.customer.deleteMany({ where: { tenantId } })
        await prisma.storeSettings.deleteMany({ where: { tenantId } })
        await prisma.user.deleteMany({ where: { tenantId } })
        await prisma.tenant.deleteMany({ where: { id: tenantId } })
    })

    it('blocks public checkout from a blacklisted phone number', async () => {
        await request(app)
            .post('/api/admin/blacklist')
            .set('X-Forwarded-Host', hostHeader)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ type: 'PHONE', value: '0550111222', reason: 'known scammer' })
            .expect(201)

        const res = await request(app)
            .post('/api/orders')
            .set('X-Forwarded-Host', hostHeader)
            .send({
                customerName: 'Blocked Buyer',
                customerPhone: '0550111222',
                items: [{ productId, variantId, quantity: 1 }]
            })

        expect(res.status).toBe(403)
        expect(res.body.code).toBe('BLACKLISTED')

        const orders = await prisma.order.count({ where: { tenantId, customerPhoneNormalized: '213550111222' } })
        expect(orders).toBe(0)
    })

    it('blocks public checkout from a blacklisted IP address', async () => {
        const ip = '198.51.100.77'
        await request(app)
            .post('/api/admin/blacklist')
            .set('X-Forwarded-Host', hostHeader)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ type: 'IP', value: ip })
            .expect(201)

        const res = await request(app)
            .post('/api/orders')
            .set('X-Forwarded-Host', hostHeader)
            .set('X-Forwarded-For', ip)
            .send({
                customerName: 'Blocked IP Buyer',
                customerPhone: '0550333444',
                items: [{ productId, variantId, quantity: 1 }]
            })

        expect(res.status).toBe(403)
        expect(res.body.code).toBe('BLACKLISTED')
    })

    it('lets admins blacklist a customer straight from an order and blocks their next checkout', async () => {
        const created = await request(app)
            .post('/api/orders')
            .set('X-Forwarded-Host', hostHeader)
            .send({
                customerName: 'Repeat Offender',
                customerPhone: '0550555666',
                items: [{ productId, variantId, quantity: 1 }]
            })
        expect(created.status).toBe(201)

        const blacklisted = await request(app)
            .post(`/api/admin/orders/${created.body.orderId}/blacklist`)
            .set('X-Forwarded-Host', hostHeader)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ type: 'CUSTOMER' })

        expect(blacklisted.status).toBe(201)
        expect(blacklisted.body.type).toBe('CUSTOMER')

        const blockedRetry = await request(app)
            .post('/api/orders')
            .set('X-Forwarded-Host', hostHeader)
            .send({
                customerName: 'Repeat Offender',
                customerPhone: '0550555666',
                items: [{ productId, variantId, quantity: 1 }]
            })

        expect(blockedRetry.status).toBe(403)
        expect(blockedRetry.body.code).toBe('BLACKLISTED')
    })

    it('returns 409 when blacklisting the IP of an order with no recorded IP', async () => {
        const created = await request(app)
            .post('/api/admin/orders')
            .set('X-Forwarded-Host', hostHeader)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                customerName: 'Admin Created',
                customerPhone: '0550777888',
                items: [{ productId, variantId, quantity: 1 }]
            })
        expect(created.status).toBe(201)

        const res = await request(app)
            .post(`/api/admin/orders/${created.body.orderId}/blacklist`)
            .set('X-Forwarded-Host', hostHeader)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ type: 'IP' })

        expect(res.status).toBe(409)
    })

    it('lists and deletes blacklist entries', async () => {
        const list = await request(app)
            .get('/api/admin/blacklist')
            .set('X-Forwarded-Host', hostHeader)
            .set('Authorization', `Bearer ${adminToken}`)

        expect(list.status).toBe(200)
        expect(Array.isArray(list.body.items)).toBe(true)
        expect(list.body.items.length).toBeGreaterThan(0)

        const entry = list.body.items[0]
        const del = await request(app)
            .delete(`/api/admin/blacklist/${entry.id}`)
            .set('X-Forwarded-Host', hostHeader)
            .set('Authorization', `Bearer ${adminToken}`)

        expect(del.status).toBe(200)

        const after = await prisma.blacklistEntry.findUnique({ where: { id: entry.id } })
        expect(after).toBeNull()
    })

    it('rejects duplicate blacklist entries', async () => {
        await request(app)
            .post('/api/admin/blacklist')
            .set('X-Forwarded-Host', hostHeader)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ type: 'PHONE', value: '0551000111' })
            .expect(201)

        const dup = await request(app)
            .post('/api/admin/blacklist')
            .set('X-Forwarded-Host', hostHeader)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ type: 'PHONE', value: '0551000111' })

        expect(dup.status).toBe(409)
    })
})
