import type { Request, Response } from 'express'
import { BillingAdminService } from './billing-admin.service'
import { logAction } from '../../lib/audit'
import type { BillingInterval, PlanCode } from '../../../../shared/pricing/plans'

const isBillingInterval = (value: unknown): value is BillingInterval => value === 'month' || value === 'year'
const firstString = (value: unknown): string | null => {
    if (typeof value === 'string') return value
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
    return null
}

export class BillingAdminController {
    constructor(private readonly service = new BillingAdminService()) { }

    async listTenantPayments(req: Request, res: Response) {
        const user = req.user
        const tenantId = firstString((req.params as any)?.tenantId)
        if (!tenantId) {
            return res.status(400).json({ statusCode: 400, statusMessage: 'Missing tenantId' })
        }

        try {
            const payments = await this.service.listPayments(tenantId)
            await logAction({
                action: 'LIST_TENANT_PAYMENTS',
                details: `Listed payments for tenant ${tenantId}`,
                userId: user?.id,
                tenantId
            })
            return res.json({ payments })
        } catch (error) {
            console.error('List tenant payments error', error)
            return res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }

    async listPendingPayments(req: Request, res: Response) {
        try {
            const payments = await this.service.listPendingPayments()
            return res.json({ payments })
        } catch (error) {
            console.error('List pending payments error', error)
            return res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }

    async importTenantPayment(req: Request, res: Response) {
        const user = req.user
        const tenantId = firstString((req.params as any)?.tenantId)
        const { planCode, interval, proofUrl, notes, externalReference, applySubscription } = req.body ?? {}

        if (!tenantId) {
            return res.status(400).json({ statusCode: 400, statusMessage: 'Missing tenantId' })
        }
        if (typeof planCode !== 'string') {
            return res.status(400).json({ statusCode: 400, statusMessage: 'Missing planCode' })
        }

        const normalizedPlanCode = planCode as PlanCode
        const normalizedInterval: BillingInterval = isBillingInterval(interval) ? interval : 'month'

        try {
            const payment = await this.service.importPayment({
                tenantId,
                planCode: normalizedPlanCode,
                interval: normalizedInterval,
                proofUrl: typeof proofUrl === 'string' ? proofUrl : undefined,
                notes: typeof notes === 'string' ? notes : undefined,
                externalReference: typeof externalReference === 'string' ? externalReference : undefined,
                createdByUserId: user?.id,
                reviewedByUserId: user?.id,
                applySubscription: Boolean(applySubscription)
            })

            await logAction({
                action: 'IMPORT_PAYMENT_PROOF',
                details: `Imported payment proof for tenant ${tenantId} (${normalizedPlanCode})`,
                userId: user?.id,
                tenantId,
                targetId: payment.id
            })

            return res.status(201).json(payment)
        } catch (error) {
            if (error instanceof Error && error.message === 'Invalid planCode') {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Invalid planCode' })
            }
            console.error('Import tenant payment error', error)
            return res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }

    async setTenantSubscription(req: Request, res: Response) {
        const user = req.user
        const tenantId = firstString((req.params as any)?.tenantId)
        const { planCode, interval } = req.body ?? {}

        if (!tenantId) {
            return res.status(400).json({ statusCode: 400, statusMessage: 'Missing tenantId' })
        }
        if (typeof planCode !== 'string') {
            return res.status(400).json({ statusCode: 400, statusMessage: 'Missing planCode' })
        }

        const normalizedPlanCode = planCode as PlanCode
        const normalizedInterval: BillingInterval = isBillingInterval(interval) ? interval : 'month'

        try {
            const subscription = await this.service.setTenantSubscription({
                tenantId,
                planCode: normalizedPlanCode,
                interval: normalizedInterval
            })

            await logAction({
                action: 'SET_TENANT_PLAN',
                details: `Set tenant ${tenantId} to plan ${normalizedPlanCode} (${normalizedInterval})`,
                userId: user?.id,
                targetId: subscription.id,
                tenantId
            })

            return res.json(subscription)
        } catch (error) {
            if (error instanceof Error && error.message === 'Invalid planCode') {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Invalid planCode' })
            }
            console.error('Set tenant subscription error', error)
            return res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }

    async reviewPayment(req: Request, res: Response) {
        const user = req.user
        const tenantId = firstString((req.params as any)?.tenantId)
        const paymentId = firstString((req.params as any)?.paymentId)
        const { status } = req.body ?? {}

        if (!tenantId) {
            return res.status(400).json({ statusCode: 400, statusMessage: 'Missing tenantId' })
        }
        if (!paymentId) {
            return res.status(400).json({ statusCode: 400, statusMessage: 'Missing paymentId' })
        }
        if (status !== 'PAID' && status !== 'REJECTED') {
            return res.status(400).json({ statusCode: 400, statusMessage: 'Invalid status. Must be PAID or REJECTED' })
        }

        try {
            const payment = await this.service.reviewPayment({
                tenantId,
                paymentId,
                status,
                reviewedByUserId: user?.id
            })

            await logAction({
                action: 'REVIEW_PAYMENT',
                details: `Reviewed payment ${paymentId} for tenant ${tenantId} (${status})`,
                userId: user?.id,
                targetId: payment.id,
                tenantId
            })

            return res.json(payment)
        } catch (error) {
            if (error instanceof Error && error.message === 'Payment not found') {
                return res.status(404).json({ statusCode: 404, statusMessage: 'Payment not found' })
            }
            console.error('Review payment error', error)
            return res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }

    async getPaymentProofUrl(req: Request, res: Response) {
        const user = req.user
        const tenantId = firstString((req.params as any)?.tenantId)
        const paymentId = firstString((req.params as any)?.paymentId)

        if (!tenantId) {
            return res.status(400).json({ statusCode: 400, statusMessage: 'Missing tenantId' })
        }
        if (!paymentId) {
            return res.status(400).json({ statusCode: 400, statusMessage: 'Missing paymentId' })
        }

        try {
            const result = await this.service.getPaymentProofUrl({ tenantId, paymentId })

            await logAction({
                action: 'VIEW_PAYMENT_PROOF',
                details: `Viewed payment proof for tenant ${tenantId} payment ${paymentId}`,
                userId: user?.id,
                tenantId,
                targetId: paymentId
            })

            return res.json(result)
        } catch (error) {
            if (error instanceof Error && error.message === 'Proof not found') {
                return res.status(404).json({ statusCode: 404, statusMessage: 'Proof not found' })
            }
            if (error instanceof Error && error.message.startsWith('Invalid proof')) {
                return res.status(400).json({ statusCode: 400, statusMessage: error.message })
            }
            console.error('Get payment proof url error', error)
            return res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }
}
