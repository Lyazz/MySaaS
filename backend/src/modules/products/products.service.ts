import prisma from '../../lib/prisma'
import { InventoryService } from '../inventory/inventory.service'
import { syncProductStockForProducts } from '../inventory/product-stock.service'
import { suggestSkuFromProduct } from '../../lib/variant-identifiers'
import { deletePublicAssetIfOwned } from '../../lib/public-assets'
import { sanitizeOptionalRichText } from '../../lib/rich-text'
import {
    getVariantAvailableStock,
    getVariantInventoryBalance,
    hasVariantInventoryBalance,
    PRODUCT_INFINITE_STOCK
} from '../../../../shared/inventory/variant-availability'
import { ProductWorkflowError } from './product-workflow.error'
import { syncDerivedProductPrice } from './product-price-sync'

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

const normalizeClientId = (value: unknown): string | undefined => {
    if (value === undefined || value === null || value === '') return undefined
    if (typeof value !== 'string') throw new Error('Invalid id')
    const trimmed = value.trim()
    if (!trimmed || trimmed.length > 100) throw new Error('Invalid id')
    return trimmed
}

export class ProductsService {
    private inventory = new InventoryService()

    private isDefaultVariant(variant: any): boolean {
        return !variant?.optionValues || variant.optionValues.length === 0
    }

    private getVariantTitle(variant: any): string {
        if (!variant?.optionValues || variant.optionValues.length === 0) return 'Default'
        return variant.optionValues
            .map((entry: any) => entry?.optionValue?.label)
            .filter((label: unknown) => typeof label === 'string' && label.trim().length > 0)
            .join(' / ')
    }

    private decorateVariant(variant: any): any {
        if (!variant) return variant
        return {
            ...variant,
            availableStock: getVariantAvailableStock(variant, { infiniteValue: PRODUCT_INFINITE_STOCK })
        }
    }

    private buildVariantStockNotEmptyError(variant: any, action: string) {
        const balance = getVariantInventoryBalance(variant)
        return new ProductWorkflowError(
            409,
            'VARIANT_STOCK_NOT_EMPTY',
            `Cannot ${action} variant "${this.getVariantTitle(variant)}" while it still has stock balances`,
            {
                variantId: variant?.id ?? null,
                productId: variant?.productId ?? null,
                stock: balance.stock,
                reserved: balance.reserved,
                safetyStock: balance.safetyStock
            }
        )
    }

    private buildAllocationRequiredState(product: any) {
        const variants = Array.isArray(product?.variants) ? product.variants : []
        const source = variants.find((variant: any) => this.isDefaultVariant(variant) && variant?.isActive === false && hasVariantInventoryBalance(variant))
        const required = Boolean(source && Array.isArray(product?.options) && product.options.length > 0)

        return {
            required,
            sourceVariantId: source?.id ?? null,
            sourceVariantTitle: source ? this.getVariantTitle(source) : null,
            balance: source ? getVariantInventoryBalance(source) : null
        }
    }

    private decorateProduct(product: any): any {
        const withCategories = this.mapProductCategories(product)
        const variants = Array.isArray(withCategories?.variants)
            ? withCategories.variants.map((variant: any) => this.decorateVariant(variant))
            : withCategories?.variants
        const allocationState = this.buildAllocationRequiredState({
            ...withCategories,
            variants
        })

        return {
            ...withCategories,
            variants,
            stockAllocationRequired: allocationState.required,
            stockAllocationSourceVariantId: allocationState.sourceVariantId,
            stockAllocationSourceVariantTitle: allocationState.sourceVariantTitle,
            stockAllocationSourceBalance: allocationState.balance
        }
    }

