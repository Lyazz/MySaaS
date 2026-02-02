import type { Request, Response } from 'express'
import { CustomersService } from './customers.service'

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
        } catch (error) {
            console.error('List customers error:', error)
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
        } catch (error) {
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
        } catch (error) {
            console.error('Get customer error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }
}
