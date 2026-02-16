import prisma from '../../lib/prisma'
import { InventoryService } from '../inventory/inventory.service'
import { syncProductStockForProducts } from '../inventory/product-stock.service'
import { normalizeBarcodeInput, normalizeSkuInput, suggestSkuFromProduct } from '../../lib/variant-identifiers'

export class VariantsService {
    private inventory = new InventoryService()

    private toNonNegativeMoneyString(value: unknown): string | undefined {
        if (value === undefined) return undefined
        const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
        if (!Number.isFinite(n) || n < 0) {
            const err = new Error('cost must be a non-negative number') as any
            err.statusCode = 400
            err.statusMessage = 'cost must be a non-negative number'
            throw err
        }
        return String(n)
    }

    private async assertVariantCanBeActivated(tenantId: string, variant: { id: string; productId: string }) {
        const productOptionCount = await prisma.productOption.count({
            where: { tenantId, productId: variant.productId }
        })

        const variantOptionValues = await prisma.productVariantOptionValue.findMany({
            where: { tenantId, variantId: variant.id },
            select: {
                optionValueId: true,
                optionValue: {
                    select: {
                        optionId: true,
                        option: { select: { productId: true } }
                    }
                }
            }
        })

        if (productOptionCount === 0) {
            if (variantOptionValues.length !== 0) {
                const err = new Error('Cannot activate a non-default variant for a product without options') as any
                err.statusCode = 400
                err.statusMessage = 'Cannot activate a non-default variant for a product without options'
                throw err
            }
            return
        }

        const distinctOptionIds = new Set(variantOptionValues.map((v) => v.optionValue.optionId))
        const belongsToProduct = variantOptionValues.every((v) => v.optionValue.option.productId === variant.productId)

        const isComplete = variantOptionValues.length === productOptionCount && distinctOptionIds.size === productOptionCount
        if (!isComplete || !belongsToProduct) {
            const err = new Error('Cannot activate an incomplete/invalid variant for current product options') as any
            err.statusCode = 400
            err.statusMessage = 'Cannot activate an incomplete/invalid variant for current product options'
            throw err
        }
    }

    async updateVariant(
        tenantId: string,
        variantId: string,
        body: any,
        actor?: { userId?: string | null }
    ) {
        const variant = await prisma.productVariant.findFirst({
            where: { id: variantId, tenantId },
            include: { product: true }
        })

        if (!variant) {
            const err = new Error('Variant not found') as any
            err.statusCode = 404
            err.statusMessage = 'Variant not found'
            throw err
        }

        if (body?.stock !== undefined || body?.reserved !== undefined) {
            const err = new Error('stock/reserved are system-managed and cannot be edited') as any
            err.statusCode = 403
            err.statusMessage = 'stock/reserved are system-managed and cannot be edited'
            throw err
        }

        if (body?.isActive !== undefined && Boolean(body.isActive) === true) {
            await this.assertVariantCanBeActivated(tenantId, { id: variantId, productId: variant.productId })
        }

        const nextSku = body?.sku === undefined ? undefined : normalizeSkuInput(body?.sku, 'sku')
        const nextBarcode = body?.barcode === undefined ? undefined : normalizeBarcodeInput(body?.barcode)

        if (nextSku !== undefined && nextSku !== variant.sku) {
            if (variant.skuLocked) {
                const err = new Error('SKU is locked and cannot be changed') as any
                err.statusCode = 403
                err.statusMessage = 'SKU is locked and cannot be changed'
                throw err
            }

            const conflict = await prisma.productVariant.findFirst({
                where: { tenantId, sku: nextSku, id: { not: variantId } },
                select: { id: true }
            })
            if (conflict) {
                const err = new Error('SKU already exists') as any
                err.statusCode = 409
                err.statusMessage = 'SKU already exists'
                throw err
            }
        }

        if (nextBarcode !== undefined && nextBarcode !== (variant as any).barcode) {
            const conflict = await prisma.productVariant.findFirst({
                where: { tenantId, barcode: nextBarcode, id: { not: variantId } },
                select: { id: true }
            })
            if (conflict) {
                const err = new Error('Barcode already exists') as any
                err.statusCode = 409
                err.statusMessage = 'Barcode already exists'
                throw err
            }
        }

        const cost = this.toNonNegativeMoneyString(body?.cost)

        const updateInfoResult = await prisma.productVariant.updateMany({
            where: { id: variantId, tenantId },
            data: {
                sku: nextSku,
                barcode: nextBarcode,
                price: body?.price !== undefined ? body.price : undefined,
                compareAtPrice: body?.compareAtPrice !== undefined ? body.compareAtPrice : undefined,
                cost,
                isActive: body?.isActive !== undefined ? Boolean(body.isActive) : undefined
            }
        })

        if (updateInfoResult.count !== 1) {
            const err = new Error('Variant not found') as any
            err.statusCode = 404
            err.statusMessage = 'Variant not found'
            throw err
        }

        const wantsInventoryUpdate =
            body?.safetyStock !== undefined ||
            body?.trackInventory !== undefined

        if (wantsInventoryUpdate) {
            await this.inventory.updateVariantInventory(
                tenantId,
                variantId,
                {
                    safetyStock: body?.safetyStock,
                    trackInventory: body?.trackInventory,
                    reason: 'variant_update',
                    note: typeof body?.note === 'string' ? body.note : null
                },
                actor
            )
        }

        if (body?.isActive !== undefined) {
            await syncProductStockForProducts(prisma as any, tenantId, [variant.productId])
        }

        return prisma.productVariant.findFirst({ where: { id: variantId, tenantId } })
    }

