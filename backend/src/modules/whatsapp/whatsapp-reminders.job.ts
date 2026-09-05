import prisma from '../../lib/prisma'
import { withJobLock } from '../../lib/job-lock'
import { whatsappService } from './whatsapp.service'
import { WHATSAPP_PROVIDER, parseWhatsAppConfig } from './whatsapp.types'

/**
 * Chases orders whose customer never answered the WhatsApp confirmation.
 *
 * Both delays are measured from the *first* confirmation, not from the previous
 * message: "6h then 24h" is what the seller was promised, and anchoring the
 * second reminder on the first one would silently push it to 30h.
 *
 * The whole run sits behind a lease lock, so several API instances tick without
 * sending the same reminder twice — and even if one slipped through, the unique
 * (order, kind, attempt) row in `WhatsAppMessage` would refuse it.
 */

export const REMINDER_JOB_NAME = 'whatsapp-reminders'

/** Index 0 drives reminder #1, index 1 drives reminder #2. */
export const REMINDER_DELAYS_MS = [6 * 60 * 60 * 1000, 24 * 60 * 60 * 1000]

const TICK_MS = 5 * 60 * 1000
/** Longer than a tick: the lease must cover a slow run, not just the gap. */
const LEASE_MS = 10 * 60 * 1000
/** Per tenant, per attempt — a backlog drains over several ticks instead of
 * hammering one tenant's Cloud API quota in a single burst. */
const BATCH_LIMIT = 50

export type ReminderDue = { orderId: string; attempt: number }

export type ReminderRunSummary = {
    tenants: number
    due: number
    sent: number
    skipped: number
    failed: number
}

/**
 * The orders this tenant owes a reminder right now.
 *
 * Only PENDING orders that actually received a confirmation qualify: an order
 * confirmed, cancelled, or only ever messaged by hand through wa.me leaves
 * `whatsappConfirmSentAt` null and is never chased.
 */
export const findRemindersDue = async (
    tenantId: string,
    now = new Date(),
    limit = BATCH_LIMIT
): Promise<ReminderDue[]> => {
    const due: ReminderDue[] = []

    for (const [index, delay] of REMINDER_DELAYS_MS.entries()) {
        const orders = await prisma.order.findMany({
            where: {
                tenantId,
                status: 'PENDING',
                whatsappConfirmSentAt: { not: null, lte: new Date(now.getTime() - delay) },
                whatsappRemindersSent: index
            },
            orderBy: { whatsappConfirmSentAt: 'asc' },
            take: limit,
            select: { id: true }
        })

        for (const order of orders) {
            due.push({ orderId: order.id, attempt: index + 1 })
        }
    }

    return due
}

/** One pass over every tenant that has reminders switched on. */
export const runWhatsAppReminders = async (opts?: { now?: Date }): Promise<ReminderRunSummary> => {
    const now = opts?.now ?? new Date()
    const summary: ReminderRunSummary = { tenants: 0, due: 0, sent: 0, skipped: 0, failed: 0 }

    const integrations = await prisma.tenantIntegration.findMany({
        where: { provider: WHATSAPP_PROVIDER, isActive: true },
        select: { tenantId: true, config: true }
    })

    for (const integration of integrations) {
        const config = parseWhatsAppConfig(integration.config)
        if (!config?.remindersEnabled) continue

        summary.tenants += 1

        let due: ReminderDue[] = []
        try {
            due = await findRemindersDue(integration.tenantId, now)
        } catch (error) {
            // One tenant's failure must not end the run for the others.
            console.error(`[WhatsAppReminders] Lookup failed for tenant ${integration.tenantId}:`, error)
            continue
        }

        summary.due += due.length

        for (const item of due) {
            try {
                const result = await whatsappService.sendOrderReminder(
                    integration.tenantId,
                    item.orderId,
                    item.attempt
                )
                if (result.ok) summary.sent += 1
                else if ('failed' in result) summary.failed += 1
                else summary.skipped += 1
            } catch (error) {
                summary.failed += 1
                console.error(`[WhatsAppReminders] Send failed for order ${item.orderId}:`, error)
            }
        }
    }

    return summary
}

/** A single locked pass. Exported so a manual trigger reuses the same guard. */
export const tickWhatsAppReminders = async (opts?: { now?: Date }) =>
    withJobLock(REMINDER_JOB_NAME, LEASE_MS, async () => {
        const summary = await runWhatsAppReminders(opts)
        if (summary.sent > 0 || summary.failed > 0) {
            console.log(
                `[WhatsAppReminders] due=${summary.due} sent=${summary.sent} skipped=${summary.skipped} failed=${summary.failed}`
            )
        }
        return summary
    })

let timer: NodeJS.Timeout | null = null

/**
 * Starts the in-process scheduler.
 *
 * Off under test — every API suite imports the Express app, and a timer firing
 * mid-suite would write to the same database the assertions read. `unref` keeps
 * it from holding the process open.
 */
export const startWhatsAppReminderScheduler = () => {
    if (timer) return timer
    if (process.env.NODE_ENV === 'test') return null
    if (String(process.env.WHATSAPP_REMINDERS_ENABLED ?? 'true').toLowerCase() === 'false') return null

    timer = setInterval(() => {
        void tickWhatsAppReminders().catch((error) => {
            console.error('[WhatsAppReminders] Tick failed:', error)
        })
    }, TICK_MS)

    timer.unref?.()
    return timer
}

export const stopWhatsAppReminderScheduler = () => {
    if (!timer) return
    clearInterval(timer)
    timer = null
}
