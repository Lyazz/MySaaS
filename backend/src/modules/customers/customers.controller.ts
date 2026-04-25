import type { Request, Response } from 'express'
import { CustomersService, CustomerValidationError } from './customers.service'
import prisma from '../../lib/prisma'
import { LoyaltyLedgerService } from '../loyalty/loyalty-ledger.service'

const service = new CustomersService()
const loyalty = new LoyaltyLedgerService()

export class CustomersController {
    async list(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { search, page: pageStr, limit: limitStr } = req.query as { search?: string; page?: string; limit?: string }

            const resolvedSearch = typeof search === 'string' ? search : undefined
            const hasPagination = pageStr !== undefined || limitStr !== undefined

            if (hasPagination) {
                const page = Math.max(1, parseInt(pageStr ?? '1', 10) || 1)
                const limit = Math.min(100, Math.max(1, parseInt(limitStr ?? '25', 10) || 25))
                const result = await service.listPaginated(tenant.id, { search: resolvedSearch }, { page, limit })
                return res.json(result)
            }

            const customers = await service.list(tenant.id, { search: resolvedSearch })
            return res.json(customers)
        } catch (error: any) {
            if (error instanceof CustomerValidationError) {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('List customers error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async create(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const customer = await service.create(tenant.id, req.body)
            res.status(201).json(customer)
        } catch (error: any) {
            if (error instanceof CustomerValidationError) {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Create customer error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async getById(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { id } = req.params

            if (!id || Array.isArray(id)) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Customer ID is required' })
            }

            const data = await service.getById(tenant.id, id)
            res.json(data)
        } catch (error: any) {
            if (error instanceof CustomerValidationError) {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Get customer error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async getByPhone(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { phone } = req.params

            if (!phone || Array.isArray(phone)) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Phone is required' })
            }

            const data = await service.getByPhone(tenant.id, phone)
            res.json(data)
        } catch (error: any) {
            if (error instanceof CustomerValidationError) {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Get customer error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async update(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { id } = req.params
            if (!id || Array.isArray(id)) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Customer ID is required' })
            }

            const customer = await service.update(tenant.id, id, req.body)
            res.json(customer)
        } catch (error: any) {
            if (error instanceof CustomerValidationError) {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Update customer error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async getPoints(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { id } = req.params
            if (!id || Array.isArray(id)) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Customer ID is required' })
            }

            const customer = await prisma.customer.findUnique({
                where: { tenantId_id: { tenantId: tenant.id, id } },
                select: { id: true }
            })
            if (!customer) {
                return res.status(404).json({ statusCode: 404, statusMessage: 'Customer not found' })
            }

            const data = await loyalty.getCustomerPointsDetails(prisma, tenant.id, id)
            res.json(data)
        } catch (error: any) {
            if (error instanceof CustomerValidationError) {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Get customer points error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async delete(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { id } = req.params
            if (!id || Array.isArray(id)) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Customer ID is required' })
            }

            const result = await service.delete(tenant.id, id)
            res.json(result)
        } catch (error: any) {
            if (error instanceof CustomerValidationError) {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Delete customer error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }
}