    private async clearProductPromotionForVariantProducts(tx: Pick<typeof prisma, 'product'>, tenantId: string, productId: string) {
        await tx.product.updateMany({
            where: { tenantId, id: productId },
            data: {
                promotionalPrice: null,
                isPromotionActive: false,
                promotionStartDate: null,
                promotionEndDate: null,
                showCountdown: false
            }
        })
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

    async isSlugAvailable(tenantId: string, slug: string, excludeProductId?: string) {
        const existing = await prisma.product.findFirst({
            where: {
                tenantId,
                slug,
                ...(excludeProductId ? { NOT: { id: excludeProductId } } : {})
            },
            select: { id: true }
        })

        return !existing
    }

    async createProduct(tenantId: string, data: any) {
        const clientId = normalizeClientId(data?.id)
        if (clientId) {
            const existingById = await prisma.product.findUnique({
                where: { id: clientId },
                select: { tenantId: true }
            })
            if (existingById?.tenantId === tenantId) return await this.getProduct(tenantId, clientId)
            if (existingById) throw new Error('Invalid id')
        }

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

        const sanitizedDescription = sanitizeOptionalRichText(data.description, { allowImages: true })
        const sanitizedMiniDescription = sanitizeOptionalRichText(data.miniDescription)

        const created = await prisma.$transaction(async (tx) => {
            const product = await tx.product.create({
                data: {
                    ...(clientId ? { id: clientId } : {}),
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
            return refreshed ? this.decorateProduct(refreshed) : null
        }

        return product ? this.decorateProduct(product) : null
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
        const shouldDisableProductPromotion = Array.isArray(existing.options) && existing.options.length > 0

        const images = normalizeImages(data.images)
        const sanitizedDescription = this.hasOwn(data, 'description')
            ? sanitizeOptionalRichText(data.description, { allowImages: true })
            : undefined
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
                    isActive: typeof data.isActive === 'boolean' ? data.isActive : undefined,
                    categoryId: categoryAssignment ? categoryAssignment.categoryId : undefined,
                    images: images,
                    lowStockThreshold: data.lowStockThreshold !== undefined ? Number(data.lowStockThreshold) : undefined,
                    promotionalPrice: shouldDisableProductPromotion
                        ? null
                        : data.promotionalPrice !== undefined
                            ? (data.promotionalPrice !== null ? String(data.promotionalPrice) : null)
                            : undefined,
                    isPromotionActive: shouldDisableProductPromotion
                        ? false
                        : typeof data.isPromotionActive === 'boolean'
                            ? data.isPromotionActive
                            : undefined,
                    promotionStartDate: shouldDisableProductPromotion
                        ? null
                        : data.promotionStartDate !== undefined
                            ? (data.promotionStartDate ? new Date(data.promotionStartDate) : null)
                            : undefined,
                    promotionEndDate: shouldDisableProductPromotion
                        ? null
                        : data.promotionEndDate !== undefined
                            ? (data.promotionEndDate ? new Date(data.promotionEndDate) : null)
                            : undefined,
                    showCountdown: shouldDisableProductPromotion
                        ? false
                        : typeof data.showCountdown === 'boolean'
                            ? data.showCountdown
                            : undefined
                }
            })

            if (categoryAssignment) {
                await this.replaceProductCategories(tx, tenantId, productId, categoryAssignment.categoryIds)
            }

            return result
        })

        if (updateResult.count === 0) throw new Error('Product not found')

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

        const blockedVariant = await prisma.productVariant.findFirst({
            where: {
                tenantId,
                productId: option.productId,
                optionValues: {
                    some: {
                        optionValue: {
                            optionId
                        }
                    }
                },
                OR: [
                    { stock: { not: 0 } },
                    { reserved: { not: 0 } },
                    { safetyStock: { not: 0 } }
                ]
            },
            include: {
                optionValues: {
                    include: { optionValue: true }
                }
            }
        })
        if (blockedVariant) {
            throw this.buildVariantStockNotEmptyError(blockedVariant, 'remove this option from')
        }

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
                tenantId,
                optionId,
                label: data.label,
                position: data.position || 0,
                meta: data.meta ? (typeof data.meta === 'string' ? data.meta : JSON.stringify(data.meta)) : null
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

        const blockedVariant = await prisma.productVariant.findFirst({
            where: {
                tenantId,
                productId: value.option.productId,
                optionValues: {
                    some: {
                        optionValueId: valueId
                    }
                },
                OR: [
                    { stock: { not: 0 } },
                    { reserved: { not: 0 } },
                    { safetyStock: { not: 0 } }
                ]
            },
            include: {
                optionValues: {
                    include: { optionValue: true }
                }
            }
        })
        if (blockedVariant) {
            throw this.buildVariantStockNotEmptyError(blockedVariant, 'remove this option value from')
        }

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
            const variantsToDeactivate = (product.variants || []).filter((variant: any) => variant.id !== ensured.id)
            const blockedVariant = variantsToDeactivate.find((variant: any) => hasVariantInventoryBalance(variant))
            if (blockedVariant) {
                throw this.buildVariantStockNotEmptyError(blockedVariant, 'remove options from')
            }

            await prisma.$transaction(async (tx) => {
                await tx.productVariant.updateMany({
                    where: { tenantId, id: ensured.id },
                    data: {
                        isActive: true,
                        price: product.price
                    }
                })

                if (variantsToDeactivate.length > 0) {
                    await tx.productVariant.updateMany({
                        where: { tenantId, id: { in: variantsToDeactivate.map((variant: any) => variant.id) } },
                        data: { isActive: false }
                    })
                }

                await syncDerivedProductPrice(tx as any, tenantId, productId)
                await syncProductStockForProducts(tx as any, tenantId, [productId])
            })

            return (await prisma.productVariant.findMany({
                where: { productId, tenantId, isActive: true },
                include: {
                    optionValues: { include: { optionValue: true } },
                    images: { include: { image: true }, orderBy: { position: 'asc' } }
                },
                orderBy: { createdAt: 'asc' }
            })).map((variant) => this.decorateVariant(variant))
        }