    async lockSku(tenantId: string, variantId: string) {
        const result = await prisma.productVariant.updateMany({
            where: { tenantId, id: variantId, skuLocked: false },
            data: { skuLocked: true }
        })
        if (result.count !== 1) {
            const existing = await prisma.productVariant.findFirst({ where: { tenantId, id: variantId }, select: { id: true, skuLocked: true } })
            if (!existing) {
                const err = new Error('Variant not found') as any
                err.statusCode = 404
                err.statusMessage = 'Variant not found'
                throw err
            }
            return existing
        }
        return prisma.productVariant.findFirst({ where: { tenantId, id: variantId }, select: { id: true, skuLocked: true } })
    }

    async suggestSku(tenantId: string, variantId: string) {
        const variant = await prisma.productVariant.findFirst({
            where: { tenantId, id: variantId },
            include: { product: true, optionValues: { select: { optionValueId: true } } }
        })
        if (!variant) {
            const err = new Error('Variant not found') as any
            err.statusCode = 404
            err.statusMessage = 'Variant not found'
            throw err
        }

        const signature = (variant.optionValues ?? [])
            .map((ov) => ov.optionValueId)
            .slice()
            .sort()
            .join('|')

        const sku = suggestSkuFromProduct(variant.product.slug, signature)
        const conflict = await prisma.productVariant.findFirst({
            where: { tenantId, sku, id: { not: variantId } },
            select: { id: true }
        })
        return { sku, available: !conflict }
    }

    async replaceVariantImages(tenantId: string, variantId: string, imageUrls: unknown) {
        if (!Array.isArray(imageUrls)) {
            const err = new Error('imageUrls must be an array') as any
            err.statusCode = 400
            err.statusMessage = 'imageUrls must be an array of URLs'
            throw err
        }

        const urls = Array.from(
            new Set(
                imageUrls
                    .map((u: any) => (typeof u === 'string' ? u.trim() : ''))
                    .filter((u: string) => u.length > 0)
            )
        )
        if (urls.length === 0) {
            const err = new Error('No image URLs') as any
            err.statusCode = 400
            err.statusMessage = 'No image URLs provided'
            throw err
        }

        const variant = await prisma.productVariant.findFirst({
            where: { id: variantId, tenantId },
            include: { product: { include: { productImages: true } } }
        })
        if (!variant) {
            const err = new Error('Variant not found') as any
            err.statusCode = 404
            err.statusMessage = 'Variant not found'
            throw err
        }

        const existingImages = await prisma.productImage.findMany({
            where: {
                tenantId,
                productId: variant.productId,
                url: { in: urls }
            }
        })
        const existingByUrl = new Map(existingImages.map((img) => [img.url, img]))

        const toCreate = urls.filter((url) => !existingByUrl.has(url))
        const createdImages =
            toCreate.length > 0
                ? await prisma.$transaction(
                      toCreate.map((url, idx) =>
                          prisma.productImage.create({
                              data: {
                                  tenantId,
                                  productId: variant.productId,
                                  url,
                                  position: (variant.product.productImages?.length || 0) + idx
                              }
                          })
                      )
                  )
                : []

        const allImages = [...existingImages, ...createdImages]
        const orderedImages = urls
            .map((url) => allImages.find((img) => img.url === url))
            .filter((img): img is typeof allImages[number] => Boolean(img))

        await prisma.$transaction([
            prisma.productVariantImage.deleteMany({ where: { tenantId, variantId } }),
            prisma.productVariantImage.createMany({
                data: orderedImages.map((img, idx) => ({ tenantId, variantId, imageId: img.id, position: idx })),
                skipDuplicates: true
            })
        ])

        return prisma.productVariant.findFirst({
            where: { id: variantId, tenantId },
            include: {
                images: {
                    include: { image: true },
                    orderBy: { position: 'asc' }
                }
            }
        })
    }

    async deleteVariant(tenantId: string, variantId: string) {
        const variant = await prisma.productVariant.findFirst({
            where: { id: variantId, tenantId },
            select: { id: true, productId: true }
        })
        if (!variant) {
            const err = new Error('Variant not found') as any
            err.statusCode = 404
            err.statusMessage = 'Variant not found'
            throw err
        }

        const [movementCount, purchaseCount, saleCount, orderCount] = await prisma.$transaction([
            prisma.inventoryMovement.count({ where: { tenantId, variantId } }),
            prisma.purchaseOrderItem.count({ where: { tenantId, variantId } }),
            prisma.saleItem.count({ where: { tenantId, variantId } }),
            prisma.orderItem.count({ where: { tenantId, variantId } })
        ])

        const hasReferences = movementCount > 0 || purchaseCount > 0 || saleCount > 0 || orderCount > 0
        if (hasReferences) {
            await prisma.productVariant.updateMany({
                where: { tenantId, id: variantId },
                data: { isActive: false }
            })
            await syncProductStockForProducts(prisma as any, tenantId, [variant.productId])
            return {
                success: true,
                deleted: false,
                archived: true,
                references: {
                    inventoryMovements: movementCount,
                    purchaseOrderItems: purchaseCount,
                    saleItems: saleCount,
                    orderItems: orderCount
                }
            }
        }

        const result = await prisma.productVariant.deleteMany({ where: { tenantId, id: variantId } })
        if (result.count !== 1) {
            const err = new Error('Variant not found') as any
            err.statusCode = 404
            err.statusMessage = 'Variant not found'
            throw err
        }

        await syncProductStockForProducts(prisma as any, tenantId, [variant.productId])
        return { success: true, deleted: true, archived: false }
    }
}
