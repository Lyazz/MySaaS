import prisma from '../../lib/prisma'

type ProductPriceSyncClient = Pick<typeof prisma, 'product' | 'productVariant'>

export async function syncDerivedProductPrice(
    tx: ProductPriceSyncClient,
    tenantId: string,
    productId: string
) {
    const currentProduct = await tx.product.findFirst({
        where: { tenantId, id: productId },
        select: { price: true }
    })

    if (!currentProduct) return null

    const lowestSelectableVariant = await tx.productVariant.findFirst({
        where: {
            tenantId,
            productId,
            isActive: true,
            optionValues: { some: {} }
        },
        orderBy: [{ price: 'asc' }, { createdAt: 'asc' }],
        select: { price: true }
    })

    const defaultVariant = await tx.productVariant.findFirst({
        where: {
            tenantId,
            productId,
            isActive: true,
            optionValues: { none: {} }
        },
        orderBy: { createdAt: 'asc' },
        select: { price: true }
    })

    const fallbackActiveVariant = await tx.productVariant.findFirst({
        where: { tenantId, productId, isActive: true },
        orderBy: { createdAt: 'asc' },
        select: { price: true }
    })

    const nextPrice =
        lowestSelectableVariant?.price ??
        defaultVariant?.price ??
        fallbackActiveVariant?.price ??
        currentProduct.price

    await tx.product.updateMany({
        where: { tenantId, id: productId },
        data: { price: nextPrice }
    })

    return nextPrice
}
