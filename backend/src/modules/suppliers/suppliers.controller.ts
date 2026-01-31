import type { Request, Response } from 'express'
import { SuppliersService, SupplierValidationError } from './suppliers.service'

const service = new SuppliersService()

export class SuppliersController {
    async list(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            res.json(await service.list(tenant.id))
        } catch (error) {
            console.error('List suppliers error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async create(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const supplier = await service.create(tenant.id, req.body)
            res.status(201).json(supplier)
        } catch (error: any) {
            if (error instanceof SupplierValidationError) {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Create supplier error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async getById(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { id } = req.params
            if (!id || Array.isArray(id)) return res.status(400).json({ statusCode: 400, statusMessage: 'ID required' })

            const supplier = await service.getById(tenant.id, id)
            if (!supplier) return res.status(404).json({ statusCode: 404, statusMessage: 'Supplier not found' })
            res.json(supplier)
        } catch (error) {
            console.error('Get supplier error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async update(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { id } = req.params
            if (!id || Array.isArray(id)) return res.status(400).json({ statusCode: 400, statusMessage: 'ID required' })

            const supplier = await service.update(tenant.id, id, req.body)
            res.json(supplier)
        } catch (error: any) {
            if (error instanceof SupplierValidationError) {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Update supplier error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async delete(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { id } = req.params
            if (!id || Array.isArray(id)) return res.status(400).json({ statusCode: 400, statusMessage: 'ID required' })

            const result = await service.delete(tenant.id, id)
            res.json(result)
        } catch (error: any) {
            if (error instanceof SupplierValidationError) {
                return res.status(error.statusCode).json({ statusCode: error.statusCode, statusMessage: error.statusMessage })
            }
            console.error('Delete supplier error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }
}

