import type { Prisma, PrismaClient, TenantSubscription } from '@prisma/client'

import prisma from '../../lib/prisma'

/**
 * The single place a tenant's subscription row is created.
 *
 * Three call sites used to create this row independently -- registration,
 * super-admin tenant creation, and the subscription middleware's silent upsert
 * -- and all three hardcoded `status: 'ACTIVE'`. That is precisely why nothing
 * has ever written `TRIALING` despite the column, the `trialEnd` field, and the
 * pricing page all promising a free trial.
 */

export const TRIAL_DAYS = (() => {
    const configured = Number(process.env.TRIAL_DAYS)
    return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 15
})()

export const DEFAULT_PLAN_CODE = 'basic'
export const DEFAULT_INTERVAL = 'month'

export const STATUS_TRIALING = 'TRIALING'
export const STATUS_ACTIVE = 'ACTIVE'
export const STATUS_PAST_DUE = 'PAST_DUE'

const addUtcMonths = (date: Date, months: number) =>
    new Date(
        Date.UTC(
            date.getUTCFullYear(),
            date.getUTCMonth() + months,
            date.getUTCDate(),
            0,
            0,
            0,
            0
        )
    )

const addDays = (date: Date, days: number) =>
    new Date(date.getTime() + days * 24 * 60 * 60 * 1000)

type Client = PrismaClient | Prisma.TransactionClient

/**
 * Creates the subscription row if the tenant has none, and leaves an existing
 * one alone.
 *
 * @param opts.startTrial start the tenant on a trial rather than a live period.
 *   The trial's end date is what bounds the activation licence a device
 *   receives, so a trial device locks itself on schedule even with no network.
 */
export const ensureSubscription = async (
    client: Client,
    tenantId: string,
    opts?: { startTrial?: boolean; planCode?: string; interval?: string; now?: Date }
): Promise<TenantSubscription> => {
    const now = opts?.now ?? new Date()
    const planCode = opts?.planCode ?? DEFAULT_PLAN_CODE
    const interval = opts?.interval ?? DEFAULT_INTERVAL
    const startTrial = opts?.startTrial === true

    const trialEnd = startTrial ? addDays(now, TRIAL_DAYS) : null

    return client.tenantSubscription.upsert({
        where: { tenantId },
        create: {
            tenantId,
            planCode,
            interval,
            status: startTrial ? STATUS_TRIALING : STATUS_ACTIVE,
            currentPeriodStart: now,
            // A trial's period end matches its trial end, so the existing expiry
            // path keeps working without a second notion of "when does this run
            // out".
            currentPeriodEnd: trialEnd ?? addUtcMonths(now, 1),
            trialEnd
        },
        update: {}
    })
}

/** True when the tenant is inside a live trial at [now]. */
export const isWithinTrial = (
    subscription: Pick<TenantSubscription, 'status' | 'trialEnd'>,
    now: Date = new Date()
): boolean =>
    subscription.status?.trim().toUpperCase() === STATUS_TRIALING &&
    subscription.trialEnd != null &&
    now < subscription.trialEnd

/**
 * Starts or extends a trial. Super-admin driven; there is deliberately no
 * self-serve path to extend one.
 */
export const setTrial = async (
    tenantId: string,
    days: number = TRIAL_DAYS,
    now: Date = new Date()
): Promise<TenantSubscription> => {
    const trialEnd = addDays(now, days)

    return prisma.tenantSubscription.upsert({
        where: { tenantId },
        create: {
            tenantId,
            planCode: DEFAULT_PLAN_CODE,
            interval: DEFAULT_INTERVAL,
            status: STATUS_TRIALING,
            currentPeriodStart: now,
            currentPeriodEnd: trialEnd,
            trialEnd
        },
        update: {
            status: STATUS_TRIALING,
            currentPeriodEnd: trialEnd,
            trialEnd
        }
    })
}
