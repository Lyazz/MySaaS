import { createHmac, randomBytes } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'

const APP_SECRET = 'test-meta-app-secret'
const VERIFY_TOKEN = 'test-meta-verify-token'

const PHONE_NUMBER_ID_A = 'pn-tenant-a'
const PHONE_NUMBER_ID_B = 'pn-tenant-b'

const sign = (body: unknown) =>
    `sha256=${createHmac('sha256', APP_SECRET).update(Buffer.from(JSON.stringify(body))).digest('hex')}`

const post = (body: unknown, signature?: string) => {
    const req = request(app).post('/api/webhooks/whatsapp').set('Content-Type', 'application/json')
    if (signature !== undefined) req.set('X-Hub-Signature-256', signature)
    // Send the exact bytes we signed: supertest re-serializing the object would
    // invalidate the signature the moment key order differed.
    return req.send(JSON.stringify(body))
}

const buttonEvent = (phoneNumberId: string, payload: string) => ({
    object: 'whatsapp_business_account',
    entry: [
        {
            id: 'waba-1',
            changes: [
                {
                    field: 'messages',
                    value: {
                        messaging_product: 'whatsapp',
                        metadata: { phone_number_id: phoneNumberId, display_phone_number: '213555000000' },
                        messages: [
                            {
                                id: `wamid.${randomBytes(6).toString('hex')}`,
                                from: '213555111222',
                                type: 'button',
                                button: { payload, text: 'Confirmer' }
                            }
                        ]
                    }
                }
            ]
        }
    ]
})

/** The webhook answers before it acts, so assertions have to wait for the effect. */
const waitFor = async <T>(read: () => Promise<T>, predicate: (value: T) => boolean, timeoutMs = 8000) => {
    const startedAt = Date.now()
    let last = await read()
    while (!predicate(last) && Date.now() - startedAt < timeoutMs) {
        await new Promise((resolve) => setTimeout(resolve, 100))
        last = await read()
    }
    return last
}

