import request from 'supertest'
import jwt from 'jsonwebtoken'
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { MaystroClient } from '../../backend/src/modules/delivery/maystro/maystro.client'

const JWT_SECRET = process.env.JWT_SECRET!

describe('Maystro Orders Management integration', () => {
    let tenant: any
    let token: string
    let order: any
    let product: any

    beforeAll(async () => {
        tenant = await prisma.tenant.create({ data: { name: 'Tenant M', slug: `tenant-m-${Date.now()}` } })
        const user = await prisma.user.create({
            data: { email: `m-${Date.now()}@test.com`, role: 'owner', tenantId: tenant.id }
        })
        token = jwt.sign({ userId: user.id, tenantId: tenant.id }, JWT_SECRET)

        product = await prisma.product.create({
            data: { title: 'Maystro Product', slug: `mx-prod-${Date.now()}`, price: 100, tenantId: tenant.id }
        })

        order = await prisma.order.create({
            data: {
                tenantId: tenant.id,
                status: 'PENDING',
                totalAmount: 220,
                // total_price sent to Maystro is the COD amount, i.e. goods + shipping.
                // Without a shipping amount the test's expected 720 could never hold.
                shippingAmount: 500,
                shippingCurrency: 'DZD',
                customerName: 'Alice',
                customerPhone: '0550123456',
                items: {
                    create: [{ productId: product.id, quantity: 2, price: 110 }]
                }
            }
        })

        await prisma.storeSettings.upsert({
            where: { tenantId: tenant.id },
            create: { tenantId: tenant.id, allowedDeliveryProviders: ['MAYSTRO'] },
            update: { allowedDeliveryProviders: ['MAYSTRO'] }
        })

        await prisma.tenantDeliveryAccount.upsert({
            where: { tenantId_provider: { tenantId: tenant.id, provider: 'MAYSTRO' } },
            create: {
                tenantId: tenant.id,
                provider: 'MAYSTRO',
                isActive: true,
                config: { apiToken: 'test-token', storeId: 'store-123' }
            },
            update: {
                isActive: true,
                config: { apiToken: 'test-token', storeId: 'store-123' }
            }
        })
    })

    afterAll(async () => {
        vi.restoreAllMocks()
        if (!tenant?.id) return
        await prisma.maystroInventoryEvent.deleteMany({ where: { tenantId: tenant.id } })
        await prisma.maystroProductMapping.deleteMany({ where: { tenantId: tenant.id } })
        await prisma.maystroOrderMapping.deleteMany({ where: { tenantId: tenant.id } })
        await prisma.shipmentEvent.deleteMany({ where: { tenantId: tenant.id } })
        await prisma.shipment.deleteMany({ where: { tenantId: tenant.id } })
        await prisma.tenantDeliveryAccount.deleteMany({ where: { tenantId: tenant.id } })
        await prisma.orderItem.deleteMany({ where: { order: { tenantId: tenant.id } } })
        await prisma.order.deleteMany({ where: { tenantId: tenant.id } })
        await prisma.product.deleteMany({ where: { tenantId: tenant.id } })
        await prisma.user.deleteMany({ where: { tenantId: tenant.id } })
        await prisma.tenant.deleteMany({ where: { id: tenant.id } })
    })

    it('creates a Maystro shipment by syncing products then creating an order', async () => {
        const calls: any[] = []

        vi.spyOn(MaystroClient.prototype, 'request').mockImplementation(async (opts: any) => {
            calls.push({ method: opts.method, path: opts.path, params: opts.params, data: opts.data })

            if (opts.method === 'POST' && opts.path === '/stock/products/') {
                return {
                    id: `mx-prod-${opts.data.product_id}`,
                    product_id: opts.data.product_id,
                    logistical_description: opts.data.logistical_description,
                    store: opts.data.store_id
                }
            }

            if (opts.method === 'GET' && opts.path === '/base/wilayas/') {
                return [{ code: 16, display_id: 16, name: 'Alger' }]
            }

            if (opts.method === 'GET' && opts.path === '/base/communes/') {
                return [{ id: 575, wilaya: 16, name: 'Alger' }]
            }

            // The service posts to '/orders/' with the trailing slash; without it this
            // arm never matched and the call fell through to {}, so the shipment came
            // back with no id and no tracking at all.
            if (opts.method === 'POST' && opts.path === '/orders/') {
                return { id: 'mx-order-1', external_id: opts.data.external_id, tracking: 'TRK-1', success: true, delivery_price: 500 }
            }

            return {}
        })

        const res = await request(app)
            .post('/api/shipments')
            .set('Authorization', `Bearer ${token}`)
            .set('Host', `${tenant.slug}.swekly.com`)
            .send({
                provider: 'MAYSTRO',
                orderId: order.id,
                contactName: 'Alice',
                contactPhone: '0550123456',
                wilayaCode: '16',
                communeCode: '575',
                addressLine1: '123 Rue Test',
                addressLine2: 'Apt 4',
                metadata: { express: true }
            })

        expect(res.status).toBe(201)
        expect(res.body.provider).toBe('MAYSTRO')
        // providerShipmentId holds Maystro's tracking (display_id), not the order UUID —
        // the UUID lives on the mapping below.
        expect(res.body.providerShipmentId).toBe('TRK-1')

        const mapping = await prisma.maystroOrderMapping.findUnique({
            where: { tenantId_localOrderId: { tenantId: tenant.id, localOrderId: order.id } }
        })
        expect(mapping?.success).toBe(true)
        expect(mapping?.maystroOrderId).toBe('mx-order-1')
        expect(mapping?.tracking).toBe('TRK-1')

        const productMap = await prisma.maystroProductMapping.findUnique({
            where: { tenantId_localProductId: { tenantId: tenant.id, localProductId: product.id } }
        })
        expect(productMap?.syncStatus).toBe('SYNCED')
        expect(productMap?.maystroProductId).toBe(product.id)

        const orderCall = calls.find((c) => c.method === 'POST' && c.path === '/orders/')
        expect(orderCall).toBeTruthy()
        expect(orderCall.data.external_id).toBe(order.id)
        expect(orderCall.data.total_price).toBe(720)
        expect(orderCall.data.details?.[0]?.product).toBe(product.id)
        expect(orderCall.data.details?.[0]?.quantity).toBe(2)
    })

    it('rejects Maystro order creation for empty local orders', async () => {
        const emptyOrder = await prisma.order.create({
            data: {
                tenantId: tenant.id,
                status: 'PENDING',
                totalAmount: 0,
                customerName: 'No Items',
                customerPhone: '0550999999'
            }
        })

        const res = await request(app)
            .post('/api/shipments')
            .set('Authorization', `Bearer ${token}`)
            .set('Host', `${tenant.slug}.swekly.com`)
            .send({
                provider: 'MAYSTRO',
                orderId: emptyOrder.id,
                contactName: 'No Items',
                contactPhone: '0550999999',
                wilayaCode: '16',
                communeCode: '575',
                addressLine1: 'Somewhere'
            })

        expect(res.status).toBe(400)
        expect(res.body.statusMessage).toContain('at least one item')
    })
})
