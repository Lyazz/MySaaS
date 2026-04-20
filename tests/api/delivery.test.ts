import request from 'supertest'
import jwt from 'jsonwebtoken'
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { MaystroProvider } from '../../backend/src/modules/delivery/providers/maystro.provider'
import { YalidineProvider } from '../../backend/src/modules/delivery/providers/yalidine.provider'

const JWT_SECRET = process.env.JWT_SECRET!

describe('Delivery API', () => {
    let tenantA: any
    let tenantB: any
    let tokenA: string
    let tokenB: string
    let orderA: any
    let orderB: any
    let shipmentSelfId: string
    let inactiveCashboxAId: string

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
                name: 'Inactive Cashbox',
                isActive: false
            }
        })
        inactiveCashboxAId = cashbox.id
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
        await prisma.maystroOrderMapping.deleteMany({ where: { tenantId: { in: tenantIds } } })
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
            .set('Host', `${tenantA.slug}.platform.com`)
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
            .set('Host', `${tenantA.slug}.platform.com`)
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
            .set('Host', `${tenantA.slug}.platform.com`)
            .send({
                provider: 'SELF',
                destination: { wilayaCode: '16' },
                deliveryMode: 'home'
            })

        expect(home.status).toBe(200)
        expect(home.body[0].price).toBe(600)

        const office = await request(app)
            .post('/api/delivery/options')
            .set('Host', `${tenantA.slug}.platform.com`)
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
            .set('Host', `${tenantA.slug}.platform.com`)
            .send(payload)

        expect(first.status).toBe(201)
        shipmentSelfId = first.body.id

        const second = await request(app)
            .post('/api/shipments')
            .set('Authorization', `Bearer ${tokenA}`)
            .set('Host', `${tenantA.slug}.platform.com`)
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
            .set('Host', `${tenantA.slug}.platform.com`)
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

    it('enforces tenant isolation for shipment fetch', async () => {
        const res = await request(app)
            .get(`/api/shipments/${shipmentSelfId}`)
            .set('Authorization', `Bearer ${tokenB}`)
            .set('Host', `${tenantB.slug}.platform.com`)

        expect(res.status).toBe(404)
    })

    it('blocks manual status changes after confirmation for carrier-controlled orders', async () => {
        const confirm = await request(app)
            .patch(`/api/admin/orders/${orderA.id}`)
            .set('Authorization', `Bearer ${tokenA}`)
            .set('Host', `${tenantA.slug}.platform.com`)
            .send({ status: 'CONFIRMED' })

        expect(confirm.status).toBe(200)
        expect(confirm.body.status).toBe('CONFIRMED')

        const ship = await request(app)
            .patch(`/api/admin/orders/${orderA.id}`)
            .set('Authorization', `Bearer ${tokenA}`)
            .set('Host', `${tenantA.slug}.platform.com`)
            .send({ status: 'SHIPPED' })

        expect(ship.status).toBe(409)
        expect(ship.body.statusMessage).toContain('controlled by the delivery carrier')
    })

    it('updates self delivery status (admin protected)', async () => {
        const res = await request(app)
            .post(`/api/self/shipments/${shipmentSelfId}/status`)
            .set('Authorization', `Bearer ${tokenA}`)
            .set('Host', `${tenantA.slug}.platform.com`)
            .send({ status: 'DELIVERED' })

        expect(res.status).toBe(200)
        expect(res.body.status).toBe('DELIVERED')

        const cashboxAfter = await prisma.cashbox.findUnique({ where: { id: inactiveCashboxAId } })
        expect(cashboxAfter?.isActive).toBe(true)

        const session = await prisma.cashSession.findFirst({
            where: { tenantId: tenantA.id, cashboxId: inactiveCashboxAId, status: 'OPEN' },
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
        expect(cashTx?.cashboxId).toBe(inactiveCashboxAId)
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
            .set('Host', `${tenantA.slug}.platform.com`)
            .send({ payload: double })
        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)

        const updated = await prisma.shipment.findUnique({ where: { id: maystroShipment.id } })
        expect(updated?.status).toBe('DELIVERED')

        const updatedOrder = await prisma.order.findUnique({ where: { id: orderA.id } })
        expect(updatedOrder?.status).toBe('DELIVERED')
    })

    it('allows tenant admins to configure carrier credentials without leaking secrets', async () => {
        const list = await request(app)
            .get('/api/admin/delivery/providers')
            .set('Authorization', `Bearer ${tokenA}`)
            .set('Host', `${tenantA.slug}.platform.com`)

        expect(list.status).toBe(200)
        expect(Array.isArray(list.body)).toBe(true)
        expect(list.body.some((p: any) => p.provider === 'MAYSTRO')).toBe(true)

        const upsert = await request(app)
            .put('/api/admin/delivery/providers/MAYSTRO/account')
            .set('Authorization', `Bearer ${tokenA}`)
            .set('Host', `${tenantA.slug}.platform.com`)
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
            .set('Host', `${tenantA.slug}.platform.com`)
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
            .set('Host', `${tenantA.slug}.platform.com`)
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
            .set('Host', `${tenantB.slug}.platform.com`)

        expect(res.status).toBe(400)
        expect(res.body.statusMessage).toContain('credentials')
    })

    it('returns live carrier rates per wilaya when configured', async () => {
        await request(app)
            .put('/api/admin/delivery/providers/MAYSTRO/account')
            .set('Authorization', `Bearer ${tokenA}`)
            .set('Host', `${tenantA.slug}.platform.com`)
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
            .set('Host', `${tenantA.slug}.platform.com`)

        expect(res.status).toBe(200)
        expect(Array.isArray(res.body)).toBe(true)
        expect(res.body.length).toBe(58)
        const w16 = res.body.find((r: any) => r.wilayaCode === '16')
        expect(w16?.carrierPrice).toBe(160)
    })
})
