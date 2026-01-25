import { Router } from 'express'
import prisma from '../../lib/prisma'
import { requireTenantAdmin } from '../../middleware/rbac.middleware'

const router = Router()

router.use(requireTenantAdmin)

// PUT /variants/:id
router.put('/:id', async (req, res) => {
    const tenant = req.tenant!
    const { id } = req.params
    const body = req.body

    if (!id) return res.status(400).json({ statusCode: 400, statusMessage: 'ID required' })

    try {
        const variant = await prisma.variant.findUnique({
            where: { id },
            include: { product: true }
        })

        if (!variant || variant.product.tenantId !== tenant.id) {
            return res.status(404).json({ statusCode: 404, statusMessage: 'Variant not found' })
        }

        const updated = await prisma.variant.update({
            where: { id },
            data: {
                sku: body.sku,
                optionName: body.optionName,
                optionValue: body.optionValue,
                priceDelta: body.priceDelta,
                stock: body.stock
            }
        })

        res.json(updated)
    } catch (error) {
        console.error('Update variant error:', error)
        res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
    }
})

// DELETE /variants/:id
router.delete('/:id', async (req, res) => {
    const tenant = req.tenant!
    const { id } = req.params

    if (!id) return res.status(400).json({ statusCode: 400, statusMessage: 'ID required' })

    try {
        const variant = await prisma.variant.findUnique({
            where: { id },
            include: { product: true }
        })

        if (!variant || variant.product.tenantId !== tenant.id) {
            return res.status(404).json({ statusCode: 404, statusMessage: 'Variant not found' })
        }

        await prisma.variant.delete({ where: { id } })

        res.json({ success: true })
    } catch (error) {
        console.error('Delete variant error:', error)
        res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
    }
})

export default router
