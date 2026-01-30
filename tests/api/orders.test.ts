import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'

describe('Public checkout order flow', () => {
    const slug = `checkout-${Date.now()}`
    const hostHeader = `${slug}.localhost:3000`
    let tenantId: string
    let productId: string
    let variantId: string
    let variantStockBefore = 0

    beforeAll(async () => {
        const tenant = await prisma.tenant.create({
            data: { name: 'Checkout Tenant', slug }
        })
        tenantId = tenant.id

        await prisma.storeSettings.create({
            data: { tenantId, cartEnabled: true, codEnabled: true }
        })

        const product = await prisma.product.create({
            data: {
                tenantId,
                title: 'COD Product',
                slug: `cod-${Date.now()}`,
                price: 150,
                stock: 10,
                isActive: true
            }
        })
        productId = product.id

        const variant = await prisma.productVariant.create({
            data: {
                productId,
                price: 175,
                stock: 5
            }
        })
        variantId = variant.id
        variantStockBefore = variant.stock
    })

    afterAll(async () => {
        await prisma.orderItem.deleteMany({ where: { order: { tenantId } } })
        await prisma.order.deleteMany({ where: { tenantId } })
        await prisma.productVariant.deleteMany({ where: { product: { tenantId } } })
        await prisma.product.deleteMany({ where: { tenantId } })
        await prisma.storeSettings.deleteMany({ where: { tenantId } })
        await prisma.tenant.deleteMany({ where: { id: tenantId } })
    })

    it('creates an order for the correct tenant via host header and decrements stock', async () => {
        const res = await request(app)
            .post('/api/orders')
            .set('X-Forwarded-Host', hostHeader)
            .send({
                customerName: 'Quick Buyer',
                customerPhone: '0550123456',
                shippingWilayaCode: '16',
                shippingCommuneCode: 'Algiers',
                items: [
                    {
                        productId,
                        variantId,
                        quantity: 2
                    }
                ]
            })

        expect(res.status).toBe(201)
        expect(res.body.orderId).toBeDefined()

        const saved = await prisma.order.findUnique({
            where: { id: res.body.orderId },
            include: { items: true }
        })

        expect(saved?.tenantId).toBe(tenantId)
        expect(saved?.items[0].variantId).toBe(variantId)
        expect(saved?.items[0].quantity).toBe(2)

        const variantAfter = await prisma.productVariant.findUnique({ where: { id: variantId } })
        expect(variantAfter?.stock).toBe(variantStockBefore - 2)
    })

    it('rejects checkout when phone is missing', async () => {
        const res = await request(app)
            .post('/api/orders')
            .set('X-Forwarded-Host', hostHeader)
            .send({
                customerName: 'No Phone',
                items: [
                    {
                        productId,
                        quantity: 1
                    }
                ]
            })

        expect(res.status).toBe(400)
        expect(res.body.statusMessage).toMatch(/phone/i)
    })
})
