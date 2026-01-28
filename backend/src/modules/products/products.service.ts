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
    async listProducts(
        tenantId: string,
        categoryId?: string,
        sortBy?: string,
        sortOrder?: 'asc' | 'desc'
    ) {
        const where: any = {
            tenantId: tenantId
        }
        if (categoryId) {
            where.categoryId = categoryId
        }

        const sortableFields: Record<string, boolean> = {
            createdAt: true,
            title: true,
            price: true,
            stock: true,
            isActive: true
        }

        const orderBy = (() => {
            if (sortBy && sortableFields[sortBy]) {
                return {
                    [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc'
                }
            }

            return { createdAt: 'desc' as const }
        })()

        return await prisma.product.findMany({
            where,
            include: {
                category: true,
                options: {
                    include: { values: true },
                    orderBy: { position: 'asc' }
                },
                variants: {
                    where: { isActive: true },
                    take: 1 // Just to see if there are variants
                }
            },
            orderBy
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
                options: {
                    include: { values: { orderBy: { position: 'asc' } } },
                    orderBy: { position: 'asc' }
                },
                variants: {
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
                }
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

    // --- Options Management ---

    async createOption(tenantId: string, productId: string, data: any) {
        const product = await this.getProduct(tenantId, productId)
        if (!product) throw new Error('Product not found')

        const option = await prisma.productOption.create({
            data: {
                productId,
                name: data.name,
                position: data.position || 0,
                displayType: data.displayType || 'dropdown',
                values: {
                    create: (data.values || []).map((v: any, idx: number) => ({
                        label: v.label,
                        position: v.position || idx,
                        meta: v.meta ? JSON.stringify(v.meta) : null
                    }))
                }
            },
            include: { values: true }
        })

        // Keep variants in sync with new options/values
        await this.syncVariants(tenantId, productId)
        return option
    }

    async updateOption(tenantId: string, optionId: string, data: any) {
        // Verify ownership via option -> product -> tenant
        const option = await prisma.productOption.findFirst({
            where: { id: optionId, product: { tenantId } }
        })
        if (!option) throw new Error('Option not found')

        return await prisma.productOption.update({
            where: { id: optionId },
            data: {
                name: data.name,
                position: data.position,
                displayType: data.displayType
            }
        })
    }

    async deleteOption(tenantId: string, optionId: string) {
        const option = await prisma.productOption.findFirst({
            where: { id: optionId, product: { tenantId } }
        })
        if (!option) throw new Error('Option not found')

        // Deleting option will cascade delete values and variants that depend on it
        await prisma.productOption.delete({ where: { id: optionId } })
        await this.syncVariants(tenantId, option.productId)
        return true
    }

    async addOptionValue(tenantId: string, optionId: string, data: any) {
        const option = await prisma.productOption.findFirst({
            where: { id: optionId, product: { tenantId } }
        })
        if (!option) throw new Error('Option not found')

        const value = await prisma.productOptionValue.create({
            data: {
                optionId,
                label: data.label,
                position: data.position || 0,
                meta: data.meta ? JSON.stringify(data.meta) : null
            }
        })

        await this.syncVariants(tenantId, option.productId)
        return value
    }

    async deleteOptionValue(tenantId: string, valueId: string) {
        const value = await prisma.productOptionValue.findFirst({
            where: { id: valueId, option: { product: { tenantId } } },
            include: { option: true }
        })
        if (!value) throw new Error('Option Value not found')

        await prisma.productOptionValue.delete({ where: { id: valueId } })
        await this.syncVariants(tenantId, value.option.productId)
        return true
    }

    // --- Variant Generation / Sync ---

    private buildVariantSignature(optionValues: { optionValueId?: string; optionValue?: any }[]) {
        // Normalize to optionValueId array sorted for stable signature
        const ids = optionValues
            .map((ov) => ov.optionValueId || ov.optionValue?.id)
            .filter(Boolean)
            .sort()
        return ids.join('|')
    }

    /**
     * Sync variants to match the current option values:
     * - Create missing combinations
     * - Delete variants whose combinations no longer exist
     * - Avoid duplicates
     */
    async syncVariants(tenantId: string, productId: string) {
        const product = await this.getProduct(tenantId, productId)
        if (!product) throw new Error('Product not found')

        // If no options, remove all variants
        if (!product.options || product.options.length === 0) {
            await prisma.productVariant.deleteMany({ where: { productId, product: { tenantId } } })
            return []
        }

        const cartesian = (sets: any[]) => {
            return sets.reduce((acc, set) => {
                return acc.flatMap((x: any) => set.map((y: any) => [...x, y]))
            }, [[]])
        }

        const valueSets = product.options.map((opt) => opt.values)
        const combinations = cartesian(valueSets)

        // Map existing variants by signature
        const existingVariants = product.variants || []
        const existingBySignature = new Map(
            existingVariants.map((v) => [this.buildVariantSignature(v.optionValues || []), v])
        )

        // Determine target signatures
        const targetSignatures = new Set(
            combinations.map((combo) => this.buildVariantSignature(combo.map((val: any) => ({ optionValueId: val.id }))))
        )

        // Variants to delete: signatures not in target
        const toDelete = existingVariants.filter(
            (v) => !targetSignatures.has(this.buildVariantSignature(v.optionValues || []))
        )

        // Signatures to create: target not already existing
        const toCreate = Array.from(targetSignatures).filter((sig) => !existingBySignature.has(sig))

        await prisma.$transaction([
            // Delete obsolete variants (cascade removes option value joins & images via FK)
            prisma.productVariant.deleteMany({
                where: {
                    id: { in: toDelete.map((v) => v.id) },
                    product: { tenantId }
                }
            }),
            // Create missing variants
            ...toCreate.map((sig) => {
                const valueIds = sig.split('|').filter(Boolean)
                return prisma.productVariant.create({
                    data: {
                        productId,
                        price: product.price,
                        stock: 0,
                        isActive: true,
                        optionValues: {
                            create: valueIds.map((optionValueId) => ({ optionValueId }))
                        }
                    }
                })
            })
        ])

        // Return refreshed variants with relations
        return prisma.productVariant.findMany({
            where: { productId, product: { tenantId } },
            include: {
                optionValues: { include: { optionValue: true } },
                images: { include: { image: true }, orderBy: { position: 'asc' } }
            },
            orderBy: { createdAt: 'asc' }
        })
    }

    async generateVariants(tenantId: string, productId: string) {
        // Backward-compatible route: now idempotent sync
        return this.syncVariants(tenantId, productId)
    }
}
