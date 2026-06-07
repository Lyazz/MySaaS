import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'
import { NotificationsService } from '../../backend/src/modules/notifications/notifications.service'

const waitFor = async <T>(fn: () => Promise<T | null | undefined>, timeoutMs = 3000): Promise<T> => {
    const started = Date.now()
    let last: T | null | undefined
    while (Date.now() - started < timeoutMs) {
        last = await fn()
        if (last) return last
        await new Promise((resolve) => setTimeout(resolve, 50))
    }
    throw new Error(`Timed out waiting for value; last=${JSON.stringify(last)}`)
}

describe('Admin notifications', () => {
    const slugA = `notifications-a-${Date.now()}`
    const slugB = `notifications-b-${Date.now()}`
    const hostA = `${slugA}.localhost:3000`
    const hostB = `${slugB}.localhost:3000`

    let tenantAId = ''
    let tenantBId = ''
    let ownerAId = ''
    let ownerAToken = ''
    let staffReadAId = ''
    let staffNoReadAId = ''
    let ownerBId = ''
    let ownerBToken = ''
    let productAId = ''
    let variantAId = ''

    beforeAll(async () => {
        const [tenantA, tenantB] = await Promise.all([
            prisma.tenant.create({ data: { name: 'Notifications A', slug: slugA } }),
            prisma.tenant.create({ data: { name: 'Notifications B', slug: slugB } })
        ])
        tenantAId = tenantA.id
        tenantBId = tenantB.id

        const staffRoleRead = await prisma.tenantStaffRole.create({
            data: { tenantId: tenantAId, name: `Orders read ${slugA}` },
            select: { id: true }
        })
        const staffRoleProducts = await prisma.tenantStaffRole.create({
            data: { tenantId: tenantAId, name: `Products read ${slugA}` },
            select: { id: true }
        })
        await prisma.tenantStaffRolePermission.createMany({
            data: [
                { tenantId: tenantAId, roleId: staffRoleRead.id, resource: 'orders', action: 'read' },
                { tenantId: tenantAId, roleId: staffRoleProducts.id, resource: 'products', action: 'read' }
            ]
        })

        const [ownerA, staffReadA, staffNoReadA, ownerB] = await Promise.all([
            prisma.user.create({
                data: { tenantId: tenantAId, email: `owner-${slugA}@example.com`, role: 'owner', passwordHash: 'x' }
            }),
            prisma.user.create({
                data: {
                    tenantId: tenantAId,
                    email: `staff-read-${slugA}@example.com`,
                    role: 'staff',
                    passwordHash: 'x',
                    staffRoleId: staffRoleRead.id
                }
            }),
            prisma.user.create({
                data: {
                    tenantId: tenantAId,
                    email: `staff-products-${slugA}@example.com`,
                    role: 'staff',
                    passwordHash: 'x',
                    staffRoleId: staffRoleProducts.id
                }
            }),
            prisma.user.create({
                data: { tenantId: tenantBId, email: `owner-${slugB}@example.com`, role: 'owner', passwordHash: 'x' }
            })
        ])

        ownerAId = ownerA.id
        staffReadAId = staffReadA.id
        staffNoReadAId = staffNoReadA.id
        ownerBId = ownerB.id
        ownerAToken = signAccessToken({ userId: ownerA.id, email: ownerA.email, role: ownerA.role, tenantId: ownerA.tenantId })
        ownerBToken = signAccessToken({ userId: ownerB.id, email: ownerB.email, role: ownerB.role, tenantId: ownerB.tenantId })

        await Promise.all([
            prisma.storeSettings.create({ data: { tenantId: tenantAId, cartEnabled: true, codEnabled: true, minimumOrderAmountDzd: 0 } }),
            prisma.storeSettings.create({ data: { tenantId: tenantBId, cartEnabled: true, codEnabled: true, minimumOrderAmountDzd: 0 } })
        ])

        const productA = await prisma.product.create({
            data: {
                tenantId: tenantAId,
                title: 'Notification Product',
                slug: `notification-product-${Date.now()}`,
                price: 100,
                stock: 20,
                isActive: true
            }
        })
        productAId = productA.id
        const variantA = await prisma.productVariant.create({
            data: {
                tenantId: tenantAId,
                productId: productAId,
                sku: `NOTIFY-${Date.now()}`,
                price: 100,
                stock: 20
            }
        })
        variantAId = variantA.id
    })

    afterAll(async () => {
        const tenantIds = [tenantAId, tenantBId]
        await prisma.notificationDelivery.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.notificationSubscription.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.notificationEvent.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.orderItem.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.order.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.productVariant.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.product.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.storeSettings.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.user.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.tenantStaffRolePermission.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.tenantStaffRole.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } })
    })

    it('registers notification subscriptions only for the authenticated tenant user', async () => {
        const unauthorized = await request(app)
            .post('/api/admin/notifications/subscriptions')
            .send({ hardwareId: 'h1', platform: 'android', channel: 'REALTIME' })
        expect(unauthorized.status).toBe(401)

        const registered = await request(app)
            .post('/api/admin/notifications/subscriptions')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${ownerAToken}`)
            .send({ hardwareId: 'owner-a-device', platform: 'android', channel: 'REALTIME' })
        expect(registered.status).toBe(201)
        expect(registered.body.tenantId).toBe(tenantAId)
        expect(registered.body.userId).toBe(ownerAId)

        const crossHost = await request(app)
            .post('/api/admin/notifications/subscriptions')
            .set('X-Forwarded-Host', hostB)
            .set('Authorization', `Bearer ${ownerAToken}`)
            .send({ hardwareId: 'bad-host', platform: 'android', channel: 'REALTIME' })
        expect(crossHost.status).toBe(403)
    })

    it('emits checkout notifications only to tenant users allowed to read orders', async () => {
        const res = await request(app)
            .post('/api/orders')
            .set('X-Forwarded-Host', hostA)
            .send({
                customerName: 'Notification Buyer',
                customerPhone: '0551777000',
                items: [{ productId: productAId, variantId: variantAId, quantity: 1 }]
            })

        expect(res.status).toBe(201)

        const event = await waitFor(() =>
            prisma.notificationEvent.findFirst({
                where: { tenantId: tenantAId, type: 'ORDER_CREATED', entityId: res.body.orderId },
                select: { id: true, tenantId: true, data: true }
            })
        )

        expect(event.tenantId).toBe(tenantAId)
        expect((event.data as any).orderId).toBe(res.body.orderId)

        const deliveries = await prisma.notificationDelivery.findMany({
            where: { tenantId: tenantAId, eventId: event.id, channel: 'IN_APP' },
            select: { userId: true }
        })
        const deliveredUserIds = new Set(deliveries.map((delivery) => delivery.userId))
        expect(deliveredUserIds.has(ownerAId)).toBe(true)
        expect(deliveredUserIds.has(staffReadAId)).toBe(true)
        expect(deliveredUserIds.has(staffNoReadAId)).toBe(false)
        expect(deliveredUserIds.has(ownerBId)).toBe(false)

        const tenantBLeak = await prisma.notificationEvent.findFirst({
            where: { tenantId: tenantBId, entityId: res.body.orderId }
        })
        expect(tenantBLeak).toBeNull()
    })

    it('marks FCM delivery failures without failing notification emission', async () => {
        await prisma.notificationSubscription.upsert({
            where: {
                tenantId_userId_hardwareId_channel: {
                    tenantId: tenantAId,
                    userId: ownerAId,
                    hardwareId: 'owner-a-fcm',
                    channel: 'FCM'
                }
            },
            create: {
                tenantId: tenantAId,
                userId: ownerAId,
                hardwareId: 'owner-a-fcm',
                platform: 'android',
                channel: 'FCM',
                fcmToken: 'bad-token'
            },
            update: { isActive: true, fcmToken: 'bad-token' }
        })

        const order = await prisma.order.create({
            data: {
                tenantId: tenantAId,
                status: 'PENDING',
                totalAmount: 100,
                customerName: 'Failed Push',
                customerPhone: '0551777001'
            }
        })

        const service = new NotificationsService({
            send: async () => {
                const error: any = new Error('FCM boom')
                error.code = 'messaging/invalid-registration-token'
                throw error
            }
        })

        const event = await service.emitOrderCreated(tenantAId, order.id)
        expect(event?.id).toBeTruthy()

        const failed = await waitFor(() =>
            prisma.notificationDelivery.findFirst({
                where: { tenantId: tenantAId, eventId: event!.id, channel: 'FCM', status: 'FAILED' },
                select: { error: true, subscription: { select: { isActive: true } } }
            })
        )

        expect(failed.error).toContain('FCM boom')
        expect(failed.subscription?.isActive).toBe(false)
    })

    it('lists and marks notifications read for the current user', async () => {
        const list = await request(app)
            .get('/api/admin/notifications')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${ownerAToken}`)

        expect(list.status).toBe(200)
        expect(Array.isArray(list.body.items)).toBe(true)
        expect(list.body.items.length).toBeGreaterThan(0)

        const notificationId = list.body.items[0].id
        const marked = await request(app)
            .post(`/api/admin/notifications/${notificationId}/read`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${ownerAToken}`)

        expect(marked.status).toBe(200)
        expect(marked.body.success).toBe(true)

        const tenantBMark = await request(app)
            .post(`/api/admin/notifications/${notificationId}/read`)
            .set('X-Forwarded-Host', hostB)
            .set('Authorization', `Bearer ${ownerBToken}`)
        expect(tenantBMark.status).toBe(404)
    })

    it('marks all notifications read only for the current tenant user', async () => {
        await prisma.notificationDelivery.updateMany({
            where: { tenantId: tenantAId, userId: ownerAId, channel: 'IN_APP' },
            data: { readAt: null }
        })

        const markAll = await request(app)
            .post('/api/admin/notifications/read-all')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${ownerAToken}`)

        expect(markAll.status).toBe(200)
        expect(markAll.body.success).toBe(true)
        expect(markAll.body.count).toBeGreaterThan(0)

        const ownerDeliveries = await prisma.notificationDelivery.findMany({
            where: { tenantId: tenantAId, userId: ownerAId, channel: 'IN_APP' },
            select: { readAt: true }
        })
        expect(ownerDeliveries.length).toBeGreaterThan(0)
        expect(ownerDeliveries.every((delivery) => delivery.readAt instanceof Date)).toBe(true)

        const otherTenant = await request(app)
            .post('/api/admin/notifications/read-all')
            .set('X-Forwarded-Host', hostB)
            .set('Authorization', `Bearer ${ownerBToken}`)

        expect(otherTenant.status).toBe(200)
        expect(otherTenant.body.success).toBe(true)
        expect(otherTenant.body.count).toBe(0)
    })
})
