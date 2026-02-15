import type { Request, Response } from 'express'
import { CustomersService, CustomerValidationError } from './customers.service'

const service = new CustomersService()

export class CustomersController {
    async list(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { search } = req.query as { search?: string }

            const customers = await service.list(tenant.id, {
                search: typeof search === 'string' ? search : undefined
            })
            res.json(customers)
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
}
