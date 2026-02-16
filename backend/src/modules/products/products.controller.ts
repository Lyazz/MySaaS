import type { Request, Response } from 'express'
import { ProductsService } from './products.service'

const productsService = new ProductsService()

export class ProductsController {
    private parseBooleanQuery(value: unknown): boolean {
        if (typeof value !== 'string') return false
        const v = value.trim().toLowerCase()
        return v === '1' || v === 'true' || v === 'yes' || v === 'on'
    }

    async listProducts(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const categoryId = req.query.categoryId as string | undefined
            console.log(`[DEBUG] listProducts: Tenant=${tenant.name} (${tenant.id}) Category=${categoryId}`);

            // Debug count
            const count = await productsService.listProducts(tenant.id, categoryId)
            console.log(`[DEBUG] listProducts: Found ${count.length} products`);

            const products = await productsService.listProducts(tenant.id, categoryId, req.query.sortBy as string, req.query.sortOrder as any)
            res.json(products)
        } catch (error) {
            console.error('List products error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async createProduct(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const body = req.body

            if (!body.title || !body.slug) {
                return res.status(400).json({
                    statusCode: 400,
                    statusMessage: 'Title and Slug are required'
                })
            }

            try {
                const product = await productsService.createProduct(tenant.id, body)
                res.json(product)
            } catch (e: any) {
                if (e.message === 'Product with this slug already exists') {
                    return res.status(409).json({
                        statusCode: 409,
                        statusMessage: e.message
                    })
                }
                if (e.message === 'Invalid category') {
                    return res.status(400).json({ statusCode: 400, statusMessage: e.message })
                }
                if (e.message === 'Invalid images') {
                    return res.status(400).json({ statusCode: 400, statusMessage: e.message })
                }
                throw e
            }
        } catch (error) {
            console.error('Create product error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async getProduct(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const id = req.params.id as string
            const includeInactiveVariants = this.parseBooleanQuery(req.query.includeInactiveVariants)

            if (!id) return res.status(400).json({ statusCode: 400, statusMessage: 'ID required' })

            const product = await productsService.getProduct(tenant.id, id, { includeInactiveVariants })

            if (!product) {
                return res.status(404).json({ statusCode: 404, statusMessage: 'Product not found' })
            }

            res.json(product)
        } catch (error) {
            console.error('Get product error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async updateProduct(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const user = req.user
            const id = req.params.id as string
            const body = req.body

            if (!id) return res.status(400).json({ statusCode: 400, statusMessage: 'ID required' })

            try {
                const product = await productsService.updateProduct(tenant.id, id, body, { userId: user?.id ?? null })
                res.json(product)
            } catch (e: any) {
                if (typeof e?.statusCode === 'number') {
                    return res.status(e.statusCode).json({ statusCode: e.statusCode, statusMessage: e.statusMessage || e.message })
                }
                if (e.message === 'Product not found') {
                    return res.status(404).json({ statusCode: 404, statusMessage: e.message })
                }
                if (e.message === 'Invalid category') {
                    return res.status(400).json({ statusCode: 400, statusMessage: e.message })
                }
                if (e.message === 'Invalid images') {
                    return res.status(400).json({ statusCode: 400, statusMessage: e.message })
                }
                throw e
            }
        } catch (error) {
            console.error('Update product error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async deleteProduct(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const id = req.params.id as string

            if (!id) return res.status(400).json({ statusCode: 400, statusMessage: 'ID required' })

            try {
                await productsService.deleteProduct(tenant.id, id)
                res.json({ success: true })
            } catch (e: any) {
                if (e.message === 'Product not found') {
                    return res.status(404).json({ statusCode: 404, statusMessage: e.message })
                }
                throw e
            }
        } catch (error) {
            console.error('Delete product error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async createVariant(req: Request, res: Response) {
        // Legacy or update to use generateVariants or single creation?
        // We probably want "generateVariants" mainly.
        res.status(501).json({ message: 'Use generate endpoints' })
    }

    async createOption(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const productId = req.params.productId as string
            const body = req.body
            const option = await productsService.createOption(tenant.id, productId, body)
            res.json(option)
        } catch (error: any) {
            console.error('Create option error:', error)
            res.status(500).json({ statusCode: 500, message: error.message || 'Error' })
        }
    }

    async addOptionValue(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const optionId = req.params.optionId as string
            const body = req.body
            const value = await productsService.addOptionValue(tenant.id, optionId, body)
            res.json(value)
        } catch (error: any) {
            console.error('Add option value error:', error)
            res.status(500).json({ statusCode: 500, message: error.message || 'Error' })
        }
    }

    async deleteOptionValue(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const valueId = req.params.valueId as string
            await productsService.deleteOptionValue(tenant.id, valueId)
            res.json({ success: true })
        } catch (error: any) {
            console.error('Delete option value error:', error)
            res.status(500).json({ statusCode: 500, message: error.message })
        }
    }

    async updateOptionValue(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const valueId = req.params.valueId as string
            const body = req.body
            const value = await productsService.updateOptionValue(tenant.id, valueId, body)
            res.json(value)
        } catch (error: any) {
            console.error('Update option value error:', error)
            res.status(500).json({ statusCode: 500, message: error.message })
        }
    }

    async updateOption(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const optionId = req.params.optionId as string
            const body = req.body
            const option = await productsService.updateOption(tenant.id, optionId, body)
            res.json(option)
        } catch (error: any) {
            console.error('Update option error:', error)
            res.status(500).json({ statusCode: 500, message: error.message })
        }
    }

    async deleteOption(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const optionId = req.params.optionId as string
            await productsService.deleteOption(tenant.id, optionId)
            res.json({ success: true })
        } catch (error: any) {
            console.error('Delete option error:', error)
            res.status(500).json({ statusCode: 500, message: error.message })
        }
    }

    async generateVariants(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const productId = req.params.productId as string
            const variants = await productsService.generateVariants(tenant.id, productId)
            res.json(variants)
        } catch (error: any) {
            console.error('Generate variants error:', error)
            res.status(500).json({ statusCode: 500, message: error.message })
        }
    }
}
