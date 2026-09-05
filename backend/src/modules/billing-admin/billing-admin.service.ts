import prisma from '../../lib/prisma'
import { getPlanByCode, quotePlan, type BillingInterval, type PlanCode } from '../../../../shared/pricing/plans'
import { addBillingInterval, normalizeInterval } from '../../../../shared/pricing/billing-period'
import { STATUS_ACTIVE, STATUS_TRIALING } from '../billing/subscription.service'
import { PRIVATE_BUCKET_NAME } from '../../lib/s3'
import { parseStorageRef } from '../../lib/storage-ref'
import { presignGetObject } from '../../lib/s3-presign'
import { signLocalFileToken } from '../../lib/local-file-token'
import path from 'path'

export class BillingAdminService {
    /**
     * Where a new term should begin: at the end of the one already paid for, if
     * any of it is left.
     *
     * Approving a payment used to restart the period from `now`, so a customer
     * who renewed a fortnight early lost that fortnight. Stacking the term is
     * both what they paid for and what the payment row already recorded.
     */
    private async nextTermStart(tenantId: string, now: Date): Promise<Date> {
        const existing = await prisma.tenantSubscription.findUnique({ where: { tenantId } })
        if (!existing) return now

        const isLive = existing.status === STATUS_ACTIVE || existing.status === STATUS_TRIALING
        const end = existing.currentPeriodEnd
        return isLive && end && end > now ? end : now
    }

    async setTenantSubscription(params: {
        tenantId: string
        planCode: PlanCode
        interval: BillingInterval
        /** Defaults to now. Approvals pass the end of the term already paid for. */
        startAt?: Date
    }) {
        const plan = getPlanByCode(params.planCode)
        if (!plan) {
            throw new Error('Invalid planCode')
        }

        const interval = normalizeInterval(params.interval)
        const currentPeriodStart = params.startAt ?? new Date()
        const currentPeriodEnd = addBillingInterval(currentPeriodStart, interval)

        const subscription = await prisma.tenantSubscription.upsert({
            where: { tenantId: params.tenantId },
            create: {
                tenantId: params.tenantId,
                planCode: params.planCode,
                interval,
                status: STATUS_ACTIVE,
                currentPeriodStart,
                currentPeriodEnd
            },
            update: {
                planCode: params.planCode,
                interval,
                status: STATUS_ACTIVE,
                currentPeriodStart,
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

        const quote = quotePlan(plan, params.interval)
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
                interval: quote.interval,
                amountDzd: quote.totalDzd,
                currency: quote.currency,
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

    async listPendingPayments() {
        return prisma.billingPayment.findMany({
            where: { status: 'PENDING' },
            orderBy: { createdAt: 'asc' },
            include: {
                tenant: {
                    select: { id: true, name: true, slug: true }
                }
            }
        })
    }

    async getPaymentProofUrl(params: { tenantId: string; paymentId: string }) {
        const payment = await prisma.billingPayment.findUnique({
            where: { id: params.paymentId, tenantId: params.tenantId },
            select: { proofUrl: true }
        })

        if (!payment?.proofUrl) {
            throw new Error('Proof not found')
        }

        const ref = parseStorageRef(payment.proofUrl)
        if (ref.kind === 'http') return { url: ref.url }

        if (ref.kind === 'local') {
            if (!ref.key.startsWith(`tenants/${params.tenantId}/`)) {
                throw new Error('Invalid proof key')
            }
            const ext = path.extname(ref.key).toLowerCase()
            const mimeType =
                ext === '.png'
                    ? 'image/png'
                    : ext === '.jpg' || ext === '.jpeg'
                      ? 'image/jpeg'
                      : ext === '.webp'
                        ? 'image/webp'
                        : ext === '.pdf'
                          ? 'application/pdf'
                          : 'application/octet-stream'
            const token = signLocalFileToken({ key: ref.key, mimeType })
            return { url: `/api/files/local?token=${encodeURIComponent(token)}` }
        }

        if (ref.bucket !== PRIVATE_BUCKET_NAME) {
            throw new Error('Invalid proof bucket')
        }

        if (!ref.key.startsWith(`tenants/${params.tenantId}/`)) {
            throw new Error('Invalid proof key')
        }

        const url = await presignGetObject({ bucket: ref.bucket, key: ref.key })
        return { url }
    }

    async reviewPayment(params: {
        tenantId: string
        paymentId: string
        status: 'PAID' | 'REJECTED'
        reviewedByUserId?: string
    }) {
        const payment = await prisma.billingPayment.findUnique({
            where: { id: params.paymentId, tenantId: params.tenantId }
        })

        if (!payment) {
            throw new Error('Payment not found')
        }

        // Apply subscription if payment is approved
        if (params.status === 'PAID') {
            const now = new Date()

            // Honour the term the tenant was quoted at submission time when it is
            // still in the future, so a review that lands days later does not
            // shorten what they bought.
            const startAt =
                payment.periodStart && payment.periodStart > now
                    ? payment.periodStart
                    : await this.nextTermStart(params.tenantId, now)

            const sub = await this.setTenantSubscription({
                tenantId: params.tenantId,
                planCode: payment.planCode as PlanCode,
                interval: payment.interval as BillingInterval,
                startAt
            })

            return prisma.billingPayment.update({
                where: { id: params.paymentId },
                data: {
                    status: params.status,
                    reviewedByUserId: params.reviewedByUserId,
                    periodStart: sub.currentPeriodStart,
                    periodEnd: sub.currentPeriodEnd
                }
            })
        }

        return prisma.billingPayment.update({
            where: { id: params.paymentId },
            data: {
                status: params.status,
                reviewedByUserId: params.reviewedByUserId
            }
        })
    }
}
