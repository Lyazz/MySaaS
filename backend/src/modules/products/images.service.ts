import prisma from '../../lib/prisma'
import { deletePublicAssetIfOwned } from '../../lib/public-assets'

export class ProductImagesService {
    private async isUrlReferenced(tenantId: string, url: string) {
        const [imageCount, productArrayCount] = await Promise.all([
            prisma.productImage.count({ where: { tenantId, url } }),
            prisma.product.count({ where: { tenantId, images: { has: url } } })
        ])

        return imageCount > 0 || productArrayCount > 0
    }

    /**
     * Add a new image to a product
     */
    async addImage(tenantId: string, productId: string, data: { url: string; alt?: string; position?: number; isMain?: boolean }) {
        // Verify product ownership
        const product = await prisma.product.findFirst({
            where: { id: productId, tenantId }
        })
        if (!product) throw new Error('Product not found')

        // If this is marked as main, unset any existing main images
        if (data.isMain) {
            await prisma.productImage.updateMany({
                where: { tenantId, productId, isMain: true },
                data: { isMain: false }
            })
        }

        // Get current max position if no position specified
        let position = data.position ?? 0
        if (data.position === undefined) {
            const maxPosition = await prisma.productImage.findFirst({
                where: { tenantId, productId },
                orderBy: { position: 'desc' },
                select: { position: true }
            })
            position = (maxPosition?.position ?? -1) + 1
        }

        return await prisma.productImage.create({
            data: {
                tenantId,
                productId,
                url: data.url,
                alt: data.alt || null,
                position,
                isMain: data.isMain ?? false
            }
        })
    }

    /**
     * Update an existing image
     */
    async updateImage(
        tenantId: string,
        productId: string,
        imageId: string,
        data: { url?: string; alt?: string; position?: number; isMain?: boolean }
    ) {
        // Verify ownership
        const existing = await prisma.productImage.findFirst({
            where: { id: imageId, tenantId, productId }
        })
        if (!existing) throw new Error('Image not found')

        // If setting as main, unset other main images
        if (data.isMain === true) {
            await prisma.productImage.updateMany({
                where: { tenantId, productId, isMain: true, id: { not: imageId } },
                data: { isMain: false }
            })
        }

        const updated = await prisma.productImage.update({
            where: { id: imageId },
            data: {
                url: data.url,
                alt: data.alt,
                position: data.position,
                isMain: data.isMain
            }
        })

        if (existing.url && updated.url && existing.url !== updated.url) {
            const stillReferenced = await this.isUrlReferenced(tenantId, existing.url)
            if (!stillReferenced) {
                try {
                    await deletePublicAssetIfOwned({ tenantId, urlOrPath: existing.url })
                } catch (error) {
                    console.warn('Failed to delete public asset for product image update', {
                        tenantId,
                        url: existing.url,
                        error
                    })
                }
            }
        }

        return updated
    }

    /**
     * Delete an image
     */
    async deleteImage(tenantId: string, productId: string, imageId: string) {
        // Verify ownership
        const image = await prisma.productImage.findFirst({
            where: { id: imageId, tenantId, productId }
        })
        if (!image) throw new Error('Image not found')

        await prisma.productImage.delete({
            where: { id: imageId }
        })

        const stillReferenced = await this.isUrlReferenced(tenantId, image.url)
        if (!stillReferenced) {
            try {
                await deletePublicAssetIfOwned({ tenantId, urlOrPath: image.url })
            } catch (error) {
                console.warn('Failed to delete public asset for product image delete', {
                    tenantId,
                    url: image.url,
                    error
                })
            }
        }

        return true
    }

    /**
     * Reorder images (bulk update positions)
     */
    async reorderImages(tenantId: string, productId: string, imageOrders: { id: string; position: number }[]) {
        // Verify product ownership
        const product = await prisma.product.findFirst({
            where: { id: productId, tenantId }
        })
        if (!product) throw new Error('Product not found')

        // Update all positions in a transaction
        await prisma.$transaction(
            imageOrders.map((order) =>
                prisma.productImage.updateMany({
                    where: { id: order.id, tenantId, productId },
                    data: { position: order.position }
                })
            )
        )

        return await this.getProductImages(tenantId, productId)
    }

    /**
     * Set an image as main (and unset others)
     */
    async setMainImage(tenantId: string, productId: string, imageId: string) {
        // Verify image ownership
        const image = await prisma.productImage.findFirst({
            where: { id: imageId, tenantId, productId }
        })
        if (!image) throw new Error('Image not found')

        // Unset all main images for this product, then set the specified one
        await prisma.$transaction([
            prisma.productImage.updateMany({
                where: { tenantId, productId, isMain: true },
                data: { isMain: false }
            }),
            prisma.productImage.update({
                where: { id: imageId },
                data: { isMain: true }
            })
        ])

        return await this.getProductImages(tenantId, productId)
    }

    /**
     * Get all images for a product (ordered by isMain DESC, position ASC)
     */
    async getProductImages(tenantId: string, productId: string) {
        // Verify product ownership
        const product = await prisma.product.findFirst({
            where: { id: productId, tenantId }
        })
        if (!product) throw new Error('Product not found')

        return await prisma.productImage.findMany({
            where: { tenantId, productId },
            orderBy: [{ isMain: 'desc' }, { position: 'asc' }]
        })
    }

    /**
     * Sync product images - full replacement
     * Creates, updates, or deletes ProductImage records to match desired state
     */
    async syncImages(tenantId: string, productId: string, images: Array<{
        id?: string | null
        url: string
        alt?: string | null
        position: number
        isMain: boolean
    }>) {
        // Verify product ownership
        const product = await prisma.product.findFirst({
            where: { id: productId, tenantId }
        })
        if (!product) throw new Error('Product not found')

        // Get existing images
        const existingImages = await prisma.productImage.findMany({
            where: { tenantId, productId }
        })

        const existingIds = new Set(existingImages.map(img => img.id))
        const incomingIds = new Set(images.filter(img => img.id).map(img => img.id as string))

        // Delete images that are no longer in the list
        const toDelete = existingImages.filter(img => !incomingIds.has(img.id))
        const removedUrls = Array.from(new Set(toDelete.map((img) => img.url).filter(Boolean)))

        // Prepare updates and creates
        const updates: any[] = []
        const creates: any[] = []

        for (const img of images) {
            if (img.id && existingIds.has(img.id)) {
                // Update existing
                updates.push(
                    prisma.productImage.updateMany({
                        where: { id: img.id, tenantId },
                        data: {
                            url: img.url,
                            alt: img.alt,
                            position: img.position,
                            isMain: img.isMain
                        }
                    })
                )
            } else {
                // Create new
                creates.push(
                    prisma.productImage.create({
                        data: {
                            tenantId,
                            productId,
                            url: img.url,
                            alt: img.alt || null,
                            position: img.position,
                            isMain: img.isMain
                        }
                    })
                )
            }
        }

        // Execute all operations in a transaction
        await prisma.$transaction([
            // Delete
            ...toDelete.map(img =>
                prisma.productImage.deleteMany({ where: { id: img.id, tenantId } })
            ),
            // Update
            ...updates,
            // Create
            ...creates
        ])

        for (const url of removedUrls) {
            const stillReferenced = await this.isUrlReferenced(tenantId, url)
            if (!stillReferenced) {
                try {
                    await deletePublicAssetIfOwned({ tenantId, urlOrPath: url })
                } catch (error) {
                    console.warn('Failed to delete public asset for product images sync', {
                        tenantId,
                        url,
                        error
                    })
                }
            }
        }

        return await this.getProductImages(tenantId, productId)
    }
}
