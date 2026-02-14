import type { PrismaClient } from '@prisma/client'

export const PRODUCT_INFINITE_STOCK = 999999

type TxLike = Pick<PrismaClient, 'productVariant' | 'product'>

const clampNonNegativeInt = (n: number) => (Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0)

export async function syncProductStockForProducts(tx: TxLike, tenantId: string, productIds: string[]) {
    const ids = Array.from(new Set(productIds.filter((id) => typeof id === 'string' && id.trim()))).map((id) => id.trim())
    if (ids.length === 0) return

    const variants = await tx.productVariant.findMany({
        where: { tenantId, productId: { in: ids }, isActive: true },
        select: { productId: true, stock: true, reserved: true, safetyStock: true, trackInventory: true }
    })

    const perProduct = new Map<string, { infinite: boolean; available: number }>()
    for (const id of ids) perProduct.set(id, { infinite: false, available: 0 })

    for (const v of variants) {
        const entry = perProduct.get(v.productId) ?? { infinite: false, available: 0 }
        if (v.trackInventory === false) {
            entry.infinite = true
        } else {
            const available = clampNonNegativeInt(v.stock - v.reserved - v.safetyStock)
            entry.available += available
        }
        perProduct.set(v.productId, entry)
    }

    for (const [productId, info] of perProduct.entries()) {
        const stock = info.infinite ? PRODUCT_INFINITE_STOCK : clampNonNegativeInt(info.available)
        await tx.product.updateMany({
            where: { tenantId, id: productId },
            data: { stock }
        })
    }
}

