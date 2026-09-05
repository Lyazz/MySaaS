import request from 'supertest'
import jwt from 'jsonwebtoken'
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { MaystroClient } from '../../backend/src/modules/delivery/maystro/maystro.client'
import { MaystroIntegrationError } from '../../backend/src/modules/delivery/maystro/maystro.errors'
import { MaystroOrderService } from '../../backend/src/modules/delivery/maystro/maystro-order.service'

const JWT_SECRET = process.env.JWT_SECRET!

describe('Maystro Orders Management integration', () => {
    let tenant: any
    let token: string
    let order: any
    let product: any

    beforeAll(async () => {
        tenant = await prisma.tenant.create({ data: { publishedAt: new Date(), name: 'Tenant M', slug: `tenant-m-${Date.now()}` } })
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
        await prisma.productVariant.deleteMany({ where: { tenantId: tenant.id } })
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
            where: {
                tenantId_localProductId_localVariantId: {
                    tenantId: tenant.id,
                    localProductId: product.id,
                    localVariantId: ''
                }
            }
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
    it('merges repeated products into one detail line when an order spans several variants', async () => {
        // Maystro answers "Inconsistent products(missing products)" (error 50) when the
        // same product shows up on two detail lines, which is exactly what an order with
        // two attribute combinations of one product used to produce.
        const [small, large] = await Promise.all([
            prisma.productVariant.create({
                data: { tenantId: tenant.id, productId: product.id, sku: `mx-s-${Date.now()}`, price: 110 }
            }),
            prisma.productVariant.create({
                data: { tenantId: tenant.id, productId: product.id, sku: `mx-l-${Date.now()}`, price: 110 }
            })
        ])

        const variantOrder = await prisma.order.create({
            data: {
                tenantId: tenant.id,
                status: 'PENDING',
                totalAmount: 440,
                shippingAmount: 500,
                shippingCurrency: 'DZD',
                customerName: 'Bilal',
                customerPhone: '0550123999'
            }
        })

        await prisma.orderItem.createMany({
            data: [
                { tenantId: tenant.id, orderId: variantOrder.id, productId: product.id, variantId: small.id, quantity: 1, price: 110 },
                { tenantId: tenant.id, orderId: variantOrder.id, productId: product.id, variantId: large.id, quantity: 3, price: 110 }
            ]
        })

        const calls: any[] = []
        vi.spyOn(MaystroClient.prototype, 'request').mockImplementation(async (opts: any) => {
            calls.push({ method: opts.method, path: opts.path, data: opts.data })

            if (opts.method === 'POST' && opts.path === '/stock/products/') {
                return { id: `mx-prod-${opts.data.product_id}`, product_id: opts.data.product_id }
            }
            if (opts.method === 'PATCH' && opts.path.startsWith('/stock/products/')) {
                return { id: `mx-prod-${product.id}`, product_id: product.id }
            }
            if (opts.method === 'GET' && opts.path === '/base/wilayas/') return [{ code: 16, display_id: 16, name: 'Alger' }]
            if (opts.method === 'GET' && opts.path === '/base/communes/') return [{ id: 575, wilaya: 16, name: 'Alger' }]
            if (opts.method === 'POST' && opts.path === '/orders/') {
                return { id: 'mx-order-2', external_id: opts.data.external_id, tracking: 'TRK-2', success: true }
            }
            return {}
        })

        const res = await request(app)
            .post('/api/shipments')
            .set('Authorization', `Bearer ${token}`)
            .set('Host', `${tenant.slug}.swekly.com`)
            .send({
                provider: 'MAYSTRO',
                orderId: variantOrder.id,
                contactName: 'Bilal',
                contactPhone: '0550123999',
                wilayaCode: '16',
                communeCode: '575',
                addressLine1: '9 Rue Test'
            })

        expect(res.status).toBe(201)

        const orderCall = calls.find((c) => c.method === 'POST' && c.path === '/orders/')
        expect(orderCall.data.details).toHaveLength(1)
        expect(orderCall.data.details[0].product).toBe(product.id)
        expect(orderCall.data.details[0].quantity).toBe(4)
    })

    it('sends a stop-desk order to the wilaya center commune', async () => {
        // Maystro keeps one desk per wilaya, in its center commune, and rejects
        // delivery_type=2 anywhere else with "SD delivery type is not allowed outside
        // center commune" (error 45).
        const deskOrder = await prisma.order.create({
            data: {
                tenantId: tenant.id,
                status: 'PENDING',
                totalAmount: 220,
                shippingAmount: 500,
                shippingCurrency: 'DZD',
                deliveryMode: 'pickup',
                customerName: 'Chafik',
                customerPhone: '0550124777'
            }
        })

        await prisma.orderItem.create({
            data: { tenantId: tenant.id, orderId: deskOrder.id, productId: product.id, quantity: 2, price: 110 }
        })

        const calls: any[] = []
        vi.spyOn(MaystroClient.prototype, 'request').mockImplementation(async (opts: any) => {
            calls.push({ method: opts.method, path: opts.path, data: opts.data })

            if (opts.method === 'POST' && opts.path === '/stock/products/') {
                return { id: `mx-prod-${opts.data.product_id}`, product_id: opts.data.product_id }
            }
            if (opts.method === 'PATCH' && opts.path.startsWith('/stock/products/')) {
                return { id: `mx-prod-${product.id}`, product_id: product.id }
            }
            if (opts.method === 'GET' && opts.path === '/base/wilayas/') {
                return [{ code: 25, display_id: 25, name: 'Constantine', center_commune: 887 }]
            }
            if (opts.method === 'GET' && opts.path === '/base/communes/') {
                return [
                    { id: 887, wilaya: 25, name: 'Constantine' },
                    { id: 892, wilaya: 25, name: 'El Khroub' }
                ]
            }
            if (opts.method === 'POST' && opts.path === '/orders/') {
                return { id: 'mx-order-3', external_id: opts.data.external_id, tracking: 'TRK-3', success: true }
            }
            return {}
        })

        const res = await request(app)
            .post('/api/shipments')
            .set('Authorization', `Bearer ${token}`)
            .set('Host', `${tenant.slug}.swekly.com`)
            .send({
                provider: 'MAYSTRO',
                orderId: deskOrder.id,
                contactName: 'Chafik',
                contactPhone: '0550124777',
                wilayaCode: '25',
                communeCode: '892',
                addressLine1: 'Cite 500 logements'
            })

        expect(res.status).toBe(201)

        const orderCall = calls.find((c) => c.method === 'POST' && c.path === '/orders/')
        expect(orderCall.data.delivery_type).toBe(2)
        expect(orderCall.data.commune).toBe(887)
        // The shopper's own commune still reaches the driver through the address text.
        expect(String(orderCall.data.destination_text)).toContain('El Khroub')
    })
    it('cancels a Maystro order by moving it to ABORTED instead of deleting it', async () => {
        // Maystro exposes no delete for orders — DELETE answers 405 — so a cancellation
        // that used it never reached them, and the empty catch hid that.
        const cancelOrder = await prisma.order.create({
            data: {
                tenantId: tenant.id,
                status: 'CONFIRMED',
                totalAmount: 220,
                customerName: 'Dounia',
                customerPhone: '0550125888'
            }
        })
        await prisma.maystroOrderMapping.create({
            data: {
                tenantId: tenant.id,
                localOrderId: cancelOrder.id,
                externalId: cancelOrder.id,
                maystroOrderId: 'mx-order-cancel',
                success: true
            }
        })

        const calls: any[] = []
        vi.spyOn(MaystroClient.prototype, 'request').mockImplementation(async (opts: any) => {
            calls.push({ method: opts.method, path: opts.path, data: opts.data })
            return {}
        })

        const service = new MaystroOrderService(prisma)
        await service.cancelMaystroOrder({ tenantId: tenant.id, apiToken: 'test-token', localOrderId: cancelOrder.id })

        expect(calls).toHaveLength(1)
        expect(calls[0].method).toBe('PATCH')
        expect(calls[0].path).toBe('/orders/mx-order-cancel/')
        expect(calls[0].data).toEqual({ status: 50 })

        // An order Maystro has already dropped leaves nothing to cancel.
        vi.spyOn(MaystroClient.prototype, 'request').mockRejectedValue(
            new MaystroIntegrationError({ statusCode: 404, statusMessage: 'Not found' })
        )
        await expect(
            service.cancelMaystroOrder({ tenantId: tenant.id, apiToken: 'test-token', localOrderId: cancelOrder.id })
        ).resolves.toBeTruthy()

        // Any other failure means the parcel is still live and must not look cancelled.
        vi.spyOn(MaystroClient.prototype, 'request').mockRejectedValue(
            new MaystroIntegrationError({ statusCode: 502, statusMessage: 'Maystro request failed' })
        )
        await expect(
            service.cancelMaystroOrder({ tenantId: tenant.id, apiToken: 'test-token', localOrderId: cancelOrder.id })
        ).rejects.toThrow('Maystro request failed')
    })
    it('gives each attribute combination its own Maystro product, named with the attribute', async () => {
        // Maystro renders the order's product name from the catalog entry and ignores the
        // description the line carried, so a variant only reaches the picker by name when
        // it owns a remote product of its own.
        const option = await prisma.productOption.create({
            data: { tenantId: tenant.id, productId: product.id, name: 'Couleur', position: 0 }
        })
        const [blue, red] = await Promise.all([
            prisma.productOptionValue.create({
                data: { tenantId: tenant.id, optionId: option.id, label: 'Bleu', position: 0 }
            }),
            prisma.productOptionValue.create({
                data: { tenantId: tenant.id, optionId: option.id, label: 'Rouge', position: 1 }
            })
        ])
        const [blueVariant, redVariant] = await Promise.all([
            prisma.productVariant.create({
                data: { tenantId: tenant.id, productId: product.id, sku: `mx-blue-${Date.now()}`, price: 110 }
            }),
            prisma.productVariant.create({
                data: { tenantId: tenant.id, productId: product.id, sku: `mx-red-${Date.now()}`, price: 110 }
            })
        ])
        await prisma.productVariantOptionValue.createMany({
            data: [
                { tenantId: tenant.id, variantId: blueVariant.id, optionValueId: blue.id },
                { tenantId: tenant.id, variantId: redVariant.id, optionValueId: red.id }
            ]
        })

        const attributeOrder = await prisma.order.create({
            data: {
                tenantId: tenant.id,
                status: 'PENDING',
                totalAmount: 330,
                shippingAmount: 500,
                shippingCurrency: 'DZD',
                customerName: 'Nadia',
                customerPhone: '0550126444'
            }
        })
        await prisma.orderItem.createMany({
            data: [
                { tenantId: tenant.id, orderId: attributeOrder.id, productId: product.id, variantId: blueVariant.id, quantity: 1, price: 110 },
                { tenantId: tenant.id, orderId: attributeOrder.id, productId: product.id, variantId: redVariant.id, quantity: 2, price: 110 }
            ]
        })

        const calls: any[] = []
        vi.spyOn(MaystroClient.prototype, 'request').mockImplementation(async (opts: any) => {
            calls.push({ method: opts.method, path: opts.path, data: opts.data })

            if (opts.method === 'POST' && opts.path === '/stock/products/') {
                return { id: `mx-prod-${opts.data.product_id}`, product_id: opts.data.product_id }
            }
            if (opts.method === 'PATCH' && opts.path.startsWith('/stock/products/')) {
                return { id: 'mx-prod-patched' }
            }
            if (opts.method === 'GET' && opts.path === '/base/wilayas/') return [{ code: 16, display_id: 16, name: 'Alger' }]
            if (opts.method === 'GET' && opts.path === '/base/communes/') return [{ id: 575, wilaya: 16, name: 'Alger' }]
            if (opts.method === 'POST' && opts.path === '/orders/') {
                return { id: 'mx-order-4', external_id: opts.data.external_id, tracking: 'TRK-4', success: true }
            }
            return {}
        })

        const res = await request(app)
            .post('/api/shipments')
            .set('Authorization', `Bearer ${token}`)
            .set('Host', `${tenant.slug}.swekly.com`)
            .send({
                provider: 'MAYSTRO',
                orderId: attributeOrder.id,
                contactName: 'Nadia',
                contactPhone: '0550126444',
                wilayaCode: '16',
                communeCode: '575',
                addressLine1: '4 Rue Test'
            })

        expect(res.status).toBe(201)

        const catalogCalls = calls.filter((c) => c.method === 'POST' && c.path === '/stock/products/')
        expect(catalogCalls.map((c) => c.data.logistical_description).sort()).toEqual([
            'Maystro Product - Bleu',
            'Maystro Product - Rouge'
        ])
        expect(catalogCalls.map((c) => c.data.product_id).sort()).toEqual([blueVariant.id, redVariant.id].sort())

        // Distinct attribute combinations are distinct products to Maystro, so they stay
        // on separate detail lines instead of being collapsed together.
        const orderCall = calls.find((c) => c.method === 'POST' && c.path === '/orders/')
        expect(orderCall.data.details).toHaveLength(2)
        const byProduct = Object.fromEntries(orderCall.data.details.map((d: any) => [d.product, d]))
        expect(byProduct[blueVariant.id].quantity).toBe(1)
        expect(byProduct[blueVariant.id].description).toBe('Maystro Product - Bleu')
        expect(byProduct[redVariant.id].quantity).toBe(2)
        expect(byProduct[redVariant.id].description).toBe('Maystro Product - Rouge')

        const variantMapping = await prisma.maystroProductMapping.findUnique({
            where: {
                tenantId_localProductId_localVariantId: {
                    tenantId: tenant.id,
                    localProductId: product.id,
                    localVariantId: blueVariant.id
                }
            }
        })
        expect(variantMapping?.maystroProductId).toBe(blueVariant.id)
    })
})
