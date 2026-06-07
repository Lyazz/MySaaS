import type { Response } from 'express'
import type { User } from '@prisma/client'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getMessaging, type Messaging } from 'firebase-admin/messaging'
import prisma from '../../lib/prisma'

type NotificationChannel = 'FCM' | 'REALTIME' | 'IN_APP'

type StreamClient = {
    id: string
    tenantId: string
    userId: string
    res: Response
}

type RegisterSubscriptionInput = {
    hardwareId?: unknown
    platform?: unknown
    channel?: unknown
    fcmToken?: unknown
}

type NotificationPayload = {
    type: string
    entityType: string
    entityId: string
    title: string
    body: string
    data?: Record<string, string | null | undefined>
}

export type FcmSender = Pick<Messaging, 'send'>

const streamClients = new Map<string, StreamClient>()

const normalizeText = (value: unknown, fallback = '') => {
    const text = typeof value === 'string' ? value.trim() : ''
    return text || fallback
}

const normalizeChannel = (value: unknown): NotificationChannel => {
    const raw = normalizeText(value, 'REALTIME').toUpperCase()
    if (raw === 'FCM') return 'FCM'
    if (raw === 'IN_APP') return 'IN_APP'
    return 'REALTIME'
}

const normalizePlatform = (value: unknown) => {
    const raw = normalizeText(value, 'unknown').toLowerCase()
    const allowed = ['android', 'ios', 'macos', 'windows', 'linux', 'web', 'unknown']
    return allowed.includes(raw) ? raw : 'unknown'
}

const toFcmData = (data: Record<string, string | null | undefined>) => {
    return Object.fromEntries(
        Object.entries(data)
            .filter(([, value]) => value !== null && value !== undefined)
            .map(([key, value]) => [key, String(value)])
    )
}

const getFirebaseMessaging = (): FcmSender | null => {
    try {
        if (!getApps().length) {
            const serviceAccountJson = normalizeText(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
            if (serviceAccountJson) {
                initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) })
            } else if (
                process.env.GOOGLE_APPLICATION_CREDENTIALS ||
                process.env.FIREBASE_CONFIG ||
                process.env.FIREBASE_PROJECT_ID
            ) {
                initializeApp(process.env.FIREBASE_PROJECT_ID ? { projectId: process.env.FIREBASE_PROJECT_ID } : undefined)
            } else {
                return null
            }
        }

        return getMessaging()
    } catch (error) {
        console.error('[NotificationsService] Firebase initialization failed:', error)
        return null
    }
}

export class NotificationsService {
    private fcmSender: FcmSender | null

    constructor(fcmSender: FcmSender | null = getFirebaseMessaging()) {
        this.fcmSender = fcmSender
    }

    async registerSubscription(tenantId: string, user: User, input: RegisterSubscriptionInput) {
        const hardwareId = normalizeText(input.hardwareId)
        const platform = normalizePlatform(input.platform)
        const channel = normalizeChannel(input.channel)
        const fcmToken = normalizeText(input.fcmToken) || null

        if (!hardwareId) {
            throw new Error('hardwareId is required')
        }

        if (channel === 'FCM' && !fcmToken) {
            throw new Error('fcmToken is required for FCM subscriptions')
        }

        return prisma.notificationSubscription.upsert({
            where: {
                tenantId_userId_hardwareId_channel: {
                    tenantId,
                    userId: user.id,
                    hardwareId,
                    channel
                }
            },
            create: {
                tenantId,
                userId: user.id,
                hardwareId,
                platform,
                channel,
                fcmToken,
                isActive: true,
                lastSeenAt: new Date()
            },
            update: {
                platform,
                fcmToken,
                isActive: true,
                lastSeenAt: new Date()
            },
            select: {
                id: true,
                tenantId: true,
                userId: true,
                hardwareId: true,
                platform: true,
                channel: true,
                isActive: true,
                lastSeenAt: true
            }
        })
    }

    async disableSubscription(tenantId: string, userId: string, subscriptionId: string) {
        const result = await prisma.notificationSubscription.updateMany({
            where: { tenantId, userId, id: subscriptionId },
            data: { isActive: false, lastSeenAt: new Date() }
        })

        if (result.count === 0) {
            throw new Error('Notification subscription not found')
        }
    }

