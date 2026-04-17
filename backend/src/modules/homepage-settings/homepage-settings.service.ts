import prisma from '../../lib/prisma'
import { coalesceProductImageUrls } from '../../lib/product-images'
import {
    DEFAULT_STOREFRONT_HOME_CONFIG,
    type StorefrontHomeCarouselSlide,
    type StorefrontHomeConfig
} from '../../../../shared/storefront/homepage'

export class HomepageSettingsValidationError extends Error {
    statusCode = 400
    statusMessage: string

    constructor(statusMessage: string) {
        super(statusMessage)
        this.statusMessage = statusMessage
    }
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const clampInt = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Math.trunc(value)))

const validateUrl = (value: unknown, field: string): string => {
    if (typeof value !== 'string') throw new HomepageSettingsValidationError(`${field} must be a string`)
    const v = value.trim()
    if (!v) throw new HomepageSettingsValidationError(`${field} cannot be empty`)
    if (v.length > 2048) throw new HomepageSettingsValidationError(`${field} is too long`)
    // Allow internal paths or absolute URLs (for custom links).
    if (!(v.startsWith('/') || v.startsWith('https://') || v.startsWith('http://'))) {
        throw new HomepageSettingsValidationError(`${field} must start with "/" or "https://" or "http://"`)
    }
    return v
}

const validateText = (value: unknown, field: string, opts?: { max?: number; allowEmpty?: boolean }): string => {
    if (typeof value !== 'string') throw new HomepageSettingsValidationError(`${field} must be a string`)
    const v = value.trim()
    if (!opts?.allowEmpty && !v) throw new HomepageSettingsValidationError(`${field} cannot be empty`)
    const max = opts?.max ?? 140
    if (v.length > max) throw new HomepageSettingsValidationError(`${field} is too long (max ${max} chars)`)
    return v
}

const validateOptionalText = (value: unknown, field: string, opts?: { max?: number }): string | undefined => {
    if (value === undefined || value === null) return undefined
    return validateText(value, field, { max: opts?.max ?? 200, allowEmpty: false })
}

const validateCarousel = (value: unknown): StorefrontHomeCarouselSlide[] => {
    if (!Array.isArray(value)) throw new HomepageSettingsValidationError('carousel must be an array')
    if (value.length < 1) throw new HomepageSettingsValidationError('carousel must have at least 1 slide')
    if (value.length > 10) throw new HomepageSettingsValidationError('carousel cannot exceed 10 slides')

    return value.map((raw, idx) => {
        if (!isPlainObject(raw)) throw new HomepageSettingsValidationError(`carousel[${idx}] must be an object`)
        return {
            imageUrl: validateUrl(raw.imageUrl, `carousel[${idx}].imageUrl`),
            title: validateText(raw.title, `carousel[${idx}].title`, { max: 80 }),
            subtitle: validateOptionalText(raw.subtitle, `carousel[${idx}].subtitle`, { max: 160 }),
            buttonText: validateOptionalText(raw.buttonText, `carousel[${idx}].buttonText`, { max: 40 }),
            buttonHref: raw.buttonHref === undefined || raw.buttonHref === null ? undefined : validateUrl(raw.buttonHref, `carousel[${idx}].buttonHref`)
        }
    })
}

const validateConfig = (value: unknown): StorefrontHomeConfig => {
    if (!isPlainObject(value)) throw new HomepageSettingsValidationError('homeConfig must be an object')

    const sectionsRaw = value.sections
    if (!isPlainObject(sectionsRaw)) throw new HomepageSettingsValidationError('homeConfig.sections must be an object')

    const browse = sectionsRaw.browseByCategory
    const arrivals = sectionsRaw.newArrivals
    const sellers = sectionsRaw.bestSellers

    if (!isPlainObject(browse)) throw new HomepageSettingsValidationError('sections.browseByCategory must be an object')
    if (!isPlainObject(arrivals)) throw new HomepageSettingsValidationError('sections.newArrivals must be an object')
    if (!isPlainObject(sellers)) throw new HomepageSettingsValidationError('sections.bestSellers must be an object')

    const newArrivalsLimit = typeof arrivals.limit === 'number' ? clampInt(arrivals.limit, 1, 24) : NaN
    const bestSellersLimit = typeof sellers.limit === 'number' ? clampInt(sellers.limit, 1, 24) : NaN

    if (!Number.isFinite(newArrivalsLimit)) throw new HomepageSettingsValidationError('sections.newArrivals.limit must be a number')
    if (!Number.isFinite(bestSellersLimit)) throw new HomepageSettingsValidationError('sections.bestSellers.limit must be a number')

    return {
        carousel: validateCarousel(value.carousel),
        sections: {
            browseByCategory: {
                enabled: typeof browse.enabled === 'boolean' ? browse.enabled : DEFAULT_STOREFRONT_HOME_CONFIG.sections.browseByCategory.enabled,
                eyebrow: validateText(browse.eyebrow, 'sections.browseByCategory.eyebrow', { max: 40 }),
                title: validateText(browse.title, 'sections.browseByCategory.title', { max: 80 })
            },
            newArrivals: {
                enabled: typeof arrivals.enabled === 'boolean' ? arrivals.enabled : DEFAULT_STOREFRONT_HOME_CONFIG.sections.newArrivals.enabled,
                eyebrow: validateText(arrivals.eyebrow, 'sections.newArrivals.eyebrow', { max: 40 }),
                title: validateText(arrivals.title, 'sections.newArrivals.title', { max: 80 }),
                limit: newArrivalsLimit
            },
            bestSellers: {
                enabled: typeof sellers.enabled === 'boolean' ? sellers.enabled : DEFAULT_STOREFRONT_HOME_CONFIG.sections.bestSellers.enabled,
                eyebrow: validateText(sellers.eyebrow, 'sections.bestSellers.eyebrow', { max: 40 }),
                title: validateText(sellers.title, 'sections.bestSellers.title', { max: 80 }),
                limit: bestSellersLimit
            }
        }
    }
}