describe('WhatsApp Cloud API webhook', () => {
    let tenantA: any
    let tenantB: any

    beforeAll(async () => {
        process.env.META_APP_SECRET = APP_SECRET
        process.env.META_WA_VERIFY_TOKEN = VERIFY_TOKEN

        tenantA = await prisma.tenant.create({ data: { publishedAt: new Date(), name: 'WA Tenant A', slug: `wa-a-${Date.now()}` } })
        tenantB = await prisma.tenant.create({ data: { publishedAt: new Date(), name: 'WA Tenant B', slug: `wa-b-${Date.now()}` } })

        for (const [tenant, phoneNumberId] of [
            [tenantA, PHONE_NUMBER_ID_A],
            [tenantB, PHONE_NUMBER_ID_B]
        ] as const) {
            await prisma.tenantIntegration.create({
                data: {
                    tenantId: tenant.id,
                    provider: 'WHATSAPP',
                    isActive: true,
                    config: {
                        wabaId: `waba-${tenant.slug}`,
                        phoneNumberId,
                        accessToken: 'token',
                        templates: {
                            CONFIRMATION: {
                                name: 'swekly_order_confirmation',
                                languages: { fr: { status: 'APPROVED' } }
                            }
                        }
                    }
                }
            })
        }
    })

    afterAll(async () => {
        const tenantIds = [tenantA.id, tenantB.id]
        await prisma.whatsAppMessage.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.inventoryMovement.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.order.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.tenantIntegration.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } })
    })

    const createPendingOrder = async (tenantId: string) => {
        const token = randomBytes(32).toString('hex')
        const order = await prisma.order.create({
            data: {
                tenantId,
                customerName: 'Amine',
                customerPhone: '0550123456',
                totalAmount: 5200,
                status: 'PENDING',
                confirmationToken: token,
                confirmationTokenUsed: false
            }
        })
        return { order, token }
    }

    describe('subscription handshake', () => {
        it('echoes the challenge when the verify token matches', async () => {
            const res = await request(app)
                .get('/api/webhooks/whatsapp')
                .query({ 'hub.mode': 'subscribe', 'hub.verify_token': VERIFY_TOKEN, 'hub.challenge': '12345' })

            expect(res.status).toBe(200)
            expect(res.text).toBe('12345')
        })

        it('refuses a wrong verify token', async () => {
            const res = await request(app)
                .get('/api/webhooks/whatsapp')
                .query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'wrong', 'hub.challenge': '12345' })

            expect(res.status).toBe(403)
        })
    })

    describe('signature', () => {
        it('rejects an unsigned payload', async () => {
            const res = await post(buttonEvent(PHONE_NUMBER_ID_A, 'CONFIRM:whatever'))
            expect(res.status).toBe(401)
        })

        it('rejects a payload signed with the wrong secret', async () => {
            const body = buttonEvent(PHONE_NUMBER_ID_A, 'CONFIRM:whatever')
            const forged = `sha256=${createHmac('sha256', 'not-the-secret').update(Buffer.from(JSON.stringify(body))).digest('hex')}`

            const res = await post(body, forged)
            expect(res.status).toBe(401)
        })

        it('rejects a body that changed after signing', async () => {
            const signed = buttonEvent(PHONE_NUMBER_ID_A, 'CONFIRM:whatever')
            const signature = sign(signed)

            const res = await post(buttonEvent(PHONE_NUMBER_ID_A, 'CONFIRM:tampered'), signature)
            expect(res.status).toBe(401)
        })
    })

    describe('button replies', () => {
        it('confirms the order behind a CONFIRM payload', async () => {
            const { order, token } = await createPendingOrder(tenantA.id)
            const body = buttonEvent(PHONE_NUMBER_ID_A, `CONFIRM:${token}`)

            const res = await post(body, sign(body))
            expect(res.status).toBe(200)

            const confirmed = await waitFor(
                () => prisma.order.findUnique({ where: { id: order.id } }),
                (row) => row?.status === 'CONFIRMED'
            )
            expect(confirmed?.status).toBe('CONFIRMED')
            expect(confirmed?.callStatus).toBe('whatsapp_link_confirmed')
            expect(confirmed?.confirmationTokenUsed).toBe(true)
            expect(confirmed?.internalNotes).toContain('WhatsApp button')
        })

        it('cancels the order behind a CANCEL payload', async () => {
            const { order, token } = await createPendingOrder(tenantA.id)
            const body = buttonEvent(PHONE_NUMBER_ID_A, `CANCEL:${token}`)

            const res = await post(body, sign(body))
            expect(res.status).toBe(200)

            const cancelled = await waitFor(
                () => prisma.order.findUnique({ where: { id: order.id } }),
                (row) => row?.status === 'CANCELLED'
            )
            expect(cancelled?.status).toBe('CANCELLED')
            expect(cancelled?.callStatus).toBe('whatsapp_declined')
            expect(cancelled?.confirmationTokenUsed).toBe(true)
        })

        it('ignores a token that belongs to another tenant', async () => {
            const { order, token } = await createPendingOrder(tenantA.id)
            // Same token, but delivered to tenant B's number.
            const body = buttonEvent(PHONE_NUMBER_ID_B, `CONFIRM:${token}`)

            const res = await post(body, sign(body))
            expect(res.status).toBe(200)

            await new Promise((resolve) => setTimeout(resolve, 500))
            const untouched = await prisma.order.findUnique({ where: { id: order.id } })
            expect(untouched?.status).toBe('PENDING')
            expect(untouched?.confirmationTokenUsed).toBe(false)
        })

        it('ignores an event for a number no tenant has connected', async () => {
            const { order, token } = await createPendingOrder(tenantA.id)
            const body = buttonEvent('pn-unknown', `CONFIRM:${token}`)

            const res = await post(body, sign(body))
            expect(res.status).toBe(200)

            await new Promise((resolve) => setTimeout(resolve, 500))
            const untouched = await prisma.order.findUnique({ where: { id: order.id } })
            expect(untouched?.status).toBe('PENDING')
        })

        it('treats a second tap on an already spent token as a no-op', async () => {
            const { order, token } = await createPendingOrder(tenantA.id)
            const body = buttonEvent(PHONE_NUMBER_ID_A, `CONFIRM:${token}`)

            await post(body, sign(body))
            await waitFor(
                () => prisma.order.findUnique({ where: { id: order.id } }),
                (row) => row?.status === 'CONFIRMED'
            )

            const replay = buttonEvent(PHONE_NUMBER_ID_A, `CANCEL:${token}`)
            const res = await post(replay, sign(replay))
            expect(res.status).toBe(200)

            await new Promise((resolve) => setTimeout(resolve, 500))
            const stillConfirmed = await prisma.order.findUnique({ where: { id: order.id } })
            expect(stillConfirmed?.status).toBe('CONFIRMED')
        })
    })

    describe('delivery receipts', () => {
        const statusEvent = (phoneNumberId: string, wamid: string, status: string) => ({
            object: 'whatsapp_business_account',
            entry: [
                {
                    id: 'waba-1',
                    changes: [
                        {
                            field: 'messages',
                            value: {
                                messaging_product: 'whatsapp',
                                metadata: { phone_number_id: phoneNumberId },
                                statuses: [{ id: wamid, status, recipient_id: '213555111222' }]
                            }
                        }
                    ]
                }
            ]
        })

        it('marks the logged message delivered', async () => {
            const { order } = await createPendingOrder(tenantA.id)
            const wamid = `wamid.${randomBytes(8).toString('hex')}`
            const message = await prisma.whatsAppMessage.create({
                data: {
                    tenantId: tenantA.id,
                    orderId: order.id,
                    kind: 'CONFIRMATION',
                    attempt: 0,
                    toPhone: '213550123456',
                    templateName: 'swekly_order_confirmation',
                    languageCode: 'fr',
                    wamid,
                    status: 'SENT'
                }
            })

            const body = statusEvent(PHONE_NUMBER_ID_A, wamid, 'delivered')
            const res = await post(body, sign(body))
            expect(res.status).toBe(200)

            const updated = await waitFor(
                () => prisma.whatsAppMessage.findUnique({ where: { id: message.id } }),
                (row) => row?.status === 'DELIVERED'
            )
            expect(updated?.status).toBe('DELIVERED')
            expect(updated?.deliveredAt).toBeTruthy()
        })

        it('does not let one tenant update another tenant message', async () => {
            const { order } = await createPendingOrder(tenantA.id)
            const wamid = `wamid.${randomBytes(8).toString('hex')}`
            const message = await prisma.whatsAppMessage.create({
                data: {
                    tenantId: tenantA.id,
                    orderId: order.id,
                    kind: 'CONFIRMATION',
                    attempt: 0,
                    toPhone: '213550123456',
                    templateName: 'swekly_order_confirmation',
                    languageCode: 'fr',
                    wamid,
                    status: 'SENT'
                }
            })

            const body = statusEvent(PHONE_NUMBER_ID_B, wamid, 'read')
            const res = await post(body, sign(body))
            expect(res.status).toBe(200)

            await new Promise((resolve) => setTimeout(resolve, 500))
            const untouched = await prisma.whatsAppMessage.findUnique({ where: { id: message.id } })
            expect(untouched?.status).toBe('SENT')
            expect(untouched?.readAt).toBeNull()
        })
    })
})
