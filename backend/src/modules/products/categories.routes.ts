import { Router } from 'express'
import prisma from '../../lib/prisma'
import { requireTenantAdmin } from '../../middleware/rbac.middleware'

const router = Router()

router.use(requireTenantAdmin)

// GET /categories
router.get('/', async (req, res) => {
    const tenant = req.tenant!

    try {
        const categories = await prisma.category.findMany({
            where: {
                tenantId: tenant.id
            },
            orderBy: {
                createdAt: 'desc'
            }
        })
        res.json(categories)
    } catch (error) {
        console.error('List categories error:', error)
        res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
    }
})

// POST /categories
router.post('/', async (req, res) => {
    const tenant = req.tenant!
    const body = req.body

    if (!body.title || !body.slug) {
        return res.status(400).json({
            statusCode: 400,
            statusMessage: 'Title and Slug are required'
        })
    }

    try {
        // Check if slug exists in this tenant
        const existing = await prisma.category.findUnique({
            where: {
                tenantId_slug: {
                    tenantId: tenant.id,
                    slug: body.slug
                }
            }
        })

        if (existing) {
            return res.status(409).json({
                statusCode: 409,
                statusMessage: 'Category with this slug already exists'
            })
        }

        const category = await prisma.category.create({
            data: {
                tenantId: tenant.id,
                title: body.title,
                slug: body.slug,
            }
        })

        res.json(category)
    } catch (error) {
        console.error('Create category error:', error)
        res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
    }
})

// update, delete...
router.delete('/:id', async (req, res) => {
    const tenant = req.tenant!
    const { id } = req.params

    if (!id) return res.status(400).json({ statusCode: 400, statusMessage: 'ID required' })

    try {
        const existing = await prisma.category.findUnique({ where: { id } })
        if (!existing || existing.tenantId !== tenant.id) {
            return res.status(404).json({ statusCode: 404, statusMessage: 'Category not found' })
        }

        await prisma.category.delete({ where: { id } })
        res.json({ success: true })
    } catch (error) {
        console.error('Delete category error:', error)
        res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
    }
})

router.put('/:id', async (req, res) => {
    const tenant = req.tenant!
    const { id } = req.params
    const body = req.body

    if (!id) return res.status(400).json({ statusCode: 400, statusMessage: 'ID required' })

    try {
        const existing = await prisma.category.findUnique({ where: { id } })
        if (!existing || existing.tenantId !== tenant.id) {
            return res.status(404).json({ statusCode: 404, statusMessage: 'Category not found' })
        }

        const category = await prisma.category.update({
            where: { id },
            data: {
                title: body.title,
                slug: body.slug,
            }
        })
        res.json(category)
    } catch (error) {
        console.error('Update category error:', error)
        res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
    }
})

export default router
