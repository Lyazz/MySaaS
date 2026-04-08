import prisma from '../../lib/prisma'

const extractMetaPixelIds = (metaPixels: any[]): string[] => {
    return (metaPixels || [])
        .filter((mp: any) => mp?.metaPixel?.isActive)
        .map((mp: any) => mp?.metaPixel?.pixelId)
        .filter((id: any) => typeof id === 'string' && /^[0-9]+$/.test(id))
}

const coalesceImages = (legacyImages: any, productImages: any[]): string[] => {
    const legacy = Array.isArray(legacyImages) ? legacyImages.filter((v) => typeof v === 'string' && v.length > 0) : []
    if (legacy.length > 0) return legacy
    return (productImages || [])
        .map((pi: any) => pi?.url)
        .filter((v: any) => typeof v === 'string' && v.length > 0)
}

export class PublicProductsService {
    async listProducts(tenantId: string, search?: string) {
        const now = new Date()

        const where: any = { tenantId, isActive: true }
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ]
        }

        const products = await prisma.product.findMany({
            where,
            include: {
                category: true,
                productImages: { orderBy: [{ isMain: 'desc' }, { position: 'asc' }] },
                metaPixels: {
                    include: { metaPixel: { select: { pixelId: true, isActive: true } } }
                },
                bundleDeals: {
                    where: {
                        isActive: true,
                        AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }]
                    },
                    orderBy: { bundleQty: 'asc' },
                    select: { id: true, bundleQty: true, bundlePrice: true, tag: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return products.map(({ metaPixels, productImages, images, ...rest }: any) => ({
            ...rest,
            productImages,
            images: coalesceImages(images, productImages),
            metaPixelIds: extractMetaPixelIds(metaPixels)
        }))
    }

    async getProductBySlug(tenantId: string, slug: string) {
        const now = new Date()
        const product = await prisma.product.findUnique({
            where: { tenantId_slug: { tenantId, slug } },
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
                        optionValues: { include: { optionValue: true } },
                        images: { include: { image: true }, orderBy: { position: 'asc' } }
                    },
                    orderBy: { createdAt: 'asc' }
                },
                productImages: { orderBy: [{ isMain: 'desc' }, { position: 'asc' }] },
                bundleDeals: {
                    where: {
                        isActive: true,
                        AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }]
                    },
                    orderBy: { bundleQty: 'asc' },
                    select: { id: true, bundleQty: true, bundlePrice: true, tag: true }
                }
            }
        })

        if (!product) return null

        const { metaPixels, productImages, images, ...rest }: any = product
        return {
            ...rest,
            productImages,
            images: coalesceImages(images, productImages),
            metaPixelIds: extractMetaPixelIds(metaPixels)
        }
    }
}