    async listForUser(tenantId: string, userId: string, take = 50) {
        const safeTake = Math.max(1, Math.min(100, Math.trunc(take || 50)))
        const deliveries = await prisma.notificationDelivery.findMany({
            where: { tenantId, userId, channel: 'IN_APP' },
            orderBy: { createdAt: 'desc' },
            take: safeTake,
            include: { event: true }
        })

        return deliveries.map((delivery) => ({
            id: delivery.event.id,
            deliveryId: delivery.id,
            type: delivery.event.type,
            entityType: delivery.event.entityType,
            entityId: delivery.event.entityId,
            title: delivery.event.title,
            body: delivery.event.body,
            data: delivery.event.data,
            readAt: delivery.readAt,
            createdAt: delivery.event.createdAt
        }))
    }

    async markRead(tenantId: string, userId: string, eventId: string) {
        const existing = await prisma.notificationDelivery.findFirst({
            where: { tenantId, userId, eventId, channel: 'IN_APP' },
            select: { id: true, readAt: true }
        })

        if (!existing) {
            throw new Error('Notification not found')
        }

        const readAt = existing.readAt ?? new Date()
        if (!existing.readAt) {
            await prisma.notificationDelivery.updateMany({
                where: { tenantId, userId, eventId, channel: 'IN_APP', readAt: null },
                data: { readAt }
            })
        }

        return { eventId, readAt }
    }

    async markAllRead(tenantId: string, userId: string) {
        const readAt = new Date()
        const result = await prisma.notificationDelivery.updateMany({
            where: { tenantId, userId, channel: 'IN_APP', readAt: null },
            data: { readAt }
        })

        return { count: result.count, readAt }
    }

