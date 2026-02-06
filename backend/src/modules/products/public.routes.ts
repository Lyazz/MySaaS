import { Router } from 'express'
import prisma from '../../lib/prisma'

const router = Router()

// GET /products - Public product listing (active products only)
router.get('/', async (req, res) => {
    const tenant = req.tenant

    if (!tenant) {
        return res.status(404).json({ statusCode: 404, statusMessage: 'Tenant not found' })
    }

    try {
        const now = new Date()
        const products = await prisma.product.findMany({
            where: {
                tenantId: tenant.id,
                isActive: true
            },
            include: {
                category: true,
                metaPixels: {
                    include: { metaPixel: { select: { pixelId: true, isActive: true } } }
                },
                bundleDeals: {
                    where: {
                        isActive: true,
                        AND: [
                            { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
                            { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }
                        ]
                    },
                    orderBy: { bundleQty: 'asc' },
                    select: { id: true, bundleQty: true, bundlePrice: true, tag: true }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        const payload = products.map(({ metaPixels, ...p }: any) => ({
            ...p,
            metaPixelIds: (metaPixels || [])
                .filter((mp: any) => mp?.metaPixel?.isActive)
                .map((mp: any) => mp?.metaPixel?.pixelId)
                .filter((id: any) => typeof id === 'string' && /^[0-9]+$/.test(id))
        }))

        res.json(payload)
    } catch (error) {
        console.error('Public products list error:', error)
        res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
    }
})

// GET /products/:slug - Public product detail
router.get('/:slug', async (req, res) => {
    const tenant = req.tenant
    const { slug } = req.params

    if (!tenant) {
        return res.status(404).json({ statusCode: 404, statusMessage: 'Tenant not found' })
    }

    try {
        const now = new Date()
        const product = await prisma.product.findUnique({
            where: {
                tenantId_slug: {
                    tenantId: tenant.id,
                    slug
                }
            },
            include: {
                category: true,
                metaPixels: {
                    include: { metaPixel: { select: { pixelId: true, isActive: true } } }
                },
                options: {
                    include: { values: { orderBy: { position: 'asc' } } },
                    orderBy: { position: 'asc' }
                },
                variants: {
                    where: { isActive: true },
                    include: {
                        optionValues: {
                            include: { optionValue: true }
                        },
                        images: {
                            include: { image: true },
                            orderBy: { position: 'asc' }
                        }
                    },
                    orderBy: {
                        createdAt: 'asc'
                    }
                },
                productImages: {
                    orderBy: { position: 'asc' }
                },
                bundleDeals: {
                    where: {
                        isActive: true,
                        AND: [
                            { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
                            { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }
                        ]
                    },
                    orderBy: { bundleQty: 'asc' },
                    select: { id: true, bundleQty: true, bundlePrice: true, tag: true }
                }
            }
        })

        if (!product) {
            return res.status(404).json({ statusCode: 404, statusMessage: 'Product not found' })
        }

        const { metaPixels, ...rest }: any = product as any
        res.json({
            ...rest,
            metaPixelIds: (metaPixels || [])
                .filter((mp: any) => mp?.metaPixel?.isActive)
                .map((mp: any) => mp?.metaPixel?.pixelId)
                .filter((id: any) => typeof id === 'string' && /^[0-9]+$/.test(id))
        })
    } catch (error) {
        console.error('Public product detail error:', error)
        res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
    }
})

export default router
