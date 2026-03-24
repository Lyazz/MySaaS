import type { Request, Response } from 'express'
import { CategoriesService } from './categories.service'

const categoriesService = new CategoriesService()

export class CategoriesController {
    async listCategories(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const sortBy = req.query.sortBy as string | undefined
            const sortOrder = req.query.sortOrder as 'asc' | 'desc' | undefined
            const categories = await categoriesService.listAdmin(tenant.id, sortBy, sortOrder)
            res.json(categories)
        } catch (error) {
            console.error('List categories error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async createCategory(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const body = req.body

            try {
                const category = await categoriesService.createCategory(tenant.id, body)
                res.json(category)
            } catch (e: any) {
                if (e.message === 'Title and Slug are required') {
                    return res.status(400).json({ statusCode: 400, statusMessage: e.message })
                }
                if (e.message === 'Category with this slug already exists') {
                    return res.status(409).json({ statusCode: 409, statusMessage: e.message })
                }
                if (e.message === 'Invalid image' || e.message === 'Invalid image type') {
                    return res.status(400).json({
                        statusCode: 400,
                        statusMessage: 'Category image must be a PNG (http/https or /uploads path)'
                    })
                }
                throw e
            }
        } catch (error) {
            console.error('Create category error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async updateCategory(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const categoryId = req.params.id
            const body = req.body

            if (!categoryId) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'ID required' })
            }

            try {
                const category = await categoriesService.updateCategory(tenant.id, categoryId, body)
                res.json(category)
            } catch (e: any) {
                if (e.message === 'Category not found') {
                    return res.status(404).json({ statusCode: 404, statusMessage: e.message })
                }
                if (e.message === 'Category with this slug already exists') {
                    return res.status(409).json({ statusCode: 409, statusMessage: e.message })
                }
                if (e.message === 'Invalid image' || e.message === 'Invalid image type') {
                    return res.status(400).json({
                        statusCode: 400,
                        statusMessage: 'Category image must be a PNG (http/https or /uploads path)'
                    })
                }
                throw e
            }
        } catch (error) {
            console.error('Update category error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async getCategory(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const categoryId = req.params.id

            if (!categoryId) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'ID required' })
            }

            const category = await categoriesService.getCategory(tenant.id, categoryId)
            if (!category) {
                return res.status(404).json({ statusCode: 404, statusMessage: 'Category not found' })
            }

            res.json(category)
        } catch (error) {
            console.error('Get category error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async deleteCategory(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const categoryId = req.params.id

            if (!categoryId) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'ID required' })
            }

            try {
                await categoriesService.deleteCategory(tenant.id, categoryId)
                res.json({ success: true })
            } catch (e: any) {
                if (e.message === 'Category not found') {
                    return res.status(404).json({ statusCode: 404, statusMessage: e.message })
                }
                if (e.statusCode === 409 || e.message === 'HAS_PRODUCTS') {
                    return res.status(409).json({ statusCode: 409, statusMessage: 'HAS_PRODUCTS' })
                }
                throw e
            }
        } catch (error) {
            console.error('Delete category error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async listPublicCategories(req: Request, res: Response) {
        const tenant = req.tenant

        if (!tenant) {
            return res.status(404).json({ statusCode: 404, statusMessage: 'Tenant not found' })
        }

        try {
            const categories = await categoriesService.listPublic(tenant.id)
            res.json(categories)
        } catch (error) {
            console.error('Public categories list error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }
}
