import type { Request, Response } from 'express'
import { ProductsService } from './products.service'

const productsService = new ProductsService()

export class ProductsController {
    async listProducts(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const categoryId = req.query.categoryId as string | undefined
            const products = await productsService.listProducts(tenant.id, categoryId)
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

            if (!id) return res.status(400).json({ statusCode: 400, statusMessage: 'ID required' })

            const product = await productsService.getProduct(tenant.id, id)

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
            const id = req.params.id as string
            const body = req.body

            if (!id) return res.status(400).json({ statusCode: 400, statusMessage: 'ID required' })

            try {
                const product = await productsService.updateProduct(tenant.id, id, body)
                res.json(product)
            } catch (e: any) {
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
        try {
            const tenant = req.tenant!
            const productId = req.params.productId as string
            const body = req.body

            try {
                const variant = await productsService.createVariant(tenant.id, productId, body)
                res.json(variant)
            } catch (e: any) {
                if (e.message === 'Product not found') {
                    return res.status(404).json({ statusCode: 404, statusMessage: e.message })
                }
                throw e
            }
        } catch (error) {
            console.error('Create variant error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }
}
