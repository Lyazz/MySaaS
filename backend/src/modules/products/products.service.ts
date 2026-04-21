import prisma from '../../lib/prisma'
import { InventoryService } from '../inventory/inventory.service'
import { syncProductStockForProducts } from '../inventory/product-stock.service'
import { suggestSkuFromProduct } from '../../lib/variant-identifiers'
import { deletePublicAssetIfOwned } from '../../lib/public-assets'
import { sanitizeOptionalRichText } from '../../lib/rich-text'

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
    private inventory = new InventoryService()

    private isDefaultVariant(variant: any): boolean {
        return !variant?.optionValues || variant.optionValues.length === 0
    }

    private async ensureUniqueSku(tx: Pick<typeof prisma, 'productVariant'>, tenantId: string, skuCandidate: string) {
        const base = skuCandidate.slice(0, 32)
        for (let i = 0; i < 50; i++) {
            const suffix = i === 0 ? '' : `-${i + 1}`
            const sku = (base.slice(0, 32 - suffix.length) + suffix).slice(0, 32)

            const exists = await tx.productVariant.findFirst({
                where: { tenantId, sku },
                select: { id: true }
            })
            if (!exists) return sku
        }

        // Fallback to a time-based suffix (still safe under tenant unique index in practice)
        return (base.slice(0, 32 - 6) + '-' + String(Date.now()).slice(-5)).slice(0, 32)
    }

    private async ensureDefaultVariant(tenantId: string, product: { id: string; slug: string; price: any; stock: number }) {
        const existing = await prisma.productVariant.findFirst({
            where: { tenantId, productId: product.id, optionValues: { none: {} } }
        })

        if (existing) return existing

        const sku = await this.ensureUniqueSku(prisma, tenantId, suggestSkuFromProduct(product.slug, ''))
        return prisma.productVariant.create({
            data: {
                tenantId,
                productId: product.id,
                sku,
                price: product.price,
                stock: product.stock ?? 0,
                isActive: true,
                trackInventory: true,
                reserved: 0,
                safetyStock: 0
            }
        })
    }

    private hasOwn(data: any, key: string): boolean {
        return Object.prototype.hasOwnProperty.call(data ?? {}, key)
    }

    private normalizeCategoryIds(raw: unknown): string[] {
        if (!Array.isArray(raw)) {
            throw new Error('Invalid categories')
        }

        const normalized = raw
            .map((value) => (typeof value === 'string' ? value.trim() : ''))
            .filter(Boolean)

        if (normalized.length !== raw.length) {
            throw new Error('Invalid categories')
        }

        return Array.from(new Set(normalized))
    }

    private async resolveCategoryAssignment(tenantId: string, data: any): Promise<{ categoryId: string | null; categoryIds: string[] } | null> {
        const hasCategoryId = this.hasOwn(data, 'categoryId')
        const hasCategoryIds = this.hasOwn(data, 'categoryIds')
        if (!hasCategoryId && !hasCategoryIds) return null

        let explicitCategoryId: string | null | undefined
        if (hasCategoryId) {
            const raw = data.categoryId
            if (raw === null || raw === '') {
                explicitCategoryId = null
            } else if (typeof raw === 'string') {
                explicitCategoryId = raw.trim()
                if (!explicitCategoryId) explicitCategoryId = null
            } else {
                throw new Error('Invalid category')
            }
        }

        let categoryIds: string[] = []
        if (hasCategoryIds) {
            categoryIds = this.normalizeCategoryIds(data.categoryIds)
        } else if (explicitCategoryId) {
            categoryIds = [explicitCategoryId]
        }

        if (explicitCategoryId) {
            categoryIds = [explicitCategoryId, ...categoryIds.filter((id) => id !== explicitCategoryId)]
        }

        if (categoryIds.length > 0) {
            const found = await prisma.category.findMany({
                where: { tenantId, id: { in: categoryIds } },
                select: { id: true }
            })
            const foundSet = new Set(found.map((item) => item.id))
            if (categoryIds.some((id) => !foundSet.has(id))) {
                throw new Error('Invalid category')
            }
        }

        const categoryId =
            explicitCategoryId !== undefined
                ? explicitCategoryId ?? (categoryIds[0] ?? null)
                : (categoryIds[0] ?? null)

        return { categoryId, categoryIds }
    }

    private async replaceProductCategories(
        tx: Pick<typeof prisma, 'productCategory'>,
        tenantId: string,
        productId: string,
        categoryIds: string[]
    ) {
        await tx.productCategory.deleteMany({
            where: { tenantId, productId }
        })

        if (categoryIds.length > 0) {
            await tx.productCategory.createMany({
                data: categoryIds.map((categoryId) => ({
                    tenantId,
                    productId,
                    categoryId
                })),
                skipDuplicates: true
            })
        }
    }

    private mapProductCategories(product: any): any {
        const linkedCategories = (product?.categoryLinks || [])
            .map((link: any) => link?.category)
            .filter((category: any) => category && category.id)
        let uniqueCategories = Array.from(
            new Map(linkedCategories.map((category: any) => [category.id, category])).values()
        )
        const fallbackPrimary = uniqueCategories[0] ?? null
        const primaryCategory = (product as any)?.category ?? fallbackPrimary
        const primaryCategoryId = (product as any)?.categoryId ?? primaryCategory?.id ?? null
        if (primaryCategory && !uniqueCategories.some((category: any) => category.id === primaryCategory.id)) {
            uniqueCategories = [primaryCategory, ...uniqueCategories]
        }
        const categoryIds = uniqueCategories.map((category: any) => category.id)
        if (categoryIds.length === 0 && primaryCategoryId) {
            categoryIds.push(primaryCategoryId)
        }

        return {
            ...product,
            category: primaryCategory,
            categoryId: primaryCategoryId,
            categories: uniqueCategories,
            categoryIds
        }
    }

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
            where.OR = [
                { categoryId },
                { categoryLinks: { some: { tenantId, categoryId } } }
            ]
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

        const products = await prisma.product.findMany({
            where,
            include: {
                category: true,
                categoryLinks: {
                    where: { tenantId },
                    include: {
                        category: true
                    }
                },
                options: {
                    include: { values: true },
                    orderBy: { position: 'asc' }
                },
                variants: {
                    where: { isActive: true },
                    take: 1 // Just to see if there are variants
                },
                productImages: {
                    orderBy: [{ isMain: 'desc' }, { position: 'asc' }],
                    take: 1 // Only the main image needed for the list view
                }
            },
            orderBy
        })

        return products.map((product) => this.mapProductCategories(product))
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

        const categoryAssignment = await this.resolveCategoryAssignment(tenantId, data)

        const images = normalizeImages(data.images)

        const sanitizedDescription = sanitizeOptionalRichText(data.description)
        const sanitizedMiniDescription = sanitizeOptionalRichText(data.miniDescription)

        const created = await prisma.$transaction(async (tx) => {
            const product = await tx.product.create({
                data: {
                    tenantId: tenantId,
                    title: data.title,
                    slug: data.slug,
                    description: sanitizedDescription,
                    miniDescription: sanitizedMiniDescription,
                    price: data.price || 0,
                    stock: data.stock || 0,
                    lowStockThreshold: data.lowStockThreshold !== undefined ? Number(data.lowStockThreshold) : 5,
                    isActive: data.isActive ?? true,
                    categoryId: categoryAssignment?.categoryId ?? null,
                    images: images ?? [],
                    promotionalPrice: data.promotionalPrice !== undefined && data.promotionalPrice !== null ? String(data.promotionalPrice) : null,
                    isPromotionActive: data.isPromotionActive ?? false,
                    promotionStartDate: data.promotionStartDate ? new Date(data.promotionStartDate) : null,
                    promotionEndDate: data.promotionEndDate ? new Date(data.promotionEndDate) : null,
                    showCountdown: data.showCountdown ?? false
                }
            })

            // Always create a "default" variant for products without options (stock source of truth).
            const sku = await this.ensureUniqueSku(tx, tenantId, suggestSkuFromProduct(product.slug, ''))
            await tx.productVariant.create({
                data: {
                    tenantId,
                    productId: product.id,
                    sku,
                    price: product.price,
                    stock: product.stock,
                    isActive: true,
                    trackInventory: true,
                    reserved: 0,
                    safetyStock: 0
                }
            })

            if (categoryAssignment) {
                await this.replaceProductCategories(tx, tenantId, product.id, categoryAssignment.categoryIds)
            }

            return product
        })

        return await this.getProduct(tenantId, created.id) || created
    }

    async getProduct(tenantId: string, productId: string, opts?: { includeInactiveVariants?: boolean }) {
        const includeInactiveVariants = opts?.includeInactiveVariants === true
        const product = await prisma.product.findFirst({
            where: { id: productId, tenantId },
            include: {
                category: true,
                categoryLinks: {
                    where: { tenantId },
                    include: { category: true }
                },
                options: {
                    include: { values: { orderBy: { position: 'asc' } } },
                    orderBy: { position: 'asc' }
                },
                variants: includeInactiveVariants
                    ? {
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
                    }
                    : {
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
                    orderBy: { bundleQty: 'asc' }
                }
            }
        })

        if (product && (!product.options || product.options.length === 0) && (!product.variants || product.variants.length === 0)) {
            await this.ensureDefaultVariant(tenantId, {
                id: product.id,
                slug: product.slug,
                price: product.price,
                stock: product.stock
            })
            const refreshed = await prisma.product.findFirst({
                where: { id: productId, tenantId },
                include: {
                    category: true,
                    categoryLinks: {
                        where: { tenantId },
                        include: { category: true }
                    },
                    options: {
                        include: { values: { orderBy: { position: 'asc' } } },
                        orderBy: { position: 'asc' }
                    },
                    variants: includeInactiveVariants
                        ? {
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
                        }
                        : {
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
                        orderBy: { bundleQty: 'asc' }
                    }
                }
            })
            return refreshed ? this.mapProductCategories(refreshed) : null
        }

        return product ? this.mapProductCategories(product) : null
    }

    async updateProduct(tenantId: string, productId: string, data: any, actor?: { userId?: string | null }) {
        // Verify ownership
        const existing = await this.getProduct(tenantId, productId)

        if (!existing) {
            throw new Error('Product not found')
        }

        if (data?.stock !== undefined) {
            const err = new Error('Stock is system-managed and cannot be edited') as any
            err.statusCode = 403
            err.statusMessage = 'Stock is system-managed and cannot be edited'
            throw err
        }

        const categoryAssignment = await this.resolveCategoryAssignment(tenantId, data)

        const images = normalizeImages(data.images)
        const sanitizedDescription = this.hasOwn(data, 'description') ? sanitizeOptionalRichText(data.description) : undefined
        const sanitizedMiniDescription = this.hasOwn(data, 'miniDescription')
            ? sanitizeOptionalRichText(data.miniDescription)
            : undefined

        const updateResult = await prisma.$transaction(async (tx) => {
            const result = await tx.product.updateMany({
                where: { id: productId, tenantId },
                data: {
                    title: data.title,
                    slug: data.slug,
                    description: sanitizedDescription,
                    miniDescription: sanitizedMiniDescription,
                    price: data.price !== undefined ? String(data.price) : undefined,
                    isActive: typeof data.isActive === 'boolean' ? data.isActive : undefined,
                    categoryId: categoryAssignment ? categoryAssignment.categoryId : undefined,
                    images: images,
                    lowStockThreshold: data.lowStockThreshold !== undefined ? Number(data.lowStockThreshold) : undefined,
                    promotionalPrice: data.promotionalPrice !== undefined ? (data.promotionalPrice !== null ? String(data.promotionalPrice) : null) : undefined,
                    isPromotionActive: typeof data.isPromotionActive === 'boolean' ? data.isPromotionActive : undefined,
                    promotionStartDate: data.promotionStartDate !== undefined ? (data.promotionStartDate ? new Date(data.promotionStartDate) : null) : undefined,
                    promotionEndDate: data.promotionEndDate !== undefined ? (data.promotionEndDate ? new Date(data.promotionEndDate) : null) : undefined,
                    showCountdown: typeof data.showCountdown === 'boolean' ? data.showCountdown : undefined
                }
            })

            if (categoryAssignment) {
                await this.replaceProductCategories(tx, tenantId, productId, categoryAssignment.categoryIds)
            }

            return result
        })

        if (updateResult.count === 0) throw new Error('Product not found')

        const refreshed = await this.getProduct(tenantId, productId)
        if (!refreshed) throw new Error('Product not found')

        // Keep default variant in sync for no-options products (bidirectional sync handled in InventoryService too).
        if (!refreshed.options || refreshed.options.length === 0) {
            const defaultVariant = (refreshed.variants || []).find((v: any) => this.isDefaultVariant(v))
            const ensured =
                defaultVariant ??
                (await this.ensureDefaultVariant(tenantId, {
                    id: refreshed.id,
                    slug: refreshed.slug,
                    price: refreshed.price,
                    stock: refreshed.stock
                }))

            if (data.price !== undefined) {
                await prisma.productVariant.updateMany({
                    where: { tenantId, id: ensured.id },
                    data: { price: data.price }
                })
            }
        }

        return await this.getProduct(tenantId, productId)
    }

    async deleteProduct(tenantId: string, productId: string) {
        // Verify ownership
        const existing = await this.getProduct(tenantId, productId, { includeInactiveVariants: true })

        if (!existing) {
            throw new Error('Product not found')
        }

        const urlsToMaybeDelete = Array.from(
            new Set(
                [
                    ...((existing.images as any[]) || []),
                    ...(((existing as any).productImages || []).map((img: any) => img?.url))
                ]
                    .filter((x) => typeof x === 'string')
                    .map((x) => x.trim())
                    .filter(Boolean)
            )
        ) as string[]

        const variantRows = await prisma.productVariant.findMany({
            where: { tenantId, productId },
            select: { id: true }
        })
        const variantIds = variantRows.map((row) => row.id)

        const [
            orderItemCount,
            saleItemByProductCount,
            saleItemByVariantCount,
            purchaseItemCount,
            inventoryMovementCount
        ] = await Promise.all([
            prisma.orderItem.count({ where: { tenantId, productId } }),
            prisma.saleItem.count({ where: { tenantId, productId } }),
            variantIds.length > 0 ? prisma.saleItem.count({ where: { tenantId, variantId: { in: variantIds } } }) : Promise.resolve(0),
            variantIds.length > 0 ? prisma.purchaseOrderItem.count({ where: { tenantId, variantId: { in: variantIds } } }) : Promise.resolve(0),
            variantIds.length > 0 ? prisma.inventoryMovement.count({ where: { tenantId, variantId: { in: variantIds } } }) : Promise.resolve(0)
        ])

        const hasReferences =
            orderItemCount > 0 ||
            saleItemByProductCount > 0 ||
            saleItemByVariantCount > 0 ||
            purchaseItemCount > 0 ||
            inventoryMovementCount > 0

        if (hasReferences) {
            await prisma.$transaction(async (tx) => {
                await tx.product.updateMany({
                    where: { tenantId, id: productId },
                    data: { isActive: false }
                })
                await tx.productVariant.updateMany({
                    where: { tenantId, productId },
                    data: { isActive: false }
                })
                await syncProductStockForProducts(tx as any, tenantId, [productId])
            })

            return { success: true, action: 'archived' as const }
        }

        await prisma.$transaction(async (tx) => {
            await tx.product.deleteMany({
                where: { id: productId, tenantId }
            })
        })

        for (const url of urlsToMaybeDelete) {
            const [imageCount, productArrayCount] = await Promise.all([
                prisma.productImage.count({ where: { tenantId, url } }),
                prisma.product.count({ where: { tenantId, images: { has: url } } })
            ])
            const stillReferenced = imageCount > 0 || productArrayCount > 0
            if (!stillReferenced) {
                try {
                    await deletePublicAssetIfOwned({ tenantId, urlOrPath: url })
                } catch (error) {
                    console.warn('Failed to delete public asset for product delete', { tenantId, url, error })
                }
            }
        }

        return { success: true, action: 'deleted' as const }
    }

    // --- Options Management ---

    async createOption(tenantId: string, productId: string, data: any) {
        const product = await this.getProduct(tenantId, productId)
        if (!product) throw new Error('Product not found')

        const option = await prisma.productOption.create({
            data: {
                tenantId,
                productId,
                name: data.name,
                position: data.position || 0,
                displayType: data.displayType || 'dropdown',
                values: {
                    create: (data.values || []).map((v: any, idx: number) => ({
                        label: v.label,
                        position: v.position || idx,
                        meta: v.meta ? (typeof v.meta === 'string' ? v.meta : JSON.stringify(v.meta)) : null
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
            where: { id: optionId, tenantId }
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
            where: { id: optionId, tenantId }
        })
        if (!option) throw new Error('Option not found')

        // Deleting option will cascade delete values and variants that depend on it
        await prisma.productOption.delete({ where: { id: optionId } })
        await this.syncVariants(tenantId, option.productId)
        return true
    }

    async addOptionValue(tenantId: string, optionId: string, data: any) {
        const option = await prisma.productOption.findFirst({
            where: { id: optionId, tenantId }
        })
        if (!option) throw new Error('Option not found')

        const value = await prisma.productOptionValue.create({
            data: {
                label: data.label,
                position: data.position || 0,
                meta: data.meta ? (typeof data.meta === 'string' ? data.meta : JSON.stringify(data.meta)) : null,
                option: {
                    connect: { tenantId_id: { tenantId, id: optionId } }
                }
            }
        })

        await this.syncVariants(tenantId, option.productId)
        return value
    }

    async deleteOptionValue(tenantId: string, valueId: string) {
        const value = await prisma.productOptionValue.findFirst({
            where: { id: valueId, tenantId },
            include: { option: true }
        })
        if (!value) throw new Error('Option Value not found')

        await prisma.productOptionValue.delete({ where: { id: valueId } })
        await this.syncVariants(tenantId, value.option.productId)
        return true
    }

    async updateOptionValue(tenantId: string, valueId: string, data: any) {
        const value = await prisma.productOptionValue.findFirst({
            where: { id: valueId, tenantId },
            include: { option: true }
        })
        if (!value) throw new Error('Option Value not found')

        const updated = await prisma.productOptionValue.update({
            where: { id: valueId },
            data: {
                label: data.label,
                position: data.position,
                meta: data.meta ? (typeof data.meta === 'string' ? data.meta : JSON.stringify(data.meta)) : undefined
            }
        })

        // If label changed, we might want to regenerate variant names if we store them explicitly,
        // but currently we generate them dynamically or they are just relations.
        // Syncing variants might be needed if we tracked something specific, but for now
        // the relations stay the same, just the label on the value changed.
        // However, if we cache variant titles, we'd need to update them.
        // Our getVariantTitle in frontend is dynamic.
        // Does backend store anything?
        // ProductVariant model has no title field. It relies on relations.
        // So no need to syncVariants for a simple label change.

        return updated
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
        const product = await this.getProduct(tenantId, productId, { includeInactiveVariants: true })
        if (!product) throw new Error('Product not found')

        // If no options, ensure a single default variant exists (used as stock source of truth).
        if (!product.options || product.options.length === 0) {
            const defaultVariant = (product.variants || []).find((v: any) => this.isDefaultVariant(v))
            const ensured = defaultVariant ?? (await this.ensureDefaultVariant(tenantId, product))

            // Deactivate any other variants for safety (keep history/order links intact).
            await prisma.productVariant.updateMany({
                where: { tenantId, productId, id: { not: ensured.id } },
                data: { isActive: false }
            })

            await syncProductStockForProducts(prisma as any, tenantId, [productId])

            return prisma.productVariant.findMany({
                where: { productId, tenantId, isActive: true },
                include: {
                    optionValues: { include: { optionValue: true } },
                    images: { include: { image: true }, orderBy: { position: 'asc' } }
                },
                orderBy: { createdAt: 'asc' }
            })
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

        // Variants to deactivate: signatures not in target (never hard-delete to preserve order history).
        const toDeactivate = existingVariants.filter(
            (v) => !targetSignatures.has(this.buildVariantSignature(v.optionValues || []))
        )

        // Signatures to create: target not already existing
        const toCreate = Array.from(targetSignatures).filter((sig) => !existingBySignature.has(sig))

        const defaultVariant = existingBySignature.get('') as any | undefined
        const carryStock = defaultVariant ? defaultVariant.stock : 0
        const carryReserved = defaultVariant ? defaultVariant.reserved : 0
        const carrySafety = defaultVariant ? defaultVariant.safetyStock : 0
        const hasCarryover = carryStock !== 0 || carryReserved !== 0 || carrySafety !== 0

        await prisma.$transaction(async (tx) => {
            // Deactivate obsolete variants
            if (toDeactivate.length > 0) {
                await tx.productVariant.updateMany({
                    where: { tenantId, id: { in: toDeactivate.map((v) => v.id) } },
                    data: { isActive: false }
                })
            }

            // Ensure all target variants are active (reactivate previously deactivated ones)
            const toActivate = existingVariants
                .filter((v) => targetSignatures.has(this.buildVariantSignature(v.optionValues || [])))
                .map((v) => v.id)
            if (toActivate.length > 0) {
                await tx.productVariant.updateMany({
                    where: { tenantId, id: { in: toActivate } },
                    data: { isActive: true }
                })
            }

            // Create missing variants
            for (const sig of toCreate) {
                const valueIds = sig.split('|').filter(Boolean)
                const sku = await this.ensureUniqueSku(tx, tenantId, suggestSkuFromProduct(product.slug, sig))
                await tx.productVariant.create({
                    data: {
                        tenantId,
                        productId,
                        sku,
                        price: product.price,
                        stock: 0,
                        reserved: 0,
                        safetyStock: 0,
                        isActive: true,
                        trackInventory: true,
                        optionValues: {
                            create: valueIds.map((optionValueId) => ({ optionValueId }))
                        }
                    }
                })
            }

            // Carry over stock from default variant (no-options) into the first target variant to avoid silent loss.
            if (defaultVariant && hasCarryover) {
                const receiver = await tx.productVariant.findFirst({
                    where: { tenantId, productId, optionValues: { some: {} } },
                    orderBy: { createdAt: 'asc' }
                })

                if (receiver) {
                    await tx.productVariant.update({
                        where: { id: receiver.id },
                        data: {
                            stock: { increment: carryStock },
                            reserved: { increment: carryReserved },
                            safetyStock: { increment: carrySafety }
                        }
                    })

                    await tx.productVariant.update({
                        where: { id: defaultVariant.id },
                        data: { stock: 0, reserved: 0, safetyStock: 0, isActive: false }
                    })

                    await tx.inventoryMovement.createMany({
                        data: [
                            {
                                tenantId,
                                variantId: receiver.id,
                                type: 'MANUAL_ADJUSTMENT' as any,
                                delta: carryStock,
                                reservedDelta: carryReserved,
                                safetyStockDelta: carrySafety,
                                reason: 'variant_sync_carryover',
                                note: 'Carried stock from default variant after enabling options',
                                stockAfter: receiver.stock + carryStock,
                                reservedAfter: receiver.reserved + carryReserved,
                                safetyStockAfter: receiver.safetyStock + carrySafety,
                                createdByUserId: null
                            },
                            {
                                tenantId,
                                variantId: defaultVariant.id,
                                type: 'MANUAL_ADJUSTMENT' as any,
                                delta: -carryStock,
                                reservedDelta: -carryReserved,
                                safetyStockDelta: -carrySafety,
                                reason: 'variant_sync_carryover',
                                note: 'Moved stock into option variants; default variant deactivated',
                                stockAfter: 0,
                                reservedAfter: 0,
                                safetyStockAfter: 0,
                                createdByUserId: null
                            }
                        ],
                        skipDuplicates: false
                    })
                }
            }

            await syncProductStockForProducts(tx as any, tenantId, [productId])
        })

        // Return refreshed variants with relations
        return prisma.productVariant.findMany({
            where: { productId, tenantId, isActive: true },
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
