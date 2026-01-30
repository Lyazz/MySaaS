import request from 'supertest'
import jwt from 'jsonwebtoken'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'

const JWT_SECRET = process.env.JWT_SECRET || 'secret'

describe('Delivery API', () => {
    let tenantA: any
    let tenantB: any
    let tokenA: string
    let tokenB: string
    let orderA: any
    let orderB: any
    let shipmentSelfId: string

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
    })

    afterAll(async () => {
        const tenantIds = [tenantA.id, tenantB.id]
        await prisma.shipmentEvent.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.shipment.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.deliveryRate.deleteMany({ where: { tenantId: { in: tenantIds } } })
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
            .set('x-tenant-id', tenantA.id)
            .send({
                provider: 'SELF',
                destination: { wilayaCode: '16' }
            })

        expect(res.status).toBe(200)
        expect(Array.isArray(res.body)).toBe(true)
        expect(res.body[0].price).toBe(500)
        expect(res.body[0].source).toBe('fallback-rate')
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
            .set('x-tenant-id', tenantA.id)
            .send(payload)

        expect(first.status).toBe(201)
        shipmentSelfId = first.body.id

        const second = await request(app)
            .post('/api/shipments')
            .set('Authorization', `Bearer ${tokenA}`)
            .set('x-tenant-id', tenantA.id)
            .send(payload)

        expect(second.status).toBe(201)
        expect(second.body.id).toBe(shipmentSelfId)
    })

    it('enforces tenant isolation for shipment fetch', async () => {
        const res = await request(app)
            .get(`/api/shipments/${shipmentSelfId}`)
            .set('Authorization', `Bearer ${tokenB}`)
            .set('x-tenant-id', tenantB.id)

        expect(res.status).toBe(404)
    })

    it('updates self delivery status (admin protected)', async () => {
        const res = await request(app)
            .post(`/api/self/shipments/${shipmentSelfId}/status`)
            .set('Authorization', `Bearer ${tokenA}`)
            .set('x-tenant-id', tenantA.id)
            .send({ status: 'DELIVERED' })

        expect(res.status).toBe(200)
        expect(res.body.status).toBe('DELIVERED')
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

        const inner = Buffer.from(
            JSON.stringify({
                event: 'order_status_changed',
                instance_uuid: 'mx-123',
                payload: { status: 30, status_label: 'In transit' }
            }),
            'utf8'
        ).toString('base64')
        const double = Buffer.from(inner, 'utf8').toString('base64')

        const res = await request(app).post('/api/webhooks/maystro').send({ payload: double })
        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)

        const updated = await prisma.shipment.findUnique({ where: { id: maystroShipment.id } })
        expect(updated?.status).toBe('IN_TRANSIT')
    })
})