const normalize = (value: unknown): StorefrontHomeConfig => {
    if (!value) return DEFAULT_STOREFRONT_HOME_CONFIG
    try {
        const cfg = validateConfig(value)
        return cfg
    } catch {
        return DEFAULT_STOREFRONT_HOME_CONFIG
    }
}

type HomeConfigPatchBody =
    | { homeConfig: unknown }
    | unknown

export class HomepageSettingsService {
    async getAdmin(tenantId: string): Promise<StorefrontHomeConfig> {
        const settings = await prisma.storeSettings.upsert({
            where: { tenantId },
            create: { tenantId },
            update: {}
        })
        return normalize(settings.homeConfig)
    }

    async update(tenantId: string, body: HomeConfigPatchBody): Promise<StorefrontHomeConfig> {
        const current = await this.getAdmin(tenantId)

        const patch = isPlainObject(body) && 'homeConfig' in body ? (body as any).homeConfig : body
        if (!isPlainObject(patch)) {
            throw new HomepageSettingsValidationError('Request body must be an object or { homeConfig: object }')
        }

        const merged: any = structuredClone(current)
        if ('carousel' in patch) merged.carousel = (patch as any).carousel
        if (isPlainObject((patch as any).sections)) {
            merged.sections = merged.sections ?? {}
            merged.sections.browseByCategory = {
                ...merged.sections.browseByCategory,
                ...(isPlainObject((patch as any).sections.browseByCategory) ? (patch as any).sections.browseByCategory : {})
            }
            merged.sections.newArrivals = {
                ...merged.sections.newArrivals,
                ...(isPlainObject((patch as any).sections.newArrivals) ? (patch as any).sections.newArrivals : {})
            }
            merged.sections.bestSellers = {
                ...merged.sections.bestSellers,
                ...(isPlainObject((patch as any).sections.bestSellers) ? (patch as any).sections.bestSellers : {})
            }
        }

        const next = validateConfig(merged)

        const updated = await prisma.storeSettings.upsert({
            where: { tenantId },
            create: { tenantId, homeConfig: next as any },
            update: { homeConfig: next as any }
        })

        return normalize(updated.homeConfig)
    }

    async getPublicHomepage(tenantId: string) {
        const homeConfig = await this.getAdmin(tenantId)

        const bestSellers = homeConfig.sections.bestSellers.enabled
            ? await this.getBestSellerProducts(tenantId, homeConfig.sections.bestSellers.limit)
            : []

        return { homeConfig, bestSellers }
    }

    private async getBestSellerProducts(tenantId: string, limit: number) {
        const take = clampInt(limit, 1, 24)

        const grouped = await prisma.orderItem.groupBy({
            by: ['productId'],
            where: {
                tenantId,
                order: {
                    status: {
                        not: 'CANCELLED'
                    }
                }
            },
            _sum: {
                quantity: true
            },
            orderBy: {
                _sum: {
                    quantity: 'desc'
                }
            },
            take
        })

        const productIds = grouped.map((g) => g.productId)
        if (productIds.length === 0) return []

        const products = await prisma.product.findMany({
            where: {
                tenantId,
                isActive: true,
                id: { in: productIds }
            },
            include: {
                category: true,
                productImages: { orderBy: [{ isMain: 'desc' }, { position: 'asc' }] }
            },
        })

        const byId = new Map(products.map((p) => [p.id, p]))
        return productIds
            .map((id) => byId.get(id))
            .filter((product): product is (typeof products)[number] => Boolean(product))
            .map((product) => ({
                ...product,
                images: coalesceProductImageUrls((product as any).images, (product as any).productImages)
            }))
    }
}
