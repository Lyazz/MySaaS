import prisma from '../../lib/prisma'
import { coalesceProductImageUrls } from '../../lib/product-images'
import { LoyaltyFormulaService } from '../loyalty/loyalty-formula.service'
import { getVariantAvailableStock, PRODUCT_INFINITE_STOCK } from '../../../../shared/inventory/variant-availability'
import { buildScopedProductPricing } from '../../../../shared/pricing/product-pricing'

const extractMetaPixelIds = (metaPixels: any[]): string[] => {
    return (metaPixels || [])
        .filter((mp: any) => mp?.metaPixel?.isActive)
        .map((mp: any) => mp?.metaPixel?.pixelId)
        .filter((id: any) => typeof id === 'string' && /^[0-9]+$/.test(id))
}

const mapProductCategories = (product: any) => {
    const linkedCategories = (product?.categoryLinks || [])
        .map((link: any) => link?.category)
        .filter((category: any) => category && category.id)
    let uniqueCategories = Array.from(
        new Map(linkedCategories.map((category: any) => [category.id, category])).values()
    )
    const primaryCategory = product?.category ?? uniqueCategories[0] ?? null
    const primaryCategoryId = product?.categoryId ?? primaryCategory?.id ?? null
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

export class PublicProductsService {
    private loyalty = new LoyaltyFormulaService()

    private buildProductLoyaltyPreview(settings: any, product: any) {
        const candidateVariant =
            Array.isArray(product?.variants) && product.variants.length > 0
                ? (product.variants.find((variant: any) => Array.isArray(variant.optionValues) && variant.optionValues.length === 0) ?? product.variants[0])
                : null

        const referencePrice = candidateVariant?.price ?? product?.price ?? 0
        const cost = candidateVariant?.cost ?? 0

        return this.loyalty.buildPublicPreview(settings, {
            quantity: 1,
            referencePrice,
            cost
        })
    }

    async listProducts(tenantId: string, search?: string) {
        const now = new Date()
        const settings = await prisma.storeSettings.findUnique({
            where: { tenantId },
            select: {
                loyaltyEnabled: true,
                loyaltyBasePoints: true,
                loyaltyMarginFactor: true,
                loyaltyPublicFormulaMode: true
            }
        })

        const where: any = { tenantId, isActive: true }
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ]
        }

        const products = await prisma.product.findMany({
            where,
            include: {
                category: true,
                categoryLinks: {
                    where: { tenantId },
                    include: { category: true }
                },
                productImages: { orderBy: [{ isMain: 'desc' }, { position: 'asc' }] },
                metaPixels: {
                    include: { metaPixel: { select: { pixelId: true, isActive: true } } }
                },
                variants: {
                    where: { isActive: true },
                    orderBy: { createdAt: 'asc' },
                    take: 1,
                    select: {
                        id: true,
                        price: true,
                        promotionalPrice: true,
                        isPromotionActive: true,
                        promotionStartDate: true,
                        promotionEndDate: true,
                        showCountdown: true,
                        cost: true,
                        optionValues: { select: { optionValueId: true } }
                    }
                },
                bundleDeals: {
                    where: {
                        isActive: true,
                        AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }]
                    },
                    orderBy: { bundleQty: 'asc' },
                    select: { id: true, bundleQty: true, bundlePrice: true, tag: true }
                },
                _count: {
                    select: {
                        options: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return products.map(({ metaPixels, productImages, images, variants, _count, ...rest }: any) => {
            const withCategories = mapProductCategories(rest)
            const hasVariants = Number(_count?.options || 0) > 0
            const mappedVariants = Array.isArray(variants)
                ? variants.map((variant: any) => {
                    const pricing = buildScopedProductPricing({ ...rest, hasVariants }, variant)
                    return {
                        ...variant,
                        referencePrice: variant.price,
                        price: pricing.effectivePrice,
                        availableStock: getVariantAvailableStock(variant, { infiniteValue: PRODUCT_INFINITE_STOCK }),
                        cost: undefined
                    }
                })
                : []
            return {
                ...withCategories,
                productImages,
                images: coalesceProductImageUrls(images, productImages),
                metaPixelIds: extractMetaPixelIds(metaPixels),
                hasVariants,
                variants: mappedVariants,
                loyaltyPreview: this.buildProductLoyaltyPreview(settings, { ...rest, variants })
            }
        })
    }

    async getProductBySlug(tenantId: string, slug: string) {
        const now = new Date()
        const settings = await prisma.storeSettings.findUnique({
            where: { tenantId },
            select: {
                loyaltyEnabled: true,
                loyaltyBasePoints: true,
                loyaltyMarginFactor: true,
                loyaltyPublicFormulaMode: true
            }
        })
        const product = await prisma.product.findUnique({
            where: { tenantId_slug: { tenantId, slug } },
            include: {
                category: true,
                categoryLinks: {
                    where: { tenantId },
                    include: { category: true }
                },
                metaPixels: {
                    include: { metaPixel: { select: { pixelId: true, isActive: true } } }
                },
                options: {
                    include: { values: { orderBy: { position: 'asc' } } },
                    orderBy: { position: 'asc' }
                },
                variants: {
                    where: { isActive: true },
                    select: {
                        id: true,
                        productId: true,
                        sku: true,
                        barcode: true,
                        price: true,
                        promotionalPrice: true,
                        isPromotionActive: true,
                        promotionStartDate: true,
                        promotionEndDate: true,
                        showCountdown: true,
                        compareAtPrice: true,
                        isActive: true,
                        trackInventory: true,
                        stock: true,
                        reserved: true,
                        safetyStock: true,
                        createdAt: true,
                        updatedAt: true,
                        cost: true,
                        optionValues: {
                            include: { optionValue: true }
                        },
                        images: { include: { image: true }, orderBy: { position: 'asc' } }
                    },
                    orderBy: { createdAt: 'asc' }
                },
                productImages: { orderBy: [{ isMain: 'desc' }, { position: 'asc' }] },
                bundleDeals: {
                    where: {
                        isActive: true,
                        AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }]
                    },
                    orderBy: { bundleQty: 'asc' },
                    select: { id: true, bundleQty: true, bundlePrice: true, tag: true }
                }
            }
        })

        if (!product) return null

        const { metaPixels, productImages, images, variants, ...rest }: any = product
        return {
            ...mapProductCategories(rest),
            variants: Array.isArray(variants)
                ? variants.map((variant: any) => {
                    const pricing = buildScopedProductPricing({ ...rest, hasVariants: true }, variant)
                    return {
                        ...variant,
                        referencePrice: variant.price,
                        price: pricing.effectivePrice,
                        availableStock: getVariantAvailableStock(variant, { infiniteValue: PRODUCT_INFINITE_STOCK }),
                        loyaltyPreview: this.loyalty.buildPublicPreview(settings, {
                            quantity: 1,
                            referencePrice: variant.price ?? rest.price ?? 0,
                            cost: variant.cost ?? 0
                        }),
                        cost: undefined
                    }
                })
                : [],
            productImages,
            images: coalesceProductImageUrls(images, productImages),
            metaPixelIds: extractMetaPixelIds(metaPixels),
            loyaltyPreview: this.buildProductLoyaltyPreview(settings, { ...rest, variants })
        }
    }
}