        const cartesian = (sets: any[][]): any[][] => {
            return sets.reduce<any[][]>((acc, set) => {
                return acc.flatMap((x: any[]) => set.map((y: any) => [...x, y]))
            }, [[]])
        }

        const valueSets: any[][] = product.options.map((opt: any) => opt.values)
        const combinations = cartesian(valueSets)

        // Map existing variants by signature
        const existingVariants: any[] = product.variants || []
        const existingBySignature = new Map<string, any>(
            existingVariants.map((v: any) => [this.buildVariantSignature(v.optionValues || []), v])
        )

        // Determine target signatures
        const targetSignatures = new Set<string>(
            combinations.map((combo: any[]) => this.buildVariantSignature(combo.map((val: any) => ({ optionValueId: val.id }))))
        )

        // Variants to deactivate: signatures not in target (never hard-delete to preserve order history).
        const toDeactivate = existingVariants.filter(
            (v: any) => !this.isDefaultVariant(v) && !targetSignatures.has(this.buildVariantSignature(v.optionValues || []))
        )

        // Signatures to create: target not already existing
        const toCreate = Array.from(targetSignatures).filter((sig: string) => !existingBySignature.has(sig))

        const defaultVariant = existingBySignature.get('') as any | undefined
        const blockedVariant = toDeactivate.find((variant: any) => hasVariantInventoryBalance(variant))
        if (blockedVariant) {
            throw this.buildVariantStockNotEmptyError(blockedVariant, 'archive')
        }

