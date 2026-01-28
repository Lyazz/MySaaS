import { Router } from 'express'
import prisma from '../../lib/prisma'
import { requireTenantAdmin } from '../../middleware/rbac.middleware'

const router = Router()

router.use(requireTenantAdmin)

// PUT /variants/:id
router.put('/:id', async (req, res) => {
    const tenant = req.tenant!
    const { id } = req.params
    const body = req.body

    if (!id) return res.status(400).json({ statusCode: 400, statusMessage: 'ID required' })

    try {
        const variant = await prisma.productVariant.findUnique({
            where: { id },
            include: { product: true }
        })

        if (!variant || variant.product.tenantId !== tenant.id) {
            return res.status(404).json({ statusCode: 404, statusMessage: 'Variant not found' })
        }

        const updated = await prisma.productVariant.update({
            where: { id },
            data: {
                sku: body.sku,
                price: body.price !== undefined ? body.price : undefined,
                compareAtPrice: body.compareAtPrice !== undefined ? body.compareAtPrice : undefined,
                stock: body.stock !== undefined ? Number(body.stock) : undefined,
                isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
                trackInventory: body.trackInventory !== undefined ? Boolean(body.trackInventory) : undefined
            }
        })

        res.json(updated)
    } catch (error: any) {
        console.error('Update variant error:', error)
        res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
    }
})

// POST /variants/:id/images - replace variant images with given product image URLs
router.post('/:id/images', async (req, res) => {
    const tenant = req.tenant!
    const { id } = req.params
    const { imageUrls } = req.body

    if (!id) return res.status(400).json({ statusCode: 400, statusMessage: 'ID required' })
    if (!Array.isArray(imageUrls)) {
        return res.status(400).json({ statusCode: 400, statusMessage: 'imageUrls must be an array of URLs' })
    }

    // Clean + dedupe URLs
    const urls = Array.from(
        new Set(
            imageUrls
                .map((u: any) => (typeof u === 'string' ? u.trim() : ''))
                .filter((u: string) => u.length > 0)
        )
    )
    if (urls.length === 0) {
        return res.status(400).json({ statusCode: 400, statusMessage: 'No image URLs provided' })
    }

    try {
        const variant = await prisma.productVariant.findUnique({
            where: { id },
            include: {
                product: {
                    include: { productImages: true }
                }
            }
        })

        if (!variant || variant.product.tenantId !== tenant.id) {
            return res.status(404).json({ statusCode: 404, statusMessage: 'Variant not found' })
        }

        // Ensure all images belong to the same product; create ProductImage entries if missing
        const existingImages = await prisma.productImage.findMany({
            where: {
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
                                  productId: variant.productId,
                                  url,
                                  position: (variant.product.productImages?.length || 0) + idx
                              }
                          })
                      )
                  )
                : []

        const allImages = [...existingImages, ...createdImages]
        // Preserve order as provided by client
        const orderedImages = urls
            .map((url) => allImages.find((img) => img.url === url))
            .filter((img): img is typeof allImages[number] => Boolean(img))

        await prisma.$transaction([
            prisma.productVariantImage.deleteMany({ where: { variantId: id } }),
            prisma.productVariantImage.createMany({
                data: orderedImages.map((img, idx) => ({ variantId: id, imageId: img.id, position: idx })),
                skipDuplicates: true
            })
        ])

        const refreshed = await prisma.productVariant.findUnique({
            where: { id },
            include: {
                images: {
                    include: { image: true },
                    orderBy: { position: 'asc' }
                }
            }
        })

        res.json(refreshed)
    } catch (error) {
        console.error('Update variant images error:', error)
        res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
    }
})

// DELETE /variants/:id
router.delete('/:id', async (req, res) => {
    const tenant = req.tenant!
    const { id } = req.params

    if (!id) return res.status(400).json({ statusCode: 400, statusMessage: 'ID required' })

    try {
        const variant = await prisma.productVariant.findUnique({
            where: { id },
            include: { product: true }
        })

        if (!variant || variant.product.tenantId !== tenant.id) {
            return res.status(404).json({ statusCode: 404, statusMessage: 'Variant not found' })
        }

        await prisma.productVariant.delete({ where: { id } })

        res.json({ success: true })
    } catch (error) {
        console.error('Delete variant error:', error)
        res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
    }
})

export default router
