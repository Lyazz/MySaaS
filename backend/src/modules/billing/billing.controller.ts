import type { Request, Response } from 'express'
import { BillingService, BillingValidationError } from './billing.service'
import { logAction } from '../../lib/audit'
import { isPlanCode, type PlanCode } from '../../../../shared/pricing/plans'
import { normalizeInterval } from '../../../../shared/pricing/billing-period'

export class BillingController {
    constructor(private readonly service = new BillingService()) { }

    /** Maps a thrown BillingValidationError onto its status; anything else is a 500. */
    private fail(res: Response, context: string, error: unknown) {
        if (error instanceof BillingValidationError) {
            return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.message })
        }
        console.error(`${context} error`, error)
        return res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
    }

    async listPlans(req: Request, res: Response) {
        try {
            const plans = await this.service.listPlans()
            return res.json({ plans })
        } catch (error) {
            return this.fail(res, 'List plans', error)
        }
    }

    async getSubscription(req: Request, res: Response) {
        const tenant = req.tenant
        if (!tenant) {
            return res.status(400).json({ statusCode: 400, statusMessage: 'Tenant context is required' })
        }

        try {
            const snapshot = await this.service.getTenantBillingSnapshot(tenant.id)
            return res.json(snapshot)
        } catch (error) {
            return this.fail(res, 'Get subscription', error)
        }
    }

    async listPayments(req: Request, res: Response) {
        const tenant = req.tenant
        if (!tenant) {
            return res.status(400).json({ statusCode: 400, statusMessage: 'Tenant context is required' })
        }
        try {
            const payments = await this.service.listPayments(tenant.id)
            return res.json({ payments })
        } catch (error) {
            return this.fail(res, 'List payments', error)
        }
    }

    async simulatePayment(req: Request, res: Response) {
        const tenant = req.tenant
        const user = req.user
        if (!tenant) {
            return res.status(400).json({ statusCode: 400, statusMessage: 'Tenant context is required' })
        }

        const { planCode, interval } = req.body ?? {}
        if (!isPlanCode(planCode)) {
            return res.status(400).json({ statusCode: 400, statusMessage: 'Invalid planCode' })
        }

        const normalizedInterval = normalizeInterval(interval)

        try {
            const snapshot = await this.service.simulatePayment({
                tenantId: tenant.id,
                userId: user?.id,
                planCode,
                interval: normalizedInterval
            })

            await logAction({
                action: 'SIMULATE_PAYMENT',
                details: `Simulated payment for ${planCode} (${normalizedInterval})`,
                userId: user?.id,
                tenantId: tenant.id
            })

            return res.json(snapshot)
        } catch (error) {
            return this.fail(res, 'Simulate payment', error)
        }
    }

    async submitPayment(req: Request, res: Response) {
        const tenant = req.tenant
        const user = req.user
        if (!tenant) {
            return res.status(400).json({ statusCode: 400, statusMessage: 'Tenant context is required' })
        }

        const { planCode, interval, method, proofUrl, notes } = req.body ?? {}
        if (!isPlanCode(planCode)) {
            return res.status(400).json({ statusCode: 400, statusMessage: 'Invalid planCode' })
        }

        const normalizedInterval = normalizeInterval(interval)

        try {
            // `amountDzd` is deliberately not read from the body — the service
            // prices the term from the catalogue.
            const payment = await this.service.submitPayment({
                tenantId: tenant.id,
                userId: user?.id,
                planCode: planCode as PlanCode,
                interval: normalizedInterval,
                method: typeof method === 'string' ? method : '',
                proofUrl: proofUrl ? String(proofUrl) : undefined,
                notes: notes ? String(notes) : undefined
            })

            await logAction({
                action: 'SUBMIT_PAYMENT',
                details: `Submitted payment proof for ${planCode} (${normalizedInterval}) via ${payment.method} — ${payment.amountDzd} ${payment.currency}`,
                userId: user?.id,
                tenantId: tenant.id
            })

            return res.json(payment)
        } catch (error) {
            return this.fail(res, 'Submit payment', error)
        }
    }

    async setCancelAtPeriodEnd(req: Request, res: Response) {
        const tenant = req.tenant
        const user = req.user
        if (!tenant) {
            return res.status(400).json({ statusCode: 400, statusMessage: 'Tenant context is required' })
        }

        const cancel = req.body?.cancelAtPeriodEnd
        if (typeof cancel !== 'boolean') {
            return res.status(400).json({ statusCode: 400, statusMessage: 'cancelAtPeriodEnd must be a boolean' })
        }

        try {
            const snapshot = await this.service.setCancelAtPeriodEnd({ tenantId: tenant.id, cancel })

            await logAction({
                action: cancel ? 'CANCEL_SUBSCRIPTION' : 'RESUME_SUBSCRIPTION',
                details: cancel ? 'Turned off automatic renewal' : 'Turned automatic renewal back on',
                userId: user?.id,
                tenantId: tenant.id
            })

            return res.json(snapshot)
        } catch (error) {
            return this.fail(res, 'Set cancel at period end', error)
        }
    }
}
