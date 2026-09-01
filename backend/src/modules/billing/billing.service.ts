import prisma from '../../lib/prisma'
import {
    PRICING_PLANS,
    getPlanByCode,
    isFreePlan,
    planRank,
    quotePlan,
    type BillingInterval,
    type PlanCode,
    type PlanDefinition,
    type PlanQuote
} from '../../../../shared/pricing/plans'
import {
    addBillingInterval,
    currentUsageWindow,
    daysBetween,
    normalizeInterval
} from '../../../../shared/pricing/billing-period'
import { getPaymentMethod } from '../../../../shared/pricing/payment-methods'
import { STATUS_ACTIVE, STATUS_PAST_DUE, STATUS_TRIALING } from './subscription.service'

export class BillingValidationError extends Error {
    constructor(
        readonly statusCode: number,
        message: string
    ) {
        super(message)
        this.name = 'BillingValidationError'
    }
}

export interface PlanCatalogEntry extends PlanDefinition {
    rank: number
    free: boolean
    quotes: Record<BillingInterval, PlanQuote>
}

export interface UsageMetric {
    used: number
    limit: number
    /** 0–100, clamped. `-1` limits report 0 so the UI can show "unlimited". */
    percent: number
    exceeded: boolean
    unlimited: boolean
}

export interface TenantBillingSnapshot {
    subscription: {
        source: 'db' | 'default'
        planCode: PlanCode
        interval: BillingInterval
        status: string
        currentPeriodStart: string
        currentPeriodEnd: string
        cancelAtPeriodEnd: boolean
        trialEnd: string | null
        isTrialing: boolean
        isPastDue: boolean
        /** Negative once the term has lapsed. */
        daysUntilRenewal: number
    }
    plan: PlanDefinition
    /** What the next renewal costs on the current plan and interval. */
    renewalQuote: PlanQuote
    usage: {
        /** The monthly quota window — a month wide whatever the billing interval. */
        periodStart: string
        periodEnd: string
        ordersInPeriod: number
        ordersLimit: number
        orders: UsageMetric
        products: UsageMetric
        pixels: UsageMetric
    }
}

const buildMetric = (used: number, limit: number): UsageMetric => {
    const unlimited = limit < 0
    return {
        used,
        limit,
        percent: unlimited || limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100)),
        exceeded: !unlimited && limit > 0 && used >= limit,
        unlimited
    }
}

export class BillingService {
    async listPlans(): Promise<PlanCatalogEntry[]> {
        return PRICING_PLANS.map((plan) => ({
            ...plan,
            rank: planRank(plan.code),
            free: isFreePlan(plan),
            quotes: {
                month: quotePlan(plan, 'month'),
                year: quotePlan(plan, 'year')
            }
        }))
    }

    /**
     * Writes the subscription row for a plan change.
     *
     * @param params.startAt when the new term begins. Approvals pass the end of
     *   the term already paid for so a customer who renews early keeps the days
     *   they have left instead of having them overwritten with `now`.
     */
    async setTenantSubscription(params: {
        tenantId: string
        planCode: PlanCode
        interval: BillingInterval
        startAt?: Date
        status?: string
    }) {
        const plan = getPlanByCode(params.planCode)
        if (!plan) throw new BillingValidationError(400, 'Invalid planCode')

        const interval = normalizeInterval(params.interval)
        const currentPeriodStart = params.startAt ?? new Date()
        const currentPeriodEnd = addBillingInterval(currentPeriodStart, interval)
        const status = params.status ?? STATUS_ACTIVE

        return await prisma.tenantSubscription.upsert({
            where: { tenantId: params.tenantId },
            create: {
                tenantId: params.tenantId,
                planCode: params.planCode,
                interval,
                status,
                currentPeriodStart,
                currentPeriodEnd
            },
            update: {
                planCode: params.planCode,
                interval,
                status,
                currentPeriodStart,
                currentPeriodEnd,
                cancelAtPeriodEnd: false,
                trialEnd: null
            }
        })
    }

