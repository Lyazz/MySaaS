import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'

describe('Fraud prevention settings (blacklist toggle + duplicate order limit)', () => {
    const slug = `fraud-settings-${Date.now()}`
    const hostHeader = `${slug}.localhost:3000`
    let tenantId: string
    let adminToken: string
    let productId: string
    let variantId: string

    beforeAll(async () => {
        const tenant = await prisma.tenant.create({ data: { name: 'Fraud Settings Tenant', slug } })
        tenantId = tenant.id

        const admin = await prisma.user.create({
            data: { tenantId, email: `admin-${slug}@example.com`, role: 'admin', passwordHash: 'x' }
        })
        adminToken = signAccessToken({ userId: admin.id, email: admin.email, role: admin.role, tenantId: admin.tenantId })

        await prisma.storeSettings.create({
            data: { tenantId, cartEnabled: true, codEnabled: true, minimumOrderAmountDzd: 0, hideOptionalAddress: true }
        })

        const product = await prisma.product.create({
            data: { tenantId, title: 'Fraud Settings Product', slug: `fs-${Date.now()}`, price: 150, stock: 50, isActive: true }
        })
        productId = product.id

        const variant = await prisma.productVariant.create({
            data: { tenantId, productId, sku: `FS-${Date.now()}`, price: 150, stock: 50 }
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

    it('lets admins toggle blacklistEnabled and duplicate order limit via store settings', async () => {
        const res = await request(app)
            .patch('/api/admin/store-settings')
            .set('X-Forwarded-Host', hostHeader)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                blacklistEnabled: false,
                duplicateOrderLimitEnabled: true,
                duplicateOrderLimit: 2,
                duplicateOrderWindowHours: 24
            })

        expect(res.status).toBe(200)
        expect(res.body.blacklistEnabled).toBe(false)
        expect(res.body.duplicateOrderLimitEnabled).toBe(true)
        expect(res.body.duplicateOrderLimit).toBe(2)
        expect(res.body.duplicateOrderWindowHours).toBe(24)
    })

    it('does not block a blacklisted phone number when blacklistEnabled is false', async () => {
        await request(app)
            .patch('/api/admin/store-settings')
            .set('X-Forwarded-Host', hostHeader)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ blacklistEnabled: false, duplicateOrderLimitEnabled: false })
            .expect(200)

        await request(app)
            .post('/api/admin/blacklist')
            .set('X-Forwarded-Host', hostHeader)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ type: 'PHONE', value: '0552000000' })
            .expect(201)

        const res = await request(app)
            .post('/api/orders')
            .set('X-Forwarded-Host', hostHeader)
            .send({
                customerName: 'Not Blocked Anymore',
                customerPhone: '0552000000',
                items: [{ productId, variantId, quantity: 1 }]
            })

        expect(res.status).toBe(201)

        // Re-enable for subsequent tests / cleanliness
        await request(app)
            .patch('/api/admin/store-settings')
            .set('X-Forwarded-Host', hostHeader)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ blacklistEnabled: true })
            .expect(200)
    })

    it('blocks checkout once the duplicate order limit is reached, and stops blocking once disabled', async () => {
        await request(app)
            .patch('/api/admin/store-settings')
            .set('X-Forwarded-Host', hostHeader)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ duplicateOrderLimitEnabled: true, duplicateOrderLimit: 2, duplicateOrderWindowHours: 24 })
            .expect(200)

        const phone = '0553111222'
        const placeOrder = () =>
            request(app)
                .post('/api/orders')
                .set('X-Forwarded-Host', hostHeader)
                .send({
                    customerName: 'Duplicate Order Buyer',
                    customerPhone: phone,
                    items: [{ productId, variantId, quantity: 1 }]
                })

        const first = await placeOrder()
        expect(first.status).toBe(201)

        const second = await placeOrder()
        expect(second.status).toBe(201)

        const third = await placeOrder()
        expect(third.status).toBe(429)
        expect(third.body.code).toBe('DUPLICATE_ORDER_LIMIT')

        await request(app)
            .patch('/api/admin/store-settings')
            .set('X-Forwarded-Host', hostHeader)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ duplicateOrderLimitEnabled: false })
            .expect(200)

        const fourth = await placeOrder()
        expect(fourth.status).toBe(201)
    })

    it('rejects invalid duplicate order limit values', async () => {
        const res = await request(app)
            .patch('/api/admin/store-settings')
            .set('X-Forwarded-Host', hostHeader)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ duplicateOrderLimit: 0 })

        expect(res.status).toBe(400)
    })
})
