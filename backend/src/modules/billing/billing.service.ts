import prisma from '../../lib/prisma'
import { PRICING_PLANS, getPlanByCode, planPriceForInterval, type BillingInterval, type PlanCode, type PlanDefinition } from '../../../../shared/pricing/plans'

const startOfUtcMonth = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0))
const startOfNextUtcMonth = (date: Date) =>
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0, 0))

const addUtcMonths = (date: Date, months: number) =>
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate(), 0, 0, 0, 0))

const addUtcYears = (date: Date, years: number) =>
    new Date(Date.UTC(date.getUTCFullYear() + years, date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0))

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
    }
    plan: PlanDefinition
    usage: {
        ordersInPeriod: number
        ordersLimit: number
        periodStart: string
        periodEnd: string
    }
}

export class BillingService {
    async listPlans() {
        return PRICING_PLANS.map((p) => ({
            code: p.code,
            name: p.name,
            description: p.description,
            pricing: p.pricing,
            ordersPerMonth: p.ordersPerMonth,
            flags: p.flags ?? null
        }))
    }

    async setTenantSubscription(params: { tenantId: string; planCode: PlanCode; interval: BillingInterval }) {
        const plan = getPlanByCode(params.planCode)
        if (!plan) throw new Error('Invalid planCode')

        const now = new Date()
        const currentPeriodEnd = params.interval === 'year' ? addUtcYears(now, 1) : addUtcMonths(now, 1)

        return await prisma.tenantSubscription.upsert({
            where: { tenantId: params.tenantId },
            create: {
                tenantId: params.tenantId,
                planCode: params.planCode,
                interval: params.interval,
                status: 'ACTIVE',
                currentPeriodStart: now,
                currentPeriodEnd
            },
            update: {
                planCode: params.planCode,
                interval: params.interval,
                status: 'ACTIVE',
                currentPeriodStart: now,
                currentPeriodEnd,
                cancelAtPeriodEnd: false
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

    async simulatePayment(params: { tenantId: string; userId?: string; planCode: PlanCode; interval: BillingInterval }) {
        const plan = getPlanByCode(params.planCode)
        if (!plan) throw new Error('Invalid planCode')

        const subscription = await this.setTenantSubscription({
            tenantId: params.tenantId,
            planCode: params.planCode,
            interval: params.interval
        })

        const amount = planPriceForInterval(plan, params.interval)

        await prisma.billingPayment.create({
            data: {
                tenantId: params.tenantId,
                planCode: params.planCode,
                interval: params.interval,
                amountDzd: amount,
                currency: plan.pricing.currency,
                method: 'SIMULATED',
                status: 'PAID',
                createdByUserId: params.userId,
                periodStart: subscription.currentPeriodStart,
                periodEnd: subscription.currentPeriodEnd
            }
        })

        return this.getTenantBillingSnapshot(params.tenantId)
    }

    async submitPayment(params: {
        tenantId: string
        userId?: string
        planCode: PlanCode
        interval: BillingInterval
        method: string
        amountDzd: number
        proofUrl?: string
        notes?: string
    }) {
        const plan = getPlanByCode(params.planCode)
        if (!plan) throw new Error('Invalid planCode')

        const subscription = await prisma.tenantSubscription.findUnique({
            where: { tenantId: params.tenantId }
        })

        // If the tenant doesn't have an active subscription, or it's just 'basic', 
        // the new period will start now or at the end of the current period.
        // For simplicity, we capture the intended period start/end based on the current state.
        const now = new Date()
        let periodStart = now
        let periodEnd = params.interval === 'year' ? addUtcYears(now, 1) : addUtcMonths(now, 1)

        if (subscription && subscription.status === 'ACTIVE' && subscription.currentPeriodEnd && subscription.currentPeriodEnd > now) {
            periodStart = subscription.currentPeriodEnd
            periodEnd = params.interval === 'year' ? addUtcYears(periodStart, 1) : addUtcMonths(periodStart, 1)
        }

        const payment = await prisma.billingPayment.create({
            data: {
                tenantId: params.tenantId,
                planCode: params.planCode,
                interval: params.interval,
                amountDzd: params.amountDzd,
                currency: plan.pricing.currency,
                method: params.method,
                status: 'PENDING',
                proofUrl: params.proofUrl,
                notes: params.notes,
                createdByUserId: params.userId,
                periodStart,
                periodEnd
            }
        })

        return payment
    }

    async getTenantBillingSnapshot(tenantId: string): Promise<TenantBillingSnapshot> {
        const subscription = await prisma.tenantSubscription.findUnique({ where: { tenantId } })

        const planCode = (subscription?.planCode as PlanCode | undefined) ?? 'basic'
        const plan = getPlanByCode(planCode) ?? getPlanByCode('basic')
        if (!plan) throw new Error('Missing default plan definition')

        const interval: BillingInterval = subscription?.interval === 'year' ? 'year' : 'month'

        const now = new Date()
        const defaultStart = startOfUtcMonth(now)
        const defaultEnd = startOfNextUtcMonth(now)

        const currentPeriodStart = subscription?.currentPeriodStart ?? defaultStart
        const currentPeriodEnd =
            subscription?.currentPeriodEnd ??
            (interval === 'year' ? addUtcYears(currentPeriodStart, 1) : addUtcMonths(currentPeriodStart, 1))

        const ordersInPeriod = await prisma.order.count({
            where: {
                tenantId,
                createdAt: {
                    gte: currentPeriodStart,
                    lt: currentPeriodEnd
                }
            }
        })

        return {
            subscription: {
                source: subscription ? 'db' : 'default',
                planCode,
                interval,
                status: subscription?.status ?? 'ACTIVE',
                currentPeriodStart: currentPeriodStart.toISOString(),
                currentPeriodEnd: currentPeriodEnd.toISOString(),
                cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
                trialEnd: subscription?.trialEnd ? subscription.trialEnd.toISOString() : null
            },
            plan,
            usage: {
                ordersInPeriod,
                ordersLimit: plan.ordersPerMonth,
                periodStart: currentPeriodStart.toISOString(),
                periodEnd: currentPeriodEnd.toISOString()
            }
        }
    }
}
