import prisma from '../../lib/prisma'

const normalizeImages = (images: unknown): string[] | undefined => {
    if (images === undefined) return undefined
    if (!Array.isArray(images)) throw new Error('Invalid images')

    const normalized = images
        .filter((v) => typeof v === 'string')
        .map((v) => v.trim())
        .filter((v) => v.length > 0)
        .slice(0, 10)

    if (normalized.length !== images.length) throw new Error('Invalid images')
    return normalized
}

export class ProductsService {
    async listProducts(tenantId: string, categoryId?: string) {
        const where: any = {
            tenantId: tenantId
        }
        if (categoryId) {
            where.categoryId = categoryId
        }

        return await prisma.product.findMany({
            where,
            include: {
                category: true,
                variants: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        })
    }

    async createProduct(tenantId: string, data: any) {
        // Check slug uniqueness within tenant
        const existing = await prisma.product.findUnique({
            where: {
                tenantId_slug: {
                    tenantId: tenantId,
                    slug: data.slug
                }
            }
        })

        if (existing) {
            throw new Error('Product with this slug already exists')
        }

        // Validate categoryId ownership if provided
        if (data.categoryId) {
            const category = await prisma.category.findFirst({
                where: { id: data.categoryId, tenantId }
            })
            if (!category) {
                throw new Error('Invalid category')
            }
        }

        const images = normalizeImages(data.images)

        return await prisma.product.create({
            data: {
                tenantId: tenantId,
                title: data.title,
                slug: data.slug,
                description: data.description,
                miniDescription: data.miniDescription,
                price: data.price || 0,
                stock: data.stock || 0,
                isActive: data.isActive ?? true,
                categoryId: data.categoryId,
                images: images ?? []
            }
        })
    }

    async getProduct(tenantId: string, productId: string) {
        const product = await prisma.product.findFirst({
            where: { id: productId, tenantId },
            include: {
                category: true,
                variants: true
            }
        })

        return product
    }

    async updateProduct(tenantId: string, productId: string, data: any) {
        // Verify ownership
        const existing = await this.getProduct(tenantId, productId)

        if (!existing) {
            throw new Error('Product not found')
        }

        if (data.categoryId) {
            const category = await prisma.category.findFirst({
                where: { id: data.categoryId, tenantId }
            })
            if (!category) {
                throw new Error('Invalid category')
            }
        }

        const images = normalizeImages(data.images)

        const updateResult = await prisma.product.updateMany({
            where: { id: productId, tenantId },
            data: {
                title: data.title,
                slug: data.slug,
                description: data.description,
                miniDescription: data.miniDescription,
                price: data.price !== undefined ? String(data.price) : undefined,
                stock: data.stock !== undefined ? Number(data.stock) : undefined,
                isActive: typeof data.isActive === 'boolean' ? data.isActive : undefined,
                categoryId: data.categoryId,
                images: images
            }
        })

        if (updateResult.count === 0) throw new Error('Product not found')
        return await this.getProduct(tenantId, productId)
    }

    async deleteProduct(tenantId: string, productId: string) {
        // Verify ownership
        const existing = await this.getProduct(tenantId, productId)

        if (!existing) {
            throw new Error('Product not found')
        }

        await prisma.product.deleteMany({
            where: { id: productId, tenantId }
        })

        return true
    }

    async createVariant(tenantId: string, productId: string, data: any) {
        // Verify product ownership
        const product = await this.getProduct(tenantId, productId)

        if (!product) {
            throw new Error('Product not found')
        }

        return await prisma.variant.create({
            data: {
                productId,
                sku: data.sku,
                optionName: data.optionName,
                optionValue: data.optionValue,
                priceDelta: data.priceDelta || 0,
                stock: data.stock || 0,
            }
        })
    }
}
