import type { Request, Response } from 'express'
import { BillingService } from './billing.service'
import { logAction } from '../../lib/audit'
import type { BillingInterval, PlanCode } from '../../../../shared/pricing/plans'

const isBillingInterval = (value: unknown): value is BillingInterval => value === 'month' || value === 'year'

export class BillingController {
    constructor(private readonly service = new BillingService()) { }

    async listPlans(req: Request, res: Response) {
        try {
            const plans = await this.service.listPlans()
            return res.json({ plans })
        } catch (error) {
            console.error('List plans error', error)
            return res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
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
            console.error('Get subscription error', error)
            return res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
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
            console.error('List payments error', error)
            return res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }

    async simulatePayment(req: Request, res: Response) {
        const tenant = req.tenant
        const user = req.user
        if (!tenant) {
            return res.status(400).json({ statusCode: 400, statusMessage: 'Tenant context is required' })
        }

        const { planCode, interval } = req.body ?? {}
        if (typeof planCode !== 'string') {
            return res.status(400).json({ statusCode: 400, statusMessage: 'Missing planCode' })
        }

        const normalizedPlanCode = planCode as PlanCode
        const normalizedInterval: BillingInterval = isBillingInterval(interval) ? interval : 'month'

        try {
            const snapshot = await this.service.simulatePayment({
                tenantId: tenant.id,
                userId: user?.id,
                planCode: normalizedPlanCode,
                interval: normalizedInterval
            })

            await logAction({
                action: 'SIMULATE_PAYMENT',
                details: `Simulated payment for ${normalizedPlanCode} (${normalizedInterval})`,
                userId: user?.id,
                tenantId: tenant.id
            })

            return res.json(snapshot)
        } catch (error) {
            if (error instanceof Error && error.message === 'Invalid planCode') {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Invalid planCode' })
            }
            console.error('Simulate payment error', error)
            return res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }

    async submitPayment(req: Request, res: Response) {
        const tenant = req.tenant
        const user = req.user
        if (!tenant) {
            return res.status(400).json({ statusCode: 400, statusMessage: 'Tenant context is required' })
        }

        const { planCode, interval, method, amountDzd, proofUrl, notes } = req.body ?? {}
        if (typeof planCode !== 'string') {
            return res.status(400).json({ statusCode: 400, statusMessage: 'Missing planCode' })
        }

        const normalizedPlanCode = planCode as PlanCode
        const normalizedInterval: BillingInterval = isBillingInterval(interval) ? interval : 'month'

        try {
            const payment = await this.service.submitPayment({
                tenantId: tenant.id,
                userId: user?.id,
                planCode: normalizedPlanCode,
                interval: normalizedInterval,
                method: String(method),
                amountDzd: Number(amountDzd),
                proofUrl: proofUrl ? String(proofUrl) : undefined,
                notes: notes ? String(notes) : undefined
            })

            await logAction({
                action: 'SUBMIT_PAYMENT',
                details: `Submitted payment proof for ${normalizedPlanCode} (${normalizedInterval}) via ${method}`,
                userId: user?.id,
                tenantId: tenant.id
            })

            return res.json(payment)
        } catch (error) {
            if (error instanceof Error && error.message === 'Invalid planCode') {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Invalid planCode' })
            }
            console.error('Submit payment error', error)
            return res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }
}
