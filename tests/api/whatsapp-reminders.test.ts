import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import { acquireJobLock, releaseJobLock, withJobLock } from '../../backend/src/lib/job-lock'
import {
    REMINDER_JOB_NAME,
    findRemindersDue,
    runWhatsAppReminders
} from '../../backend/src/modules/whatsapp/whatsapp-reminders.job'
import { whatsappService } from '../../backend/src/modules/whatsapp/whatsapp.service'

const HOURS = 60 * 60 * 1000

describe('WhatsApp confirmation reminders', () => {
    const now = new Date('2026-08-31T12:00:00.000Z')

    let tenantId: string
    let otherTenantId: string

    const connect = (tenant: string, remindersEnabled: boolean) =>
        prisma.tenantIntegration.upsert({
            where: { tenantId_provider: { tenantId: tenant, provider: 'WHATSAPP' } },
            create: {
                tenantId: tenant,
                provider: 'WHATSAPP',
                isActive: true,
                config: {
                    wabaId: 'waba-1',
                    phoneNumberId: `pn-${tenant}`,
                    accessToken: 'token',
                    remindersEnabled,
                    templates: {
                        REMINDER: { name: 'swekly_order_reminder', languages: { fr: { status: 'APPROVED' } } }
                    }
                }
            },
            update: {
                isActive: true,
                config: {
                    wabaId: 'waba-1',
                    phoneNumberId: `pn-${tenant}`,
                    accessToken: 'token',
                    remindersEnabled,
                    templates: {
                        REMINDER: { name: 'swekly_order_reminder', languages: { fr: { status: 'APPROVED' } } }
                    }
                }
            }
        })

    const createOrder = (tenant: string, data: Record<string, unknown>) =>
        prisma.order.create({
            data: {
                tenantId: tenant,
                customerName: 'Amine',
                customerPhone: '0550123456',
                totalAmount: 3000,
                status: 'PENDING',
                ...data
            }
        })

    /** Sent `hours` ago, never answered, no reminder yet. */
    const confirmedHoursAgo = (hours: number, extra: Record<string, unknown> = {}) => ({
        whatsappConfirmSentAt: new Date(now.getTime() - hours * HOURS),
        whatsappLastMessageAt: new Date(now.getTime() - hours * HOURS),
        whatsappRemindersSent: 0,
        ...extra
    })

    beforeAll(async () => {
        const tenant = await prisma.tenant.create({ data: { publishedAt: new Date(), name: 'WA Reminders', slug: `wa-rem-${Date.now()}` } })
        tenantId = tenant.id
        const other = await prisma.tenant.create({ data: { publishedAt: new Date(), name: 'WA Other', slug: `wa-rem-other-${Date.now()}` } })
        otherTenantId = other.id
    })

    afterEach(async () => {
        vi.restoreAllMocks()
        await prisma.order.deleteMany({ where: { tenantId: { in: [tenantId, otherTenantId] } } })
        await prisma.jobLock.deleteMany({ where: { name: REMINDER_JOB_NAME } })
    })

    afterAll(async () => {
        const tenantIds = [tenantId, otherTenantId]
        await prisma.whatsAppMessage.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.order.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.tenantIntegration.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } })
    })

    describe('what is due', () => {
        it('chases an unanswered order once 6h have passed', async () => {
            const order = await createOrder(tenantId, confirmedHoursAgo(7))

            const due = await findRemindersDue(tenantId, now)
            expect(due).toEqual([{ orderId: order.id, attempt: 1 }])
        })

        it('leaves an order alone before the 6h mark', async () => {
            await createOrder(tenantId, confirmedHoursAgo(2))

            expect(await findRemindersDue(tenantId, now)).toEqual([])
        })

        it('sends the second reminder at 24h, counted from the first message', async () => {
            const order = await createOrder(tenantId, confirmedHoursAgo(25, { whatsappRemindersSent: 1 }))

            const due = await findRemindersDue(tenantId, now)
            expect(due).toEqual([{ orderId: order.id, attempt: 2 }])
        })

        it('stops after two reminders', async () => {
            await createOrder(tenantId, confirmedHoursAgo(72, { whatsappRemindersSent: 2 }))

            expect(await findRemindersDue(tenantId, now)).toEqual([])
        })

        it('never chases an order that is no longer pending', async () => {
            await createOrder(tenantId, confirmedHoursAgo(7, { status: 'CONFIRMED' }))
            await createOrder(tenantId, confirmedHoursAgo(7, { status: 'CANCELLED' }))

            expect(await findRemindersDue(tenantId, now)).toEqual([])
        })

        it('never chases an order that was only messaged by hand', async () => {
            // The wa.me button leaves these null: nothing was sent through the API.
            await createOrder(tenantId, { whatsappConfirmSentAt: null, whatsappRemindersSent: 0 })

            expect(await findRemindersDue(tenantId, now)).toEqual([])
        })

        it('does not return another tenant orders', async () => {
            await createOrder(otherTenantId, confirmedHoursAgo(7))

            expect(await findRemindersDue(tenantId, now)).toEqual([])
        })
    })

    describe('the run', () => {
        it('sends the due reminder for a tenant that has them switched on', async () => {
            await connect(tenantId, true)
            await connect(otherTenantId, false)
            const order = await createOrder(tenantId, confirmedHoursAgo(7))

            const send = vi
                .spyOn(whatsappService, 'sendOrderReminder')
                .mockResolvedValue({ ok: true, messageId: 'm1', wamid: 'wamid.1', language: 'fr' })

            const summary = await runWhatsAppReminders({ now })

            expect(send).toHaveBeenCalledTimes(1)
            expect(send).toHaveBeenCalledWith(tenantId, order.id, 1)
            expect(summary).toMatchObject({ due: 1, sent: 1, failed: 0 })
        })

        it('skips a tenant that turned reminders off', async () => {
            await connect(tenantId, false)
            await createOrder(tenantId, confirmedHoursAgo(7))

            const send = vi.spyOn(whatsappService, 'sendOrderReminder')

            const summary = await runWhatsAppReminders({ now })

            expect(send).not.toHaveBeenCalled()
            expect(summary.due).toBe(0)
        })

        it('keeps going when one order fails', async () => {
            await connect(tenantId, true)
            await createOrder(tenantId, confirmedHoursAgo(7))
            await createOrder(tenantId, confirmedHoursAgo(8))

            const send = vi
                .spyOn(whatsappService, 'sendOrderReminder')
                .mockRejectedValueOnce(new Error('boom'))
                .mockResolvedValueOnce({ ok: true, messageId: 'm2', wamid: 'wamid.2', language: 'fr' })

            const summary = await runWhatsAppReminders({ now })

            expect(send).toHaveBeenCalledTimes(2)
            expect(summary).toMatchObject({ due: 2, sent: 1, failed: 1 })
        })
    })

    describe('the lock', () => {
        it('lets only one holder in at a time', async () => {
            expect(await acquireJobLock(REMINDER_JOB_NAME, 60_000)).toBe(true)
            expect(await acquireJobLock(REMINDER_JOB_NAME, 60_000)).toBe(false)

            await releaseJobLock(REMINDER_JOB_NAME)
            expect(await acquireJobLock(REMINDER_JOB_NAME, 60_000)).toBe(true)
        })

        it('takes over a lease left behind by a dead worker', async () => {
            await prisma.jobLock.create({
                data: {
                    name: REMINDER_JOB_NAME,
                    owner: 'worker-that-died',
                    lockedAt: new Date(Date.now() - 60 * 60 * 1000),
                    lockedUntil: new Date(Date.now() - 30 * 60 * 1000)
                }
            })

            expect(await acquireJobLock(REMINDER_JOB_NAME, 60_000)).toBe(true)
        })

        it('reports a skipped run rather than failing it', async () => {
            await acquireJobLock(REMINDER_JOB_NAME, 60_000)

            const ran = await withJobLock(REMINDER_JOB_NAME, 60_000, async () => 'did work')
            expect(ran).toBeNull()
        })

        it('releases the lock even when the work throws', async () => {
            await expect(
                withJobLock(REMINDER_JOB_NAME, 60_000, async () => {
                    throw new Error('boom')
                })
            ).rejects.toThrow('boom')

            expect(await acquireJobLock(REMINDER_JOB_NAME, 60_000)).toBe(true)
        })
    })
})
