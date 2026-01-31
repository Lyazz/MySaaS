import prisma from '../../lib/prisma'
import { getPlanByCode, planPriceForInterval, type BillingInterval, type PlanCode } from '../../../../shared/pricing/plans'

const addUtcMonths = (date: Date, months: number) =>
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate(), 0, 0, 0, 0))

const addUtcYears = (date: Date, years: number) =>
    new Date(Date.UTC(date.getUTCFullYear() + years, date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0))

export class BillingAdminService {
    async setTenantSubscription(params: { tenantId: string; planCode: PlanCode; interval: BillingInterval }) {
        const plan = getPlanByCode(params.planCode)
        if (!plan) {
            throw new Error('Invalid planCode')
        }

        const now = new Date()
        const currentPeriodEnd = params.interval === 'year' ? addUtcYears(now, 1) : addUtcMonths(now, 1)

        const subscription = await prisma.tenantSubscription.upsert({
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
                cancelAtPeriodEnd: false,
                trialEnd: null
            }
        })

        return subscription
    }

    async importPayment(params: {
        tenantId: string
        planCode: PlanCode
        interval: BillingInterval
        method?: 'MANUAL_PROOF'
        status?: 'IMPORTED' | 'PAID'
        proofUrl?: string
        notes?: string
        externalReference?: string
        createdByUserId?: string
        reviewedByUserId?: string
        applySubscription?: boolean
    }) {
        const plan = getPlanByCode(params.planCode)
        if (!plan) throw new Error('Invalid planCode')

        const amount = planPriceForInterval(plan, params.interval)
        let subscriptionPeriodStart: Date | null = null
        let subscriptionPeriodEnd: Date | null = null

        if (params.applySubscription) {
            const sub = await this.setTenantSubscription({
                tenantId: params.tenantId,
                planCode: params.planCode,
                interval: params.interval
            })
            subscriptionPeriodStart = sub.currentPeriodStart
            subscriptionPeriodEnd = sub.currentPeriodEnd
        }

        return prisma.billingPayment.create({
            data: {
                tenantId: params.tenantId,
                planCode: params.planCode,
                interval: params.interval,
                amountDzd: amount,
                currency: plan.pricing.currency,
                method: 'MANUAL_PROOF',
                status: params.status ?? 'IMPORTED',
                proofUrl: params.proofUrl,
                notes: params.notes,
                externalReference: params.externalReference,
                createdByUserId: params.createdByUserId,
                reviewedByUserId: params.reviewedByUserId,
                periodStart: subscriptionPeriodStart,
                periodEnd: subscriptionPeriodEnd
            }
        })
    }

    async listPayments(tenantId: string) {
        return prisma.billingPayment.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
            take: 100
        })
    }
}
