import type { Request, Response } from 'express'
import prisma from '../../lib/prisma'
import { LoyaltyLedgerService } from './loyalty-ledger.service'

const service = new LoyaltyLedgerService()

export class LoyaltyController {
    async getCustomerPoints(req: Request, res: Response) {
        try {
            const tenant = req.tenant
            const customerId = Array.isArray(req.params.customerId) ? req.params.customerId[0] : req.params.customerId
            if (!tenant || !customerId) {
                return res.status(404).json({ statusCode: 404, statusMessage: 'Tenant or customer not found' })
            }

            const customer = await prisma.customer.findUnique({
                where: { tenantId_id: { tenantId: tenant.id, id: customerId } },
                select: { id: true }
            })
            if (!customer) {
                return res.status(404).json({ statusCode: 404, statusMessage: 'Customer not found' })
            }

            const data = await service.getCustomerPointsDetails(prisma, tenant.id, customerId)
            return res.json(data)
        } catch (error) {
            console.error('Get loyalty customer points error:', error)
            return res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
        }
    }
}