        await prisma.$transaction(async (tx) => {
            await this.clearProductPromotionForVariantProducts(tx as any, tenantId, productId)

            // Deactivate obsolete variants
            if (toDeactivate.length > 0) {
                await tx.productVariant.updateMany({
                    where: { tenantId, id: { in: toDeactivate.map((v) => v.id) } },
                    data: { isActive: false }
                })
            }

            // Ensure all target variants are active (reactivate previously deactivated ones)
            const toActivate = existingVariants
                .filter((v: any) => targetSignatures.has(this.buildVariantSignature(v.optionValues || [])))
                .map((v: any) => v.id)
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
                        promotionalPrice: null,
                        isPromotionActive: false,
                        promotionStartDate: null,
                        promotionEndDate: null,
                        showCountdown: false,
                        stock: 0,
                        reserved: 0,
                        safetyStock: 0,
                        isActive: true,
                        trackInventory: true,
                        optionValues: {
                            create: valueIds.map((optionValueId: string) => ({ optionValueId }))
                        }
                    }
                })
            }

            // Keep the hidden default variant as the stock-allocation source until stock is
            // explicitly distributed into selectable variants.
            if (defaultVariant) {
                await tx.productVariant.updateMany({
                    where: { tenantId, id: defaultVariant.id },
                    data: { isActive: false }
                })
            }

            await syncDerivedProductPrice(tx as any, tenantId, productId)
            await syncProductStockForProducts(tx as any, tenantId, [productId])
        })

        // Return refreshed variants with relations
        return (await prisma.productVariant.findMany({
            where: { productId, tenantId, isActive: true },
            include: {
                optionValues: { include: { optionValue: true } },
                images: { include: { image: true }, orderBy: { position: 'asc' } }
            },
            orderBy: { createdAt: 'asc' }
        })).map((variant) => this.decorateVariant(variant))
    }

    async allocateVariantStock(
        tenantId: string,
        productId: string,
        input: { sourceVariantId?: unknown; allocations?: unknown },
        actor?: { userId?: string | null }
    ) {
        const product = await this.getProduct(tenantId, productId, { includeInactiveVariants: true })
        if (!product) throw new Error('Product not found')
        if (!Array.isArray(product.options) || product.options.length === 0) {
            throw new ProductWorkflowError(400, 'STOCK_ALLOCATION_REQUIRED', 'Stock allocation is only available for products with variants')
        }

        const explicitSourceVariantId =
            typeof input?.sourceVariantId === 'string' && input.sourceVariantId.trim().length > 0
                ? input.sourceVariantId.trim()
                : null

        const sourceVariant = (product.variants || []).find((variant: any) => {
            if (!this.isDefaultVariant(variant)) return false
            if (explicitSourceVariantId && variant.id !== explicitSourceVariantId) return false
            return hasVariantInventoryBalance(variant)
        })

        if (!sourceVariant) {
            throw new ProductWorkflowError(409, 'STOCK_ALLOCATION_REQUIRED', 'No hidden source variant requires stock allocation', {
                productId
            })
        }

        const activeSelectableVariants = (product.variants || []).filter(
            (variant: any) => variant.id !== sourceVariant.id && variant.isActive !== false && !this.isDefaultVariant(variant)
        )
        if (activeSelectableVariants.length === 0) {
            throw new ProductWorkflowError(409, 'STOCK_ALLOCATION_REQUIRED', 'Create at least one active selectable variant before allocating stock', {
                productId,
                sourceVariantId: sourceVariant.id
            })
        }

        if (!Array.isArray(input?.allocations) || input.allocations.length === 0) {
            throw new ProductWorkflowError(409, 'STOCK_ALLOCATION_REQUIRED', 'Allocation must distribute the full hidden stock balance', {
                productId,
                sourceVariantId: sourceVariant.id
            })
        }

        const targetVariantIds = new Set(activeSelectableVariants.map((variant: any) => variant.id))
        const seenVariantIds = new Set<string>()
        const allocations = input.allocations.map((row: any) => {
            const variantId = typeof row?.variantId === 'string' ? row.variantId.trim() : ''
            if (!variantId || !targetVariantIds.has(variantId)) {
                throw new ProductWorkflowError(400, 'STOCK_ALLOCATION_REQUIRED', 'Allocation contains an invalid target variant', {
                    productId,
                    sourceVariantId: sourceVariant.id,
                    variantId: variantId || null
                })
            }
            if (seenVariantIds.has(variantId)) {
                throw new ProductWorkflowError(400, 'STOCK_ALLOCATION_REQUIRED', 'Allocation contains duplicate target variants', {
                    variantId
                })
            }
            seenVariantIds.add(variantId)

            const stock = Number(row?.stock)
            const reserved = Number(row?.reserved ?? 0)
            const safetyStock = Number(row?.safetyStock ?? 0)
            if (![stock, reserved, safetyStock].every((value) => Number.isFinite(value) && value >= 0 && Number.isInteger(value))) {
                throw new ProductWorkflowError(400, 'STOCK_ALLOCATION_REQUIRED', 'Allocation values must be non-negative integers', {
                    variantId
                })
            }
            if (reserved > stock || stock < reserved + safetyStock) {
                throw new ProductWorkflowError(400, 'STOCK_ALLOCATION_REQUIRED', 'Each allocation must satisfy stock >= reserved + safetyStock', {
                    variantId
                })
            }

            return { variantId, stock, reserved, safetyStock }
        })

        const sourceBalance = getVariantInventoryBalance(sourceVariant)
        const totals = allocations.reduce(
            (sum, row) => ({
                stock: sum.stock + row.stock,
                reserved: sum.reserved + row.reserved,
                safetyStock: sum.safetyStock + row.safetyStock
            }),
            { stock: 0, reserved: 0, safetyStock: 0 }
        )

        if (
            totals.stock !== sourceBalance.stock ||
            totals.reserved !== sourceBalance.reserved ||
            totals.safetyStock !== sourceBalance.safetyStock
        ) {
            throw new ProductWorkflowError(409, 'STOCK_ALLOCATION_REQUIRED', 'Allocation must distribute the full hidden stock balance exactly', {
                sourceVariantId: sourceVariant.id,
                expected: sourceBalance,
                received: totals
            })
        }

        await prisma.$transaction(async (tx) => {
            for (const row of allocations) {
                const targetBefore = await tx.productVariant.findFirst({
                    where: { tenantId, id: row.variantId, productId },
                    select: { id: true, stock: true, reserved: true, safetyStock: true }
                })
                if (!targetBefore) {
                    throw new ProductWorkflowError(404, 'STOCK_ALLOCATION_REQUIRED', 'Target variant not found during allocation', {
                        variantId: row.variantId
                    })
                }

                await tx.productVariant.update({
                    where: { id: row.variantId },
                    data: {
                        stock: { increment: row.stock },
                        reserved: { increment: row.reserved },
                        safetyStock: { increment: row.safetyStock }
                    }
                })

                const targetAfter = await tx.productVariant.findFirst({
                    where: { tenantId, id: row.variantId },
                    select: { stock: true, reserved: true, safetyStock: true }
                })

                await tx.inventoryMovement.create({
                    data: {
                        tenantId,
                        variantId: row.variantId,
                        type: 'MANUAL_ADJUSTMENT' as any,
                        delta: row.stock,
                        reservedDelta: row.reserved,
                        safetyStockDelta: row.safetyStock,
                        reason: 'variant_stock_allocation',
                        note: `Allocated from hidden source variant ${sourceVariant.id}`.slice(0, 500),
                        stockAfter: targetAfter?.stock ?? targetBefore.stock + row.stock,
                        reservedAfter: targetAfter?.reserved ?? targetBefore.reserved + row.reserved,
                        safetyStockAfter: targetAfter?.safetyStock ?? targetBefore.safetyStock + row.safetyStock,
                        createdByUserId: actor?.userId ?? null
                    }
                })
            }

            await tx.productVariant.updateMany({
                where: {
                    tenantId,
                    id: sourceVariant.id,
                    stock: sourceBalance.stock,
                    reserved: sourceBalance.reserved,
                    safetyStock: sourceBalance.safetyStock
                },
                data: {
                    stock: 0,
                    reserved: 0,
                    safetyStock: 0,
                    isActive: false
                }
            })

            await tx.inventoryMovement.create({
                data: {
                    tenantId,
                    variantId: sourceVariant.id,
                    type: 'MANUAL_ADJUSTMENT' as any,
                    delta: -sourceBalance.stock,
                    reservedDelta: -sourceBalance.reserved,
                    safetyStockDelta: -sourceBalance.safetyStock,
                    reason: 'variant_stock_allocation',
                    note: 'Distributed hidden source variant stock into selectable variants',
                    stockAfter: 0,
                    reservedAfter: 0,
                    safetyStockAfter: 0,
                    createdByUserId: actor?.userId ?? null
                }
            })

            await syncProductStockForProducts(tx as any, tenantId, [productId])
        })

        return this.getProduct(tenantId, productId, { includeInactiveVariants: true })
    }

    async generateVariants(tenantId: string, productId: string) {
        // Backward-compatible route: now idempotent sync
        return this.syncVariants(tenantId, productId)
    }
}