    openStream(tenantId: string, userId: string, res: Response) {
        const id = `${tenantId}:${userId}:${Date.now()}:${Math.random().toString(16).slice(2)}`
        const client: StreamClient = { id, tenantId, userId, res }
        streamClients.set(id, client)

        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive'
        })
        res.write(`event: ready\ndata: ${JSON.stringify({ ok: true })}\n\n`)

        const heartbeat = setInterval(() => {
            if (!streamClients.has(id)) return
            res.write(`event: heartbeat\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`)
        }, 25_000)

        res.on('close', () => {
            clearInterval(heartbeat)
            streamClients.delete(id)
        })
    }

    async emitOrderCreated(tenantId: string, orderId: string) {
        const order = await prisma.order.findFirst({
            where: { tenantId, id: orderId },
            select: {
                id: true,
                publicId: true,
                customerName: true,
                totalAmount: true,
                totalWithShippingAmount: true,
                shippingCurrency: true
            }
        })

        if (!order) return null

        const orderReference = order.publicId || order.id.slice(0, 8)
        const amount = Number(order.totalWithShippingAmount ?? order.totalAmount ?? 0)

        return this.emit(tenantId, {
            type: 'ORDER_CREATED',
            entityType: 'ORDER',
            entityId: order.id,
            title: 'New order received',
            body: `Order #${orderReference} from ${order.customerName} - ${amount} ${order.shippingCurrency || 'DZD'}`,
            data: {
                type: 'ORDER_CREATED',
                tenantId,
                orderId: order.id,
                publicId: order.publicId ?? '',
                route: `/orders/${order.id}`
            }
        })
    }

    async emit(tenantId: string, payload: NotificationPayload) {
        const recipients = await this.getOrderNotificationRecipients(tenantId)
        if (recipients.length === 0) return null

        const recipientIds = recipients.map((user) => user.id)
        const subscriptions = await prisma.notificationSubscription.findMany({
            where: {
                tenantId,
                userId: { in: recipientIds },
                isActive: true
            },
            select: {
                id: true,
                userId: true,
                channel: true,
                fcmToken: true
            }
        })

        const fcmSubscriptions = subscriptions.filter((s) => s.channel === 'FCM' && s.fcmToken)

        const result = await prisma.$transaction(async (tx) => {
            const event = await tx.notificationEvent.create({
                data: {
                    tenantId,
                    type: payload.type,
                    entityType: payload.entityType,
                    entityId: payload.entityId,
                    title: payload.title,
                    body: payload.body,
                    data: payload.data as any
                }
            })

            await tx.notificationDelivery.createMany({
                data: recipientIds.map((userId) => ({
                    tenantId,
                    eventId: event.id,
                    userId,
                    channel: 'IN_APP',
                    status: 'SENT',
                    sentAt: new Date()
                })),
                skipDuplicates: true
            })

            if (fcmSubscriptions.length > 0) {
                await tx.notificationDelivery.createMany({
                    data: fcmSubscriptions.map((subscription) => ({
                        tenantId,
                        eventId: event.id,
                        userId: subscription.userId,
                        subscriptionId: subscription.id,
                        channel: 'FCM',
                        status: 'PENDING'
                    })),
                    skipDuplicates: true
                })
            }

            return event
        })

        this.broadcastRealtime(tenantId, recipientIds, {
            id: result.id,
            type: payload.type,
            entityType: payload.entityType,
            entityId: payload.entityId,
            title: payload.title,
            body: payload.body,
            data: payload.data ?? {},
            createdAt: result.createdAt
        })

        this.deliverFcm(tenantId, result.id).catch((error) => {
            console.error('[NotificationsService] FCM delivery failed:', error)
        })

        return result
    }

    private async getOrderNotificationRecipients(tenantId: string) {
        const staffRolePermissions = await prisma.tenantStaffRolePermission.findMany({
            where: { tenantId, resource: 'orders', action: 'read' },
            select: { roleId: true }
        })
        const staffRoleIds = Array.from(new Set(staffRolePermissions.map((p) => p.roleId)))

        return prisma.user.findMany({
            where: {
                tenantId,
                isActive: true,
                OR: [
                    { role: { in: ['owner', 'admin'] } },
                    staffRoleIds.length > 0
                        ? { role: 'staff', staffRoleId: { in: staffRoleIds } }
                        : { id: '__never__' }
                ]
            },
            select: { id: true }
        })
    }

    private broadcastRealtime(tenantId: string, userIds: string[], payload: any) {
        const allowedUsers = new Set(userIds)
        for (const client of streamClients.values()) {
            if (client.tenantId !== tenantId || !allowedUsers.has(client.userId)) continue
            client.res.write(`event: notification\ndata: ${JSON.stringify(payload)}\n\n`)
        }
    }

    private async deliverFcm(tenantId: string, eventId: string) {
        const deliveries = await prisma.notificationDelivery.findMany({
            where: { tenantId, eventId, channel: 'FCM', status: 'PENDING' },
            include: {
                event: true,
                subscription: true
            }
        })

        if (deliveries.length === 0) return

        if (!this.fcmSender) {
            await prisma.notificationDelivery.updateMany({
                where: { tenantId, eventId, channel: 'FCM', status: 'PENDING' },
                data: { status: 'SKIPPED', error: 'Firebase Cloud Messaging is not configured' }
            })
            return
        }

        for (const delivery of deliveries) {
            const token = delivery.subscription?.fcmToken
            if (!token) {
                await prisma.notificationDelivery.update({
                    where: { id: delivery.id },
                    data: { status: 'FAILED', error: 'Missing FCM token' }
                })
                continue
            }

            try {
                const data = toFcmData({
                    ...((delivery.event.data as Record<string, string | null | undefined> | null) ?? {}),
                    notificationId: delivery.event.id
                })

                await this.fcmSender.send({
                    token,
                    notification: {
                        title: delivery.event.title,
                        body: delivery.event.body
                    },
                    data,
                    apns: {
                        headers: {
                            'apns-priority': '10',
                            'apns-push-type': 'alert'
                        },
                        payload: {
                            aps: {
                                alert: {
                                    title: delivery.event.title,
                                    body: delivery.event.body
                                },
                                sound: 'default',
                                badge: 1
                            }
                        }
                    }
                })

                await prisma.notificationDelivery.update({
                    where: { id: delivery.id },
                    data: { status: 'SENT', sentAt: new Date(), error: null }
                })
            } catch (error: any) {
                const message = String(error?.message || 'FCM send failed')
                await prisma.notificationDelivery.update({
                    where: { id: delivery.id },
                    data: { status: 'FAILED', error: message }
                })

                const code = String(error?.code || '')
                if (code.includes('registration-token-not-registered') || code.includes('invalid-registration-token')) {
                    await prisma.notificationSubscription.updateMany({
                        where: { tenantId, id: delivery.subscriptionId ?? '' },
                        data: { isActive: false }
                    })
                }
            }
        }
    }
}

export const notificationsService = new NotificationsService()
