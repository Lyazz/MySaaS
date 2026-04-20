import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { MaystroClient } from '../../backend/src/modules/delivery/maystro/maystro.client'

describe('Public checkout Maystro pickup handling', () => {
    const slug = `maystro-pickup-${Date.now()}`
    const hostHeader = `${slug}.localhost:3000`
    let tenantId: string
    let productId: string
    let variantId: string

    beforeAll(async () => {
        const tenant = await prisma.tenant.create({
            data: { name: 'Maystro Pickup Tenant', slug }
        })
        tenantId = tenant.id

        await prisma.storeSettings.create({
            data: {
                tenantId,
                cartEnabled: true,
                codEnabled: true,
                allowedDeliveryProviders: ['MAYSTRO']
            }
        })

        await prisma.tenantDeliveryAccount.upsert({
            where: { tenantId_provider: { tenantId, provider: 'MAYSTRO' } },
            create: {
                tenantId,
                provider: 'MAYSTRO',
                isActive: true,
                config: { apiToken: 'test-token', storeId: 'store-xyz' }
            },
            update: {
                isActive: true,
                config: { apiToken: 'test-token', storeId: 'store-xyz' }
            }
        })

        const product = await prisma.product.create({
            data: {
                tenantId,
                title: 'Maystro Pickup Product',
                slug: `maystro-pickup-prod-${Date.now()}`,
                price: 1200,
                stock: 10,
                isActive: true
            }
        })
        productId = product.id

        const variant = await prisma.productVariant.create({
            data: {
                tenantId,
                productId,
                sku: `MAYSTRO-PICKUP-${Date.now()}`,
                price: 1200,
                stock: 10
            }
        })
        variantId = variant.id
    })

    afterAll(async () => {
        vi.restoreAllMocks()
        await prisma.orderItem.deleteMany({ where: { order: { tenantId } } })
        await prisma.order.deleteMany({ where: { tenantId } })
        await prisma.productVariant.deleteMany({ where: { tenantId } })
        await prisma.product.deleteMany({ where: { tenantId } })
        await prisma.tenantDeliveryAccount.deleteMany({ where: { tenantId } })
        await prisma.storeSettings.deleteMany({ where: { tenantId } })
        await prisma.tenant.deleteMany({ where: { id: tenantId } })
    })

    it('resolves Maystro pickup point label to numeric pickup_point id', async () => {
        vi.spyOn(MaystroClient.prototype, 'request').mockImplementation(async (opts: any) => {
            if (opts.method === 'GET' && opts.path === '/base/pickup-points/') {
                return [
                    { commune: 1605, pickup_point: null, delivery_type: 2, active: true, name_lt: 'Stop Desk Hydra' },
                    { commune: 1605, pickup_point: 445, delivery_type: 3, active: true, name_lt: 'Relais Hydra' }
                ]
            }
            return []
        })

        const res = await request(app)
            .post('/api/orders')
            .set('X-Forwarded-Host', hostHeader)
            .send({
                customerName: 'Pickup Buyer',
                customerPhone: '0550123456',
                shippingProvider: 'MAYSTRO',
                deliveryMode: 'pickup',
                shippingWilayaCode: '16',
                shippingCommuneCode: '1605',
                shippingPickupPoint: 'Relais Hydra',
                items: [{ productId, variantId, quantity: 1 }]
            })

        expect(res.status).toBe(201)
        const orderId = res.body.orderId as string
        const saved = await prisma.order.findUnique({ where: { id: orderId } })
        expect(saved?.tenantId).toBe(tenantId)
        expect(saved?.shippingProvider).toBe('MAYSTRO')
        expect(saved?.deliveryMode).toBe('pickup')
        expect(saved?.shippingPickupPoint).toBe(445)
    })

    it('accepts stop-desk pickup mode without shippingPickupPoint', async () => {
        const res = await request(app)
            .post('/api/orders')
            .set('X-Forwarded-Host', hostHeader)
            .send({
                customerName: 'Stop Desk Buyer',
                customerPhone: '0550111111',
                shippingProvider: 'MAYSTRO',
                deliveryMode: 'pickup',
                shippingWilayaCode: '16',
                shippingCommuneCode: '1605',
                items: [{ productId, variantId, quantity: 1 }]
            })

        expect(res.status).toBe(201)
        const orderId = res.body.orderId as string
        const saved = await prisma.order.findUnique({ where: { id: orderId } })
        expect(saved?.shippingPickupPoint).toBeNull()
    })

    it('rejects unknown Maystro pickup point label', async () => {
        vi.spyOn(MaystroClient.prototype, 'request').mockImplementation(async (opts: any) => {
            if (opts.method === 'GET' && opts.path === '/base/pickup-points/') {
                return [{ commune: 1605, pickup_point: 445, delivery_type: 3, active: true, name_lt: 'Relais Hydra' }]
            }
            return []
        })

        const res = await request(app)
            .post('/api/orders')
            .set('X-Forwarded-Host', hostHeader)
            .send({
                customerName: 'Invalid Relais Buyer',
                customerPhone: '0550222222',
                shippingProvider: 'MAYSTRO',
                deliveryMode: 'pickup',
                shippingWilayaCode: '16',
                shippingCommuneCode: '1605',
                shippingPickupPoint: 'Unknown Relais',
                items: [{ productId, variantId, quantity: 1 }]
            })

        expect(res.status).toBe(400)
        expect(res.body.statusMessage).toContain('Invalid Maystro pickup point')
    })
})