    async listPayments(tenantId: string) {
        return prisma.billingPayment.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
            take: 50
        })
    }

    /**
     * Where a term starting today would actually begin: at the end of the one
     * already paid for, if any is left.
     */
    private async nextTermStart(tenantId: string, now: Date): Promise<Date> {
        const subscription = await prisma.tenantSubscription.findUnique({ where: { tenantId } })
        if (!subscription) return now

        const isLive = subscription.status === STATUS_ACTIVE || subscription.status === STATUS_TRIALING
        const end = subscription.currentPeriodEnd
        return isLive && end && end > now ? end : now
    }

    async simulatePayment(params: { tenantId: string; userId?: string; planCode: PlanCode; interval: BillingInterval }) {
        const plan = getPlanByCode(params.planCode)
        if (!plan) throw new BillingValidationError(400, 'Invalid planCode')

        const interval = normalizeInterval(params.interval)
        const subscription = await this.setTenantSubscription({
            tenantId: params.tenantId,
            planCode: params.planCode,
            interval
        })

        const quote = quotePlan(plan, interval)

        await prisma.billingPayment.create({
            data: {
                tenantId: params.tenantId,
                planCode: params.planCode,
                interval,
                amountDzd: quote.totalDzd,
                currency: quote.currency,
                method: 'SIMULATED',
                status: 'PAID',
                createdByUserId: params.userId,
                periodStart: subscription.currentPeriodStart,
                periodEnd: subscription.currentPeriodEnd
            }
        })

        return this.getTenantBillingSnapshot(params.tenantId)
    }

    /**
     * Records a manual-transfer payment for review.
     *
     * The amount is derived from the catalogue, never taken from the request:
     * the client used to send `amountDzd` and the server wrote it straight to
     * the ledger, so a tenant could have claimed a year of Professional for 1 DA.
     */
    async submitPayment(params: {
        tenantId: string
        userId?: string
        planCode: PlanCode
        interval: BillingInterval
        method: string
        proofUrl?: string
        notes?: string
    }) {
        const plan = getPlanByCode(params.planCode)
        if (!plan) throw new BillingValidationError(400, 'Invalid planCode')

        if (isFreePlan(plan)) {
            throw new BillingValidationError(400, 'The free plan does not take a payment')
        }

        const method = getPaymentMethod(params.method)
        if (!method) throw new BillingValidationError(400, 'Unsupported payment method')
        if (!method.available) throw new BillingValidationError(400, 'This payment method is not available yet')
        if (method.requiresProof && !params.proofUrl) {
            throw new BillingValidationError(400, 'A payment proof is required for this method')
        }

        const alreadyPending = await prisma.billingPayment.findFirst({
            where: { tenantId: params.tenantId, status: 'PENDING' },
            select: { id: true }
        })
        if (alreadyPending) {
            throw new BillingValidationError(409, 'A payment is already awaiting review')
        }

        const interval = normalizeInterval(params.interval)
        const quote = quotePlan(plan, interval)

        const now = new Date()
        const periodStart = await this.nextTermStart(params.tenantId, now)
        const periodEnd = addBillingInterval(periodStart, interval)

        return prisma.billingPayment.create({
            data: {
                tenantId: params.tenantId,
                planCode: params.planCode,
                interval,
                amountDzd: quote.totalDzd,
                currency: quote.currency,
                method: method.id,
                status: 'PENDING',
                proofUrl: params.proofUrl,
                notes: params.notes,
                createdByUserId: params.userId,
                periodStart,
                periodEnd
            }
        })
    }

    /**
     * Turns automatic renewal off (or back on).
     *
     * `cancelAtPeriodEnd` has existed on the model and in the API response since
     * the table was created, with nothing anywhere able to set it.
     */
    async setCancelAtPeriodEnd(params: { tenantId: string; cancel: boolean }) {
        const subscription = await prisma.tenantSubscription.findUnique({
            where: { tenantId: params.tenantId }
        })
        if (!subscription) throw new BillingValidationError(404, 'No subscription to update')

        await prisma.tenantSubscription.update({
            where: { tenantId: params.tenantId },
            data: { cancelAtPeriodEnd: params.cancel }
        })

        return this.getTenantBillingSnapshot(params.tenantId)
    }

    async getTenantBillingSnapshot(tenantId: string): Promise<TenantBillingSnapshot> {
        const subscription = await prisma.tenantSubscription.findUnique({ where: { tenantId } })

        const planCode = (subscription?.planCode as PlanCode | undefined) ?? 'basic'
        const plan = getPlanByCode(planCode) ?? getPlanByCode('basic')
        if (!plan) throw new Error('Missing default plan definition')

        const interval = normalizeInterval(subscription?.interval)
        const now = new Date()

        const currentPeriodStart = subscription?.currentPeriodStart ?? now
        const currentPeriodEnd = subscription?.currentPeriodEnd ?? addBillingInterval(currentPeriodStart, interval)

        const status = subscription?.status ?? STATUS_ACTIVE
        const trialEnd = subscription?.trialEnd ?? null
        const isTrialing = status === STATUS_TRIALING && trialEnd != null && now < trialEnd

        // A trial ends on its own date; the paid term ends on the period end.
        const effectiveEnd = status === STATUS_TRIALING ? (trialEnd ?? currentPeriodEnd) : currentPeriodEnd

        // The quota window is a month wide whatever the billing interval, anchored
        // on the day the subscription bills. Counting orders across a full annual
        // term against a per-month allowance is what used to 429 annual tenants.
        const quota = currentUsageWindow(currentPeriodStart, now)

        const [ordersInPeriod, productCount, pixelCount] = await Promise.all([
            prisma.order.count({
                where: { tenantId, createdAt: { gte: quota.start, lt: quota.end } }
            }),
            prisma.product.count({ where: { tenantId } }),
            prisma.tenantMetaPixel.count({ where: { tenantId } })
        ])

        return {
            subscription: {
                source: subscription ? 'db' : 'default',
                planCode,
                interval,
                status,
                currentPeriodStart: currentPeriodStart.toISOString(),
                currentPeriodEnd: currentPeriodEnd.toISOString(),
                cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
                trialEnd: trialEnd ? trialEnd.toISOString() : null,
                isTrialing,
                isPastDue: status === STATUS_PAST_DUE || now >= effectiveEnd,
                daysUntilRenewal: daysBetween(now, effectiveEnd)
            },
            plan,
            renewalQuote: quotePlan(plan, interval),
            usage: {
                periodStart: quota.start.toISOString(),
                periodEnd: quota.end.toISOString(),
                // Kept flat as well as inside `orders` — the super-admin tenant
                // detail screen and the API tests both read these two.
                ordersInPeriod,
                ordersLimit: plan.ordersPerMonth,
                orders: buildMetric(ordersInPeriod, plan.ordersPerMonth),
                products: buildMetric(productCount, plan.maxProducts),
                pixels: buildMetric(pixelCount, plan.maxPixels)
            }
        }
    }
}
