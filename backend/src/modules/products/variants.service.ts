import prisma from '../../lib/prisma'
import { InventoryService } from '../inventory/inventory.service'
import { syncProductStockForProducts } from '../inventory/product-stock.service'

export class VariantsService {
    private inventory = new InventoryService()

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

        const updateInfoResult = await prisma.productVariant.updateMany({
            where: { id: variantId, tenantId },
            data: {
                sku: body?.sku,
                price: body?.price !== undefined ? body.price : undefined,
                compareAtPrice: body?.compareAtPrice !== undefined ? body.compareAtPrice : undefined,
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

        await prisma.productVariant.delete({ where: { id: variantId } })
        await syncProductStockForProducts(prisma as any, tenantId, [variant.productId])
        return { success: true }
    }
}
