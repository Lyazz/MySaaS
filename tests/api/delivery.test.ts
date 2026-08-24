import request from 'supertest'
import jwt from 'jsonwebtoken'
import { createHmac } from 'node:crypto'
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { MaystroProvider } from '../../backend/src/modules/delivery/providers/maystro.provider'
import { YalidineProvider } from '../../backend/src/modules/delivery/providers/yalidine.provider'
import { MaystroClient } from '../../backend/src/modules/delivery/maystro/maystro.client'
import { MaystroLocationService } from '../../backend/src/modules/delivery/maystro/maystro-location.service'
import { MaystroPickupPointService } from '../../backend/src/modules/delivery/maystro/maystro-pickup-point.service'
import { YalidineLocationService } from '../../backend/src/modules/delivery/yalidine/yalidine-location.service'
import { YalidineClient } from '../../backend/src/modules/delivery/yalidine/yalidine.client'

const JWT_SECRET = process.env.JWT_SECRET!

describe('Delivery API', () => {
    let tenantA: any
    let tenantB: any
    let tokenA: string
    let tokenB: string
    let orderA: any
    let orderB: any
    let shipmentSelfId: string
    let deliveryCashboxAId: string

    beforeAll(async () => {
        tenantA = await prisma.tenant.create({ data: { name: 'Tenant A', slug: `tenant-a-${Date.now()}` } })
        tenantB = await prisma.tenant.create({ data: { name: 'Tenant B', slug: `tenant-b-${Date.now()}` } })

        const userA = await prisma.user.create({
            data: { email: `a-${Date.now()}@test.com`, role: 'owner', tenantId: tenantA.id }
        })
        const userB = await prisma.user.create({
            data: { email: `b-${Date.now()}@test.com`, role: 'owner', tenantId: tenantB.id }
        })

        tokenA = jwt.sign({ userId: userA.id, tenantId: tenantA.id }, JWT_SECRET)
        tokenB = jwt.sign({ userId: userB.id, tenantId: tenantB.id }, JWT_SECRET)

        const productA = await prisma.product.create({
            data: { title: 'Prod A', slug: `prod-a-${Date.now()}`, price: 100, tenantId: tenantA.id }
        })
        const productB = await prisma.product.create({
            data: { title: 'Prod B', slug: `prod-b-${Date.now()}`, price: 120, tenantId: tenantB.id }
        })

        orderA = await prisma.order.create({
            data: {
                tenantId: tenantA.id,
                status: 'PENDING',
                totalAmount: 220,
                shippingAmount: 500,
                shippingCurrency: 'DZD',
                customerName: 'Alice',
                customerPhone: '0550123456',
                items: {
                    create: [{ productId: productA.id, quantity: 2, price: 110 }]
                }
            }
        })

        orderB = await prisma.order.create({
            data: {
                tenantId: tenantB.id,
                status: 'PENDING',
                totalAmount: 120,
                customerName: 'Bob',
                customerPhone: '0550000000',
                items: {
                    create: [{ productId: productB.id, quantity: 1, price: 120 }]
                }
            }
        })

        // Seed fallback rate for self delivery
        await prisma.deliveryRate.create({
            data: {
                tenantId: tenantA.id,
                provider: 'SELF',
                wilayaCode: '16',
                price: 500
            }
        })

        // Seed home/office rates for rate-shopping demo
        await prisma.deliveryRate.createMany({
            data: [
                { tenantId: tenantA.id, provider: 'SELF', wilayaCode: '16', serviceLevel: 'home', price: 600 },
                { tenantId: tenantA.id, provider: 'SELF', wilayaCode: '16', serviceLevel: 'office', price: 400 }
            ]
        })

        const cashbox = await prisma.cashbox.create({
            data: {
                tenantId: tenantA.id,
                name: 'Delivery Cashbox',
                isActive: true
            }
        })
        deliveryCashboxAId = cashbox.id
        await prisma.cashSession.create({
            data: {
                tenantId: tenantA.id,
                cashboxId: deliveryCashboxAId,
                status: 'OPEN',
                openingFloat: 0,
                openedByUserId: userA.id
            }
        })
    })

    afterAll(async () => {
        vi.restoreAllMocks()
        if (!tenantA?.id || !tenantB?.id) return
        const tenantIds = [tenantA.id, tenantB.id]
        await prisma.customerPayment.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.supplierPayment.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.cashTransaction.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.cashSession.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.cashbox.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.saleItem.deleteMany({ where: { sale: { tenantId: { in: tenantIds } } } })
        await prisma.sale.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.inventoryMovement.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.shipmentEvent.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.shipment.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.deliveryRate.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.tenantDeliveryAccount.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.maystroProductMapping.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.maystroOrderMapping.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.maystroInventoryEvent.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.orderItem.deleteMany({ where: { order: { tenantId: { in: tenantIds } } } })
        await prisma.order.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.product.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.user.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } })
    })

    it('returns delivery options using fallback rates when provider quote missing', async () => {
        const res = await request(app)
            .post('/api/delivery/options')
            .set('Authorization', `Bearer ${tokenA}`)
            .set('Host', `${tenantA.slug}.swekly.com`)
            .send({
                provider: 'SELF',
                destination: { wilayaCode: '16' }
            })

        expect(res.status).toBe(200)
        expect(Array.isArray(res.body)).toBe(true)
        expect(res.body[0].price).toBe(500)
        expect(res.body[0].source).toBe('fallback-rate')
    })

    it('rate-shops across offered providers when provider is omitted', async () => {
        const res = await request(app)
            .post('/api/delivery/options')
            .set('Host', `${tenantA.slug}.swekly.com`)
            .send({
                destination: { wilayaCode: '16' }
            })

        expect(res.status).toBe(200)
        expect(Array.isArray(res.body)).toBe(true)
        expect(res.body.some((o: any) => o.provider === 'SELF')).toBe(true)
    })

    it('supports home/office deliveryMode pricing via serviceLevel', async () => {
        const home = await request(app)
            .post('/api/delivery/options')
            .set('Host', `${tenantA.slug}.swekly.com`)
            .send({
                provider: 'SELF',
                destination: { wilayaCode: '16' },
                deliveryMode: 'home'
            })

        expect(home.status).toBe(200)
        expect(home.body[0].price).toBe(600)

        const office = await request(app)
            .post('/api/delivery/options')
            .set('Host', `${tenantA.slug}.swekly.com`)
            .send({
                provider: 'SELF',
                destination: { wilayaCode: '16' },
                deliveryMode: 'office'
            })

        expect(office.status).toBe(200)
        expect(office.body[0].price).toBe(400)
    })

    it('does not allow tenant resolution via x-tenant-id header', async () => {
        const res = await request(app)
            .get('/api/delivery/companies')
            .set('x-tenant-id', tenantA.id)

        expect(res.status).toBe(400)
        expect(res.body.statusMessage).toContain('Tenant is required')
    })

    it('creates self shipment idempotently', async () => {
        const payload = {
            provider: 'SELF',
            orderId: orderA.id,
            contactName: 'Alice',
            contactPhone: '0550123456',
            wilayaCode: '16',
            addressLine1: '123 Rue Test'
        }

        const first = await request(app)
            .post('/api/shipments')
            .set('Authorization', `Bearer ${tokenA}`)
            .set('Host', `${tenantA.slug}.swekly.com`)
            .send(payload)

        expect(first.status).toBe(201)
        shipmentSelfId = first.body.id

        const second = await request(app)
            .post('/api/shipments')
            .set('Authorization', `Bearer ${tokenA}`)
            .set('Host', `${tenantA.slug}.swekly.com`)
            .send(payload)

        expect(second.status).toBe(201)
        expect(second.body.id).toBe(shipmentSelfId)
    })

    it('pushes total + delivery fee as codAmount to external delivery providers', async () => {
        await prisma.tenantDeliveryAccount.upsert({
            where: { tenantId_provider: { tenantId: tenantA.id, provider: 'YALIDINE' } },
            create: {
                tenantId: tenantA.id,
                provider: 'YALIDINE',
                isActive: true,
                config: { apiId: 'api-id', apiToken: 'api-token' }
            },
            update: {
                isActive: true,
                config: { apiId: 'api-id', apiToken: 'api-token' }
            }
        })

        const providerSpy = vi.spyOn(YalidineProvider.prototype, 'createShipment').mockResolvedValue({
            providerShipmentId: 'yal-1',
            status: 'REQUESTED',
            price: 450,
            currency: 'DZD'
        })

        const res = await request(app)
            .post('/api/shipments')
            .set('Authorization', `Bearer ${tokenA}`)
            .set('Host', `${tenantA.slug}.swekly.com`)
            .send({
                provider: 'YALIDINE',
                orderId: orderA.id,
                contactName: 'Alice',
                contactPhone: '0550123456',
                wilayaCode: '16',
                communeCode: '1605',
                addressLine1: '123 Rue Test'
            })

        expect(res.status).toBe(201)
        expect(providerSpy).toHaveBeenCalledTimes(1)
        expect(providerSpy.mock.calls[0]?.[0]?.codAmount).toBe(720)
    })

    it('automatically creates a Yalidine shipment when confirming a Yalidine order', async () => {
        const product = await prisma.product.create({
            data: { tenantId: tenantA.id, title: 'Yalidine Auto Product', slug: `yal-auto-${Date.now()}`, price: 1000 }
        })
        const order = await prisma.order.create({
            data: {
                tenantId: tenantA.id,
                status: 'PENDING',
                totalAmount: 1000,
                shippingAmount: 400,
                shippingProvider: 'YALIDINE',
                shippingWilayaCode: '05',
                shippingCommuneCode: '501',
                shippingAddressLine1: '123 Rue Carrier',
                deliveryMode: 'home',
                customerName: 'Yalidine Alice',
                customerPhone: '0550999888',
                items: { create: [{ productId: product.id, quantity: 1, price: 1000 }] }
            }
        })

        await prisma.tenantDeliveryAccount.upsert({
            where: { tenantId_provider: { tenantId: tenantA.id, provider: 'YALIDINE' } },
            create: {
                tenantId: tenantA.id,
                provider: 'YALIDINE',
                isActive: true,
                config: { apiId: 'api-id', apiToken: 'api-token' }
            },
            update: {
                isActive: true,
                config: { apiId: 'api-id', apiToken: 'api-token' }
            }
        })

        const providerSpy = vi.spyOn(YalidineProvider.prototype, 'createShipment').mockResolvedValue({
            providerShipmentId: 'yal-auto-1',
            status: 'REQUESTED',
            price: 400,
            currency: 'DZD'
        })
        providerSpy.mockClear()

        const res = await request(app)
            .patch(`/api/admin/orders/${order.id}`)
            .set('Authorization', `Bearer ${tokenA}`)
            .set('Host', `${tenantA.slug}.swekly.com`)
            .send({ status: 'CONFIRMED' })

        expect(res.status).toBe(200)
        expect(providerSpy).toHaveBeenCalledTimes(1)
        expect(providerSpy.mock.calls[0]?.[0]).toMatchObject({
            tenantId: tenantA.id,
            provider: 'YALIDINE',
            orderId: order.id,
            contactName: 'Yalidine Alice',
            contactPhone: '0550999888',
            wilayaCode: '05',
            communeCode: '501',
            addressLine1: '123 Rue Carrier',
            deliveryMode: 'home',
            codAmount: 1400
        })

        const shipment = await prisma.shipment.findFirst({
            where: { tenantId: tenantA.id, orderId: order.id, provider: 'YALIDINE' }
        })
        expect(shipment?.providerShipmentId).toBe('yal-auto-1')
    })

    it('enforces tenant isolation for shipment fetch', async () => {
        const res = await request(app)
            .get(`/api/shipments/${shipmentSelfId}`)
            .set('Authorization', `Bearer ${tokenB}`)
            .set('Host', `${tenantB.slug}.swekly.com`)

        expect(res.status).toBe(404)
    })

    it('blocks manual status changes after confirmation for carrier-controlled orders', async () => {
        const confirm = await request(app)
            .patch(`/api/admin/orders/${orderA.id}`)
            .set('Authorization', `Bearer ${tokenA}`)
            .set('Host', `${tenantA.slug}.swekly.com`)
            .send({ status: 'CONFIRMED' })

        expect(confirm.status).toBe(200)
        expect(confirm.body.status).toBe('CONFIRMED')

        const ship = await request(app)
            .patch(`/api/admin/orders/${orderA.id}`)
            .set('Authorization', `Bearer ${tokenA}`)
            .set('Host', `${tenantA.slug}.swekly.com`)
            .send({ status: 'SHIPPED' })

        expect(ship.status).toBe(409)
        expect(ship.body.statusMessage).toContain('controlled by the delivery carrier')
    })

    it('updates self delivery status (admin protected)', async () => {
        const res = await request(app)
            .post(`/api/self/shipments/${shipmentSelfId}/status`)
            .set('Authorization', `Bearer ${tokenA}`)
            .set('Host', `${tenantA.slug}.swekly.com`)
            .send({ status: 'DELIVERED' })

        expect(res.status).toBe(200)
        expect(res.body.status).toBe('DELIVERED')

        const cashboxAfter = await prisma.cashbox.findUnique({ where: { id: deliveryCashboxAId } })
        expect(cashboxAfter?.isActive).toBe(true)

        const session = await prisma.cashSession.findFirst({
            where: { tenantId: tenantA.id, cashboxId: deliveryCashboxAId, status: 'OPEN' },
            orderBy: { openedAt: 'desc' }
        })
        expect(session?.id).toBeTruthy()

        const cashTx = await prisma.cashTransaction.findFirst({
            where: {
                tenantId: tenantA.id,
                orderId: orderA.id,
                direction: 'IN',
                type: 'SALE_PAYMENT'
            },
            orderBy: { createdAt: 'desc' }
        })
        expect(cashTx?.cashboxId).toBe(deliveryCashboxAId)
        expect(String(cashTx?.amount)).toBe('720')
    })

    it('handles Maystro webhook decoding and status update', async () => {
        // Create placeholder Maystro shipment record
        const maystroShipment = await prisma.shipment.create({
            data: {
                tenantId: tenantA.id,
                orderId: orderA.id,
                provider: 'MAYSTRO',
                providerShipmentId: 'mx-123',
                status: 'PENDING',
                contactName: 'Alice',
                contactPhone: '0550123456',
                wilayaCode: '16',
                addressLine1: '123 Rue Test'
            }
        })

        await prisma.maystroOrderMapping.create({
            data: {
                tenantId: tenantA.id,
                localOrderId: orderA.id,
                externalId: orderA.id,
                maystroOrderId: 'mx-123',
                success: true
            }
        })

        const inner = Buffer.from(
            JSON.stringify({
                event: 'OrderStatusChanged',
                payload: { id: 'mx-123', external_id: orderA.id, status: 41, status_label: 'Delivered' }
            }),
            'utf8'
        ).toString('base64')
        const double = Buffer.from(inner, 'utf8').toString('base64')

        const res = await request(app)
            .post('/api/webhooks/maystro')
            .set('Host', `${tenantA.slug}.swekly.com`)
            .send({ payload: double })
        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)

        const updated = await prisma.shipment.findUnique({ where: { id: maystroShipment.id } })
        expect(updated?.status).toBe('DELIVERED')

        const updatedOrder = await prisma.order.findUnique({ where: { id: orderA.id } })
        expect(updatedOrder?.status).toBe('DELIVERED')
    })

    it('handles Yalidine webhook validation, signature verification, and duplicate events', async () => {
        const product = await prisma.product.create({
            data: {
                tenantId: tenantA.id,
                title: 'Yalidine Webhook Product',
                slug: `yal-webhook-${Date.now()}`,
                price: 500
            }
        })
        const order = await prisma.order.create({
            data: {
                tenantId: tenantA.id,
                status: 'CONFIRMED',
                totalAmount: 500,
                customerName: 'Yalidine Webhook Alice',
                customerPhone: '0550777666',
                items: {
                    create: [{ productId: product.id, quantity: 1, price: 500 }]
                }
            }
        })
        const shipment = await prisma.shipment.create({
            data: {
                tenantId: tenantA.id,
                orderId: order.id,
                provider: 'YALIDINE',
                providerShipmentId: 'yal-webhook-1',
                status: 'REQUESTED',
                contactName: 'Yalidine Webhook Alice',
                contactPhone: '0550777666',
                wilayaCode: '16',
                communeCode: '1605',
                addressLine1: '123 Rue Webhook'
            }
        })

        await prisma.tenantDeliveryAccount.upsert({
            where: { tenantId_provider: { tenantId: tenantA.id, provider: 'YALIDINE' } },
            create: {
                tenantId: tenantA.id,
                provider: 'YALIDINE',
                isActive: true,
                config: { apiId: 'api-id', apiToken: 'api-token', webhookSecret: 'yal-secret' }
            },
            update: {
                isActive: true,
                config: { apiId: 'api-id', apiToken: 'api-token', webhookSecret: 'yal-secret' }
            }
        })

        const challenge = await request(app)
            .get('/api/webhooks/yalidine?subscribe=1&crc_token=crc-123')
            .set('Host', `${tenantA.slug}.swekly.com`)

        expect(challenge.status).toBe(200)
        expect(challenge.body).toEqual({ crc_token: 'crc-123' })

        const payload = {
            type: 'parcel_status_updated',
            events: [
                {
                    event_id: 'evt-yal-1',
                    occurred_at: '2026-05-09 14:55:00',
                    data: {
                        tracking: 'yal-webhook-1',
                        order_id: order.id,
                        status: 'Expédié'
                    }
                }
            ]
        }
        const rawBody = JSON.stringify(payload)
        const signature = createHmac('sha256', 'yal-secret').update(rawBody).digest('hex')

        const invalid = await request(app)
            .post('/api/webhooks/yalidine')
            .set('Host', `${tenantA.slug}.swekly.com`)
            .set('Content-Type', 'application/json')
            .set('X-YALIDINE-SIGNATURE', 'bad-signature')
            .send(rawBody)

        expect(invalid.status).toBe(401)

        const first = await request(app)
            .post('/api/webhooks/yalidine')
            .set('Host', `${tenantA.slug}.swekly.com`)
            .set('Content-Type', 'application/json')
            .set('X-YALIDINE-SIGNATURE', signature)
            .send(rawBody)

        expect(first.status).toBe(200)
        expect(first.body.processed).toBe(1)

        const duplicate = await request(app)
            .post('/api/webhooks/yalidine')
            .set('Host', `${tenantA.slug}.swekly.com`)
            .set('Content-Type', 'application/json')
            .set('X-YALIDINE-SIGNATURE', signature)
            .send(rawBody)

        expect(duplicate.status).toBe(200)
        expect(duplicate.body.duplicates).toBe(1)

        const updatedShipment = await prisma.shipment.findUnique({ where: { id: shipment.id } })
        expect(updatedShipment?.status).toBe('IN_TRANSIT')

        const updatedOrder = await prisma.order.findFirst({ where: { tenantId: tenantA.id, id: order.id } })
        expect(updatedOrder?.status).toBe('SHIPPED')

        const events = await prisma.shipmentEvent.findMany({
            where: { tenantId: tenantA.id, shipmentId: shipment.id, code: 'yalidine:evt-yal-1' }
        })
        expect(events).toHaveLength(1)
    })

    it('uses the synced Maystro product id when creating a shipment for a confirmed order', async () => {
        const mappedProduct = await prisma.product.create({
            data: {
                tenantId: tenantA.id,
                title: 'Mapped Product',
                slug: `mapped-product-${Date.now()}`,
                price: 250
            }
        })

        const mappedOrder = await prisma.order.create({
            data: {
                tenantId: tenantA.id,
                status: 'PENDING',
                totalAmount: 250,
                customerName: 'Mapped Alice',
                customerPhone: '0550555555',
                items: {
                    create: [{ productId: mappedProduct.id, quantity: 1, price: 250 }]
                }
            }
        })

        await prisma.storeSettings.upsert({
            where: { tenantId: tenantA.id },
            create: { tenantId: tenantA.id, allowedDeliveryProviders: ['MAYSTRO'] },
            update: { allowedDeliveryProviders: ['MAYSTRO'] }
        })

        await prisma.tenantDeliveryAccount.upsert({
            where: { tenantId_provider: { tenantId: tenantA.id, provider: 'MAYSTRO' } },
            create: {
                tenantId: tenantA.id,
                provider: 'MAYSTRO',
                isActive: true,
                config: { apiToken: 'tenant-maystro-token', storeId: 'store-123' }
            },
            update: {
                isActive: true,
                config: { apiToken: 'tenant-maystro-token', storeId: 'store-123' }
            }
        })

        await prisma.maystroProductMapping.create({
            data: {
                tenantId: tenantA.id,
                localProductId: mappedProduct.id,
                maystroProductId: 'remote-product-123',
                maystroUuid: 'remote-uuid-123',
                syncStatus: 'SYNCED',
                lastSyncedAt: new Date()
            }
        })

        const calls: any[] = []
        vi.spyOn(MaystroClient.prototype, 'request').mockImplementation(async (opts: any) => {
            calls.push({ method: opts.method, path: opts.path, params: opts.params, data: opts.data })

            if (opts.method === 'PATCH' && opts.path === '/stock/products/remote-product-123/') {
                return {
                    id: 'remote-uuid-123',
                    product_id: 'remote-product-123',
                    logistical_description: opts.data.logistical_description,
                    store: 'store-123'
                }
            }

            if (opts.method === 'GET' && opts.path === '/base/wilayas/') {
                return [{ id: 16, name: 'Alger' }]
            }

            if (opts.method === 'GET' && opts.path === '/base/communes/') {
                return [{ id: 1605, wilaya: 16, name: 'Hydra' }]
            }

            if (opts.method === 'POST' && opts.path === '/orders/') {
                expect(opts.data.details?.[0]?.product).toBe('remote-product-123')
                return {
                    id: 'mx-order-remote-1',
                    external_id: opts.data.external_id,
                    tracking: 'TRK-REMOTE-1',
                    success: true,
                    delivery_price: 300
                }
            }

            return {}
        })

        const res = await request(app)
            .post('/api/shipments')
            .set('Authorization', `Bearer ${tokenA}`)
            .set('Host', `${tenantA.slug}.swekly.com`)
            .send({
                provider: 'MAYSTRO',
                orderId: mappedOrder.id,
                contactName: 'Mapped Alice',
                contactPhone: '0550555555',
                wilayaCode: '16',
                communeCode: '1605',
                addressLine1: '456 Rue Sync'
            })

        expect(res.status).toBe(201)
        expect(res.body.providerShipmentId).toBe('TRK-REMOTE-1')

        const orderCall = calls.find((c) => c.method === 'POST' && c.path === '/orders/')
        expect(orderCall?.data?.details?.[0]?.product).toBe('remote-product-123')

        const mapping = await prisma.maystroProductMapping.findUnique({
            where: { tenantId_localProductId: { tenantId: tenantA.id, localProductId: mappedProduct.id } }
        })
        expect(mapping?.syncStatus).toBe('SYNCED')
        expect(mapping?.maystroProductId).toBe('remote-product-123')
    })

    it('allows tenant admins to configure carrier credentials without leaking secrets', async () => {
        const list = await request(app)
            .get('/api/admin/delivery/providers')
            .set('Authorization', `Bearer ${tokenA}`)
            .set('Host', `${tenantA.slug}.swekly.com`)

        expect(list.status).toBe(200)
        expect(Array.isArray(list.body)).toBe(true)
        expect(list.body.some((p: any) => p.provider === 'MAYSTRO')).toBe(true)

        const upsert = await request(app)
            .put('/api/admin/delivery/providers/MAYSTRO/account')
            .set('Authorization', `Bearer ${tokenA}`)
            .set('Host', `${tenantA.slug}.swekly.com`)
            .send({
                offered: true,
                isActive: true,
                config: { apiToken: 'tenant-maystro-token', storeId: 'store-123', baseURL: 'https://evil.example.com' }
            })

        expect(upsert.status).toBe(200)
        expect(upsert.body.provider).toBe('MAYSTRO')
        expect(upsert.body.offered).toBe(true)
        expect(upsert.body.account?.isActive).toBe(true)
        expect(upsert.body.account?.secrets?.apiToken).toBe(true)
        expect(upsert.body.account?.config?.apiToken).toBeUndefined()
        expect(upsert.body.account?.config?.storeId).toBe('store-123')

        const stored = await prisma.tenantDeliveryAccount.findUnique({
            where: { tenantId_provider: { tenantId: tenantA.id, provider: 'MAYSTRO' } }
        })
        expect((stored?.config as any)?.baseURL).toBeUndefined()
    })

    it('applies tenant override rates on top of provider quotes', async () => {
        await request(app)
            .put('/api/admin/delivery/providers/MAYSTRO/account')
            .set('Authorization', `Bearer ${tokenA}`)
            .set('Host', `${tenantA.slug}.swekly.com`)
            .send({
                offered: true,
                isActive: true,
                config: { apiToken: 'tenant-maystro-token', storeId: 'store-123' }
            })

        vi.spyOn(MaystroProvider.prototype, 'quote').mockImplementation(async (input: any) => [
            {
                provider: 'MAYSTRO',
                serviceLevel: input.serviceLevel,
                price: 1000,
                currency: 'DZD',
                source: 'provider'
            }
        ])

        await prisma.deliveryRate.create({
            data: {
                tenantId: tenantA.id,
                provider: 'MAYSTRO',
                wilayaCode: '16',
                serviceLevel: 'home',
                price: 777
            }
        })

        const res = await request(app)
            .post('/api/delivery/options')
            .set('Host', `${tenantA.slug}.swekly.com`)
            .send({
                provider: 'MAYSTRO',
                destination: { wilayaCode: '16', communeCode: '575' },
                deliveryMode: 'home'
            })

        expect(res.status).toBe(200)
        expect(res.body[0].source).toBe('tenant-override')
        expect(res.body[0].providerPrice).toBe(1000)
        expect(res.body[0].price).toBe(777)
    })

    it('requires active provider credentials to fetch live carrier rates', async () => {
        const res = await request(app)
            .get('/api/admin/delivery/providers/MAYSTRO/live-rates?deliveryMode=home')
            .set('Authorization', `Bearer ${tokenB}`)
            .set('Host', `${tenantB.slug}.swekly.com`)

        expect(res.status).toBe(400)
        expect(res.body.statusMessage).toContain('credentials')
    })

    it('returns live carrier rates per wilaya when configured', async () => {
        await request(app)
            .put('/api/admin/delivery/providers/MAYSTRO/account')
            .set('Authorization', `Bearer ${tokenA}`)
            .set('Host', `${tenantA.slug}.swekly.com`)
            .send({
                offered: true,
                isActive: true,
                config: { apiToken: 'tenant-maystro-token', storeId: 'store-123' }
            })

        vi.spyOn(MaystroProvider.prototype, 'quote').mockImplementation(async (input: any) => {
            const numeric = Number(String(input.destination?.wilayaCode || '0'))
            return [
                {
                    provider: 'MAYSTRO',
                    serviceLevel: input.serviceLevel,
                    price: numeric * 10,
                    currency: 'DZD',
                    source: 'provider'
                }
            ]
        })

        const res = await request(app)
            .get('/api/admin/delivery/providers/MAYSTRO/live-rates?deliveryMode=home')
            .set('Authorization', `Bearer ${tokenA}`)
            .set('Host', `${tenantA.slug}.swekly.com`)

        expect(res.status).toBe(200)
        expect(Array.isArray(res.body)).toBe(true)
        expect(res.body.length).toBe(58)
        const w16 = res.body.find((r: any) => r.wilayaCode === '16')
        expect(w16?.carrierPrice).toBe(160)
    })

    it('resolves the same commune name independently against Maystro and Yalidine during rate-shopping', async () => {
        vi.restoreAllMocks()

        await request(app)
            .put('/api/admin/delivery/providers/MAYSTRO/account')
            .set('Authorization', `Bearer ${tokenA}`)
            .set('Host', `${tenantA.slug}.swekly.com`)
            .send({
                offered: true,
                isActive: true,
                config: { apiToken: 'tenant-maystro-token', storeId: 'store-123' }
            })

        await request(app)
            .put('/api/admin/delivery/providers/YALIDINE/account')
            .set('Authorization', `Bearer ${tokenA}`)
            .set('Host', `${tenantA.slug}.swekly.com`)
            .send({
                offered: true,
                isActive: true,
                config: { apiId: 'tenant-yalidine-id', apiToken: 'tenant-yalidine-token' }
            })

        await prisma.storeSettings.upsert({
            where: { tenantId: tenantA.id },
            create: { tenantId: tenantA.id, allowedDeliveryProviders: ['MAYSTRO', 'YALIDINE'] },
            update: { allowedDeliveryProviders: ['MAYSTRO', 'YALIDINE'] }
        })

        // Maystro's own internal commune id for "Hydra" is 1605.
        vi.spyOn(MaystroClient.prototype, 'request').mockImplementation(async (opts: any) => {
            if (opts.method === 'GET' && opts.path === '/base/wilayas/') {
                return [{ id: 31, name: 'Oran' }]
            }
            if (opts.method === 'GET' && opts.path === '/base/communes/') {
                return [{ id: 1605, wilaya: 31, name: 'Hydra' }]
            }
            if (opts.method === 'GET' && opts.path === '/base/delivery-prices/') {
                expect(opts.params.commune).toBe('1605')
                return { delivery_price: 450 }
            }
            return {}
        })

        // Yalidine's own internal commune id for "Hydra" is a completely different number (9876).
        vi.spyOn(YalidineClient.prototype, 'request').mockImplementation(async (opts: any) => {
            if (opts.method === 'GET' && opts.path === '/fees/') {
                return {
                    from_wilaya_name: 'Oran',
                    to_wilaya_name: 'Oran',
                    oversize_fee: 0,
                    per_commune: {
                        '9876': { commune_id: 9876, commune_name: 'Hydra', express_home: 380, express_desk: 300 }
                    }
                }
            }
            return {}
        })

        const res = await request(app)
            .post('/api/delivery/options')
            .set('Host', `${tenantA.slug}.swekly.com`)
            .send({
                destination: { wilayaCode: '31', communeCode: 'Hydra' },
                deliveryMode: 'home'
            })

        expect(res.status).toBe(200)
        const byProvider = Object.fromEntries(res.body.map((q: any) => [q.provider, q]))
        expect(byProvider.MAYSTRO?.price).toBe(450)
        expect(byProvider.YALIDINE?.price).toBe(380)
    })

    it('GET /api/delivery/communes merges and dedupes commune names across offered providers', async () => {
        vi.restoreAllMocks()

        await prisma.storeSettings.upsert({
            where: { tenantId: tenantA.id },
            create: { tenantId: tenantA.id, allowedDeliveryProviders: ['MAYSTRO', 'YALIDINE'] },
            update: { allowedDeliveryProviders: ['MAYSTRO', 'YALIDINE'] }
        })

        vi.spyOn(MaystroProvider.prototype, 'listCommunes').mockResolvedValue([
            { name: 'Hydra' },
            { name: 'Birkhadem' }
        ])
        // Same commune as Maystro's "Hydra", spelled differently by Yalidine's own catalog,
        // plus one commune Maystro doesn't have.
        vi.spyOn(YalidineProvider.prototype, 'listCommunes').mockResolvedValue([
            { name: 'HYDRA' },
            { name: 'Es Senia' }
        ])

        const res = await request(app)
            .get('/api/delivery/communes?wilaya=16')
            .set('Host', `${tenantA.slug}.swekly.com`)

        expect(res.status).toBe(200)
        const names = res.body.map((c: any) => c.name)
        // Deduped by normalized name (Maystro's "Hydra" wins over Yalidine's "HYDRA" per provider preference order).
        expect(names).toEqual(['Birkhadem', 'Es Senia', 'Hydra'])
    })

    it('GET /api/delivery/communes tolerates one provider being unreachable', async () => {
        vi.restoreAllMocks()

        await prisma.storeSettings.upsert({
            where: { tenantId: tenantA.id },
            create: { tenantId: tenantA.id, allowedDeliveryProviders: ['MAYSTRO', 'YALIDINE'] },
            update: { allowedDeliveryProviders: ['MAYSTRO', 'YALIDINE'] }
        })

        vi.spyOn(MaystroProvider.prototype, 'listCommunes').mockResolvedValue([
            { name: 'Hydra' },
            { name: 'Birkhadem' }
        ])
        vi.spyOn(YalidineProvider.prototype, 'listCommunes').mockImplementation(async () => {
            throw new Error('Yalidine unreachable')
        })

        const res = await request(app)
            .get('/api/delivery/communes?wilaya=16')
            .set('Host', `${tenantA.slug}.swekly.com`)

        expect(res.status).toBe(200)
        const names = res.body.map((c: any) => c.name)
        expect(names).toEqual(['Birkhadem', 'Hydra'])
    })

    // The generic provider routes exist so no carrier gets a capability the others
    // can't have. These tests assert the symmetry rather than either carrier's quirks.
    describe('generic per-provider commune routes', () => {
        const connect = async (provider: 'MAYSTRO' | 'YALIDINE') => {
            const config =
                provider === 'MAYSTRO'
                    ? { apiToken: 'tenant-maystro-token', storeId: 'store-123' }
                    : { apiId: 'tenant-yalidine-id', apiToken: 'tenant-yalidine-token' }

            await request(app)
                .put(`/api/admin/delivery/providers/${provider}/account`)
                .set('Authorization', `Bearer ${tokenA}`)
                .set('Host', `${tenantA.slug}.swekly.com`)
                .send({ offered: true, isActive: true, config })
        }

        const providerClass = {
            MAYSTRO: MaystroProvider,
            YALIDINE: YalidineProvider
        } as const

        it.each(['MAYSTRO', 'YALIDINE'] as const)(
            'GET /admin/delivery/providers/%s/communes returns the carrier commune list with ids',
            async (provider) => {
                vi.restoreAllMocks()
                await connect(provider)

                vi.spyOn(providerClass[provider].prototype, 'listCommunes').mockResolvedValue([
                    { id: '101', name: 'Hydra' },
                    { id: '102', name: 'Birkhadem' }
                ])

                const res = await request(app)
                    .get(`/api/admin/delivery/providers/${provider}/communes?wilaya=16`)
                    .set('Authorization', `Bearer ${tokenA}`)
                    .set('Host', `${tenantA.slug}.swekly.com`)

                expect(res.status).toBe(200)
                expect(res.body).toEqual([
                    { id: '101', name: 'Hydra' },
                    { id: '102', name: 'Birkhadem' }
                ])
            }
        )

        it.each(['MAYSTRO', 'YALIDINE'] as const)(
            'GET /admin/delivery/providers/%s/commune-price quotes home and office for one commune',
            async (provider) => {
                vi.restoreAllMocks()
                await connect(provider)

                vi.spyOn(providerClass[provider].prototype, 'quote').mockImplementation(async (input: any) => [
                    {
                        provider,
                        serviceLevel: input.serviceLevel,
                        price: input.deliveryMode === 'home' ? 600 : 400,
                        currency: 'DZD',
                        source: 'provider'
                    }
                ])

                const res = await request(app)
                    .get(`/api/admin/delivery/providers/${provider}/commune-price?wilaya=16&commune=101`)
                    .set('Authorization', `Bearer ${tokenA}`)
                    .set('Host', `${tenantA.slug}.swekly.com`)

                expect(res.status).toBe(200)
                expect(res.body.home.price).toBe(600)
                expect(res.body.office.price).toBe(400)
                expect(res.body.home.currency).toBe('DZD')
            }
        )

        it('commune-price reports the carrier price, not the tenant override', async () => {
            vi.restoreAllMocks()
            await connect('MAYSTRO')

            // An override that would win on the storefront must not leak into this probe.
            await request(app)
                .put('/api/rates/MAYSTRO')
                .set('Authorization', `Bearer ${tokenA}`)
                .set('Host', `${tenantA.slug}.swekly.com`)
                .send({
                    rates: [{ wilayaCode: '16', price: 999, communeCode: '', serviceLevel: 'home', isActive: true }]
                })

            vi.spyOn(MaystroProvider.prototype, 'quote').mockResolvedValue([
                { provider: 'MAYSTRO', serviceLevel: 'home', price: 600, currency: 'DZD', source: 'provider' }
            ])

            const res = await request(app)
                .get('/api/admin/delivery/providers/MAYSTRO/commune-price?wilaya=16&commune=101')
                .set('Authorization', `Bearer ${tokenA}`)
                .set('Host', `${tenantA.slug}.swekly.com`)

            expect(res.status).toBe(200)
            expect(res.body.home.price).toBe(600)
        })

        it('rejects a provider whose credentials are not configured', async () => {
            const res = await request(app)
                .get('/api/admin/delivery/providers/MAYSTRO/communes?wilaya=16')
                .set('Authorization', `Bearer ${tokenB}`)
                .set('Host', `${tenantB.slug}.swekly.com`)

            expect(res.status).toBe(400)
            expect(res.body.statusMessage).toContain('credentials')
        })

        it('rejects an unknown provider', async () => {
            const res = await request(app)
                .get('/api/admin/delivery/providers/NOPE/communes?wilaya=16')
                .set('Authorization', `Bearer ${tokenA}`)
                .set('Host', `${tenantA.slug}.swekly.com`)

            expect(res.status).toBe(400)
            expect(res.body.statusMessage).toBe('Invalid provider')
        })

        it('requires wilaya and commune', async () => {
            vi.restoreAllMocks()
            await connect('YALIDINE')

            const noWilaya = await request(app)
                .get('/api/admin/delivery/providers/YALIDINE/communes')
                .set('Authorization', `Bearer ${tokenA}`)
                .set('Host', `${tenantA.slug}.swekly.com`)
            expect(noWilaya.status).toBe(400)
            expect(noWilaya.body.statusMessage).toBe('wilaya is required')

            const noCommune = await request(app)
                .get('/api/admin/delivery/providers/YALIDINE/commune-price?wilaya=16')
                .set('Authorization', `Bearer ${tokenA}`)
                .set('Host', `${tenantA.slug}.swekly.com`)
            expect(noCommune.status).toBe(400)
            expect(noCommune.body.statusMessage).toBe('commune is required')
        })

        // Regression: the storefront commune picker moved to the carrier-agnostic list,
        // which carries names only. Maystro's /base/* endpoints key on numeric ids, so
        // a name has to be resolved at the boundary or pickup points silently return [].
        it('resolves a commune NAME to a Maystro id for pickup points', async () => {
            vi.restoreAllMocks()
            await connect('MAYSTRO')

            vi.spyOn(MaystroLocationService.prototype, 'listCommunes').mockResolvedValue([
                { id: 1234, wilaya: 16, name: 'Hydra' },
                { id: 1235, wilaya: 16, name: 'Birkhadem' }
            ] as any)

            const listSpy = vi
                .spyOn(MaystroPickupPointService.prototype, 'listActivePickupPoints')
                .mockResolvedValue([
                    { name: 'Desk Hydra', commune: 1234, pickup_point: 77, delivery_type: 3, active: true }
                ] as any)

            const res = await request(app)
                .get('/api/delivery/maystro/pickup-points?commune=Hydra&wilaya=16')
                .set('Authorization', `Bearer ${tokenA}`)
                .set('Host', `${tenantA.slug}.swekly.com`)

            expect(res.status).toBe(200)
            expect(res.body[0]?.pickup_point).toBe(77)
            // The carrier must be asked for the id, never the raw name.
            expect(listSpy).toHaveBeenCalledWith(expect.objectContaining({ commune: '1234' }))
        })

        it('still accepts a numeric commune id for pickup points', async () => {
            vi.restoreAllMocks()
            await connect('MAYSTRO')

            const listSpy = vi
                .spyOn(MaystroPickupPointService.prototype, 'listActivePickupPoints')
                .mockResolvedValue([
                    { name: 'Desk Hydra', commune: 1234, pickup_point: 77, delivery_type: 3, active: true }
                ] as any)

            const res = await request(app)
                .get('/api/delivery/maystro/pickup-points?commune=1234&wilaya=16')
                .set('Authorization', `Bearer ${tokenA}`)
                .set('Host', `${tenantA.slug}.swekly.com`)

            expect(res.status).toBe(200)
            expect(listSpy).toHaveBeenCalledWith(expect.objectContaining({ commune: '1234' }))
        })

        it('rejects a commune name that does not exist in the wilaya', async () => {
            vi.restoreAllMocks()
            await connect('MAYSTRO')

            vi.spyOn(MaystroLocationService.prototype, 'listCommunes').mockResolvedValue([
                { id: 1234, wilaya: 16, name: 'Hydra' }
            ] as any)

            const res = await request(app)
                .get('/api/delivery/maystro/pickup-points?commune=Nowhere&wilaya=16')
                .set('Authorization', `Bearer ${tokenA}`)
                .set('Host', `${tenantA.slug}.swekly.com`)

            expect(res.status).toBe(400)
            expect(res.body.statusMessage).toBe('Invalid commune for wilaya')
        })

        // Pickup points used to be a Maystro-only feature because only Maystro had a
        // bespoke route, even though Yalidine publishes agencies too. Both now answer
        // through one route in one shape.
        it('GET /admin/delivery/providers/YALIDINE/pickup-points returns normalized agencies', async () => {
            vi.restoreAllMocks()
            await connect('YALIDINE')

            vi.spyOn(YalidineLocationService.prototype, 'resolveWilaya').mockResolvedValue({ id: 16, name: 'Alger' })
            vi.spyOn(YalidineLocationService.prototype, 'listCenters').mockResolvedValue([
                { id: 160101, name: 'Agence Sacré-Cœur', address: '116 Didouche Mourad', communeId: 1601, communeName: 'Alger Centre', wilayaId: 16 },
                { id: 160501, name: 'Agence Bab El Oued', address: '107 Rue Colonel Lotfi', communeId: 1605, communeName: 'Bab El Oued', wilayaId: 16 }
            ] as any)

            const res = await request(app)
                .get('/api/admin/delivery/providers/YALIDINE/pickup-points?wilaya=16')
                .set('Authorization', `Bearer ${tokenA}`)
                .set('Host', `${tenantA.slug}.swekly.com`)

            expect(res.status).toBe(200)
            expect(res.body).toHaveLength(2)
            expect(res.body[0]).toEqual({
                id: '160101',
                name: 'Agence Sacré-Cœur',
                address: '116 Didouche Mourad',
                communeId: '1601',
                communeName: 'Alger Centre'
            })
        })

        it('floats the customer\'s own commune to the top without hiding the rest', async () => {
            vi.restoreAllMocks()
            await connect('YALIDINE')

            vi.spyOn(YalidineLocationService.prototype, 'resolveWilaya').mockResolvedValue({ id: 16, name: 'Alger' })
            vi.spyOn(YalidineLocationService.prototype, 'listCenters').mockResolvedValue([
                { id: 160501, name: 'Agence Bab El Oued', communeId: 1605, communeName: 'Bab El Oued', wilayaId: 16 },
                { id: 160101, name: 'Agence Sacré-Cœur', communeId: 1601, communeName: 'Alger Centre', wilayaId: 16 },
                { id: 160902, name: 'Agence Bir Mourad Rais', communeId: 1609, communeName: 'Bir Mourad Raïs', wilayaId: 16 }
            ] as any)

            const res = await request(app)
                .get('/api/admin/delivery/providers/YALIDINE/pickup-points?wilaya=16&commune=1601')
                .set('Authorization', `Bearer ${tokenA}`)
                .set('Host', `${tenantA.slug}.swekly.com`)

            expect(res.status).toBe(200)
            expect(res.body[0].id).toBe('160101')
            // The other agencies stay reachable — most customers have none in their own commune.
            expect(res.body).toHaveLength(3)
        })

        it('matches the customer commune by name as well as by id', async () => {
            vi.restoreAllMocks()
            await connect('YALIDINE')

            vi.spyOn(YalidineLocationService.prototype, 'resolveWilaya').mockResolvedValue({ id: 16, name: 'Alger' })
            vi.spyOn(YalidineLocationService.prototype, 'listCenters').mockResolvedValue([
                { id: 160501, name: 'Agence Bab El Oued', communeId: 1605, communeName: 'Bab El Oued', wilayaId: 16 },
                { id: 160101, name: 'Agence Sacré-Cœur', communeId: 1601, communeName: 'Alger Centre', wilayaId: 16 }
            ] as any)

            const res = await request(app)
                .get('/api/admin/delivery/providers/YALIDINE/pickup-points?wilaya=16&commune=Alger%20Centre')
                .set('Authorization', `Bearer ${tokenA}`)
                .set('Host', `${tenantA.slug}.swekly.com`)

            expect(res.status).toBe(200)
            expect(res.body[0].id).toBe('160101')
        })

        it('keeps every agency when the customer commune has none', async () => {
            vi.restoreAllMocks()
            await connect('YALIDINE')

            vi.spyOn(YalidineLocationService.prototype, 'resolveWilaya').mockResolvedValue({ id: 16, name: 'Alger' })
            vi.spyOn(YalidineLocationService.prototype, 'listCenters').mockResolvedValue([
                { id: 160101, name: 'Agence Sacré-Cœur', communeId: 1601, communeName: 'Alger Centre', wilayaId: 16 }
            ] as any)

            // 15 wilayas have exactly one agency, usually in the chef-lieu. Filtering by
            // commune would hide it from nearly every customer in those wilayas.
            const res = await request(app)
                .get('/api/admin/delivery/providers/YALIDINE/pickup-points?wilaya=16&commune=1699')
                .set('Authorization', `Bearer ${tokenA}`)
                .set('Host', `${tenantA.slug}.swekly.com`)

            expect(res.status).toBe(200)
            expect(res.body.map((p: any) => p.id)).toEqual(['160101'])
        })

        it('returns Maystro pickup points in the same shape, resolving a commune name', async () => {
            vi.restoreAllMocks()
            await connect('MAYSTRO')

            // Maystro resolves commune names against its own catalog before asking
            // for pickup points, so the catalog call has to be stubbed too.
            vi.spyOn(MaystroClient.prototype, 'request').mockImplementation(async (opts: any) => {
                if (String(opts?.path).includes('/base/communes/')) {
                    return [{ id: 555, name: 'Sidi Mhamed' }] as any
                }
                return [] as any
            })

            vi.spyOn(MaystroPickupPointService.prototype, 'listActivePickupPointsNearby').mockResolvedValue([
                { name: 'GARDENIA PERFUME', commune: 555, pickup_point: 10, delivery_type: 3, active: true }
            ] as any)

            const res = await request(app)
                .get('/api/admin/delivery/providers/MAYSTRO/pickup-points?wilaya=16&commune=555')
                .set('Authorization', `Bearer ${tokenA}`)
                .set('Host', `${tenantA.slug}.swekly.com`)

            expect(res.status).toBe(200)
            expect(res.body[0]).toMatchObject({ id: '10', name: 'GARDENIA PERFUME', communeId: '555' })
        })

        it('rejects pickup points for a carrier that has none', async () => {
            const res = await request(app)
                .get('/api/admin/delivery/providers/SELF/pickup-points?wilaya=16')
                .set('Authorization', `Bearer ${tokenA}`)
                .set('Host', `${tenantA.slug}.swekly.com`)

            expect(res.status).toBe(400)
            expect(res.body.statusMessage).toContain('pickup points')
        })

        it('does not leak another tenant\'s carrier connection', async () => {
            vi.restoreAllMocks()
            await connect('MAYSTRO')

            vi.spyOn(MaystroProvider.prototype, 'listCommunes').mockResolvedValue([{ id: '101', name: 'Hydra' }])

            // tenantB never connected Maystro, so it must be refused even though tenantA did.
            const res = await request(app)
                .get('/api/admin/delivery/providers/MAYSTRO/communes?wilaya=16')
                .set('Authorization', `Bearer ${tokenB}`)
                .set('Host', `${tenantB.slug}.swekly.com`)

            expect(res.status).toBe(400)
            expect(res.body.statusMessage).toContain('credentials')
        })
    })
})
