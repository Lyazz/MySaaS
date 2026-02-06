import prisma from '../../lib/prisma'
import { MetaPixelValidationError } from './meta-pixels.service'

export class ProductMetaPixelsService {
    async getAssignedMetaPixelIds(tenantId: string, productId: string): Promise<string[]> {
        const rows = await prisma.productMetaPixel.findMany({
            where: { tenantId, productId },
            select: { metaPixelId: true }
        })
        return rows.map((r) => r.metaPixelId)
    }

    async setAssignedMetaPixelIds(tenantId: string, productId: string, metaPixelIds: string[]) {
        const product = await prisma.product.findFirst({ where: { tenantId, id: productId }, select: { id: true } })
        if (!product) throw new MetaPixelValidationError(404, 'Product not found')

        const cleaned = Array.from(new Set((metaPixelIds || []).filter((id) => typeof id === 'string' && id.trim()))).map((id) =>
            id.trim()
        )

        if (cleaned.length > 0) {
            const existing = await prisma.tenantMetaPixel.findMany({
                where: { tenantId, id: { in: cleaned } },
                select: { id: true }
            })
            const ok = new Set(existing.map((e) => e.id))
            const invalid = cleaned.filter((id) => !ok.has(id))
            if (invalid.length) throw new MetaPixelValidationError(400, 'One or more metaPixelIds are invalid')
        }

        await prisma.$transaction(async (tx) => {
            await tx.productMetaPixel.deleteMany({ where: { tenantId, productId } })
            if (cleaned.length) {
                await tx.productMetaPixel.createMany({
                    data: cleaned.map((metaPixelId) => ({ tenantId, productId, metaPixelId }))
                })
            }
        })

        return this.getAssignedMetaPixelIds(tenantId, productId)
    }
}

