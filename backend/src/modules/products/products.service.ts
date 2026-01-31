import prisma from '../../lib/prisma'
import { InventoryService } from '../inventory/inventory.service'

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

    private async ensureDefaultVariant(tenantId: string, product: { id: string; price: any; stock: number }) {
        const existing = await prisma.productVariant.findFirst({
            where: { tenantId, productId: product.id, optionValues: { none: {} } }
        })

        if (existing) return existing

        return prisma.productVariant.create({
            data: {
                tenantId,
                productId: product.id,
                price: product.price,
                stock: product.stock ?? 0,
                isActive: true,
                trackInventory: true,
                reserved: 0,
                safetyStock: 0
            }
        })
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

        const created = await prisma.$transaction(async (tx) => {
            const product = await tx.product.create({
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

            // Always create a "default" variant for products without options (stock source of truth).
            await tx.productVariant.create({
                data: {
                    tenantId,
                    productId: product.id,
                    price: product.price,
                    stock: product.stock,
                    isActive: true,
                    trackInventory: true,
                    reserved: 0,
                    safetyStock: 0
                }
            })

            return product
        })

        return created
    }

    async getProduct(tenantId: string, productId: string, opts?: { includeInactiveVariants?: boolean }) {
        const includeInactiveVariants = opts?.includeInactiveVariants === true
        const product = await prisma.product.findFirst({
            where: { id: productId, tenantId },
            include: {
                category: true,
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
                }
            }
        })

        if (product && (!product.options || product.options.length === 0) && (!product.variants || product.variants.length === 0)) {
            await this.ensureDefaultVariant(tenantId, product)
            return prisma.product.findFirst({
                where: { id: productId, tenantId },
                include: {
                    category: true,
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
                    }
                }
            })
        }

        return product
    }

    async updateProduct(tenantId: string, productId: string, data: any, actor?: { userId?: string | null }) {
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

        const refreshed = await this.getProduct(tenantId, productId)
        if (!refreshed) throw new Error('Product not found')

        // Keep default variant in sync for no-options products (bidirectional sync handled in InventoryService too).
        if (!refreshed.options || refreshed.options.length === 0) {
            const defaultVariant = (refreshed.variants || []).find((v: any) => this.isDefaultVariant(v))
            const ensured = defaultVariant ?? (await this.ensureDefaultVariant(tenantId, refreshed))

            if (data.price !== undefined) {
                await prisma.productVariant.updateMany({
                    where: { tenantId, id: ensured.id },
                    data: { price: data.price }
                })
            }

            if (data.stock !== undefined) {
                await this.inventory.updateVariantInventory(
                    tenantId,
                    ensured.id,
                    { stock: Number(data.stock), reason: 'product_update' },
                    { userId: actor?.userId ?? null }
                )
            }
        }

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

            // Mirror Product.stock to default variant stock for legacy/admin displays.
            await prisma.product.updateMany({
                where: { tenantId, id: productId },
                data: { stock: ensured.stock }
            })

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
                await tx.productVariant.create({
                    data: {
                        tenantId,
                        productId,
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
