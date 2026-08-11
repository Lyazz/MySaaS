import prisma from '../../lib/prisma'
import { Prisma } from '@prisma/client'
import { isValidOrderIdPrefix, sanitizeOrderIdPrefix } from '../../lib/order-public-id'
import {
    isValidStoreLegalPagesConfig,
    normalizeStoreLegalPagesConfig,
    type StoreLegalPagesConfig
} from '../../../../shared/storefront/legal-pages'

export type StoreTemplateKey =
    | 'classic'
    | 'modern'
    | 'street'
    | 'cozy'
    | 'cyber'
    | 'stationnery'
    | 'food'
    | 'wellness'
    | 'playful'
    | 'activewear'
    | 'chrono'
    | 'arena'
    | 'maison'
export type StoreLanguage = 'ar' | 'fr' | 'en'


export const STORE_TEMPLATES: { key: StoreTemplateKey; label: string; description: string }[] = [
    { key: 'classic', label: 'Classic', description: 'Clean layout, ideal for most stores.' },
    { key: 'modern', label: 'Modern', description: 'Bolder typography and more visual spacing.' },
    { key: 'street', label: 'Street', description: 'High-energy, bold layout with high-contrast elements.' },
    { key: 'cozy', label: 'Cozy', description: 'Soft, minimalist design with warm colors.' },
    { key: 'cyber', label: 'Cyber', description: 'Futuristic dark mode with neon accents.' },
    { key: 'stationnery', label: 'Stationnery', description: 'Stationery oriented theme.' },
    { key: 'food', label: 'Food Market', description: 'Appetizing design with warm stone tones.' },
    { key: 'wellness', label: 'Wellness', description: 'Organic, health-focused design with Sage Green tones.' },
    { key: 'playful', label: 'Playful', description: 'Kids & fun' },
    { key: 'activewear', label: 'Activewear', description: 'Bold, aggressive typography and neon colors for sports.' },
    { key: 'chrono', label: 'Chrono Luxe', description: 'Luxury dark theme with gold accents for premium accessories.' },
    { key: 'arena', label: 'Arena Performance', description: 'Dark esports and gaming gear theme with cyan performance accents.' },
    { key: 'maison', label: 'Pistachio', description: 'Luxury pistachio-green theme for premium food, nuts, decor, and refined retail.' }
]

export const STORE_LANGUAGES: { key: StoreLanguage; label: string }[] = [
    { key: 'ar', label: 'Arabic (AR)' },
    { key: 'fr', label: 'French (FR)' },
    { key: 'en', label: 'English (EN)' }
]



export class StoreSettingsValidationError extends Error {
    statusCode = 400
    statusMessage: string

    constructor(statusMessage: string) {
        super(statusMessage)
        this.statusMessage = statusMessage
    }
}

const isHexColor = (value: string): boolean => /^#[0-9a-fA-F]{6}$/.test(value)

const isTemplateKey = (value: string): value is StoreTemplateKey =>
    STORE_TEMPLATES.some((t) => t.key === value)

const isLanguage = (value: string): value is StoreLanguage => STORE_LANGUAGES.some((l) => l.key === value)


export type StoreSettingsPatchInput = Partial<{
    name: string
    slug: string
    logoUrl: string | null
    faviconUrl: string | null
    primaryColor: string
    useBrandColor: boolean
    templateKey: string

    announcementText: string
    announcementScrolling: boolean

    language: string
    cartEnabled: boolean
    codEnabled: boolean
    orderIdPrefix: string
    minimumOrderAmountDzd: number
    hideOptionalAddress: boolean
    currencyCode: string
    currencyCountry: string
    isCompleted: boolean
    checklistDismissed: boolean
    allowedDeliveryProviders: string[]
    storePickupEnabled: boolean
    loyaltyEnabled: boolean
    loyaltyMinRedeemPoints: number
    loyaltyRedeemRateDzdPerPoint: number | string
    loyaltyBasePoints: number | string
    loyaltyMarginFactor: number | string
    salesInvoiceEnabled: boolean
    invoiceNumberPrefix: string
    invoiceFooterText: string | null
    invoiceShowLogo: boolean
    whatsappConfirmationTemplate: string | null
    legalPages: StoreLegalPagesConfig
    clearanceEnabled: boolean
    clearanceMultiple: number
    clearanceDivisor: number
    clearanceBannerEnabled: boolean
    clearanceBannerText: string | null
    blacklistEnabled: boolean
    duplicateOrderLimitEnabled: boolean
    duplicateOrderLimit: number
    duplicateOrderWindowHours: number
    maintenanceMode: boolean
    maintenanceMessage: string | null
}>

const toDecimalString = (value: unknown, field: string): string => {
    const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
    if (!Number.isFinite(n)) {
        throw new StoreSettingsValidationError(`${field} must be a valid number`)
    }
    return String(n)
}

export const sanitizeInvoiceNumberPrefix = (value: unknown): string => {
    const normalized = typeof value === 'string' ? value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) : ''
    return normalized || 'INV'
}

export class StoreSettingsService {
    async getOrCreate(tenantId: string) {
        return await prisma.storeSettings.upsert({
            where: { tenantId },
            create: { tenantId },
            update: {}
        })
    }

    async update(tenantId: string, input: StoreSettingsPatchInput) {
        const updateSettings: any = {}
        const updateTenant: any = {}

        // Tenant Name
        if (input.name !== undefined) {
            if (typeof input.name !== 'string' || input.name.trim().length === 0) {
                throw new StoreSettingsValidationError('Store Name cannot be empty')
            }
            updateTenant.name = input.name.trim()
        }

        // Tenant Slug
        if (input.slug !== undefined) {
            if (typeof input.slug !== 'string' || !/^[a-z0-9-]+$/.test(input.slug)) {
                throw new StoreSettingsValidationError('Slug must contain only lowercase letters, numbers, and hyphens')
            }

            // Check for uniqueness if changed
            if (input.slug) {
                const existing = await prisma.tenant.findUnique({ where: { slug: input.slug } })
                if (existing && existing.id !== tenantId) {
                    throw new StoreSettingsValidationError('This URL slug is already taken')
                }
            }
            updateTenant.slug = input.slug
        }

        // --- Store Settings Fields ---

        if (input.logoUrl !== undefined) {
            if (input.logoUrl !== null && typeof input.logoUrl !== 'string') {
                throw new StoreSettingsValidationError('logoUrl must be a string URL or null')
            }
            updateSettings.logoUrl = input.logoUrl
        }
 
        if (input.faviconUrl !== undefined) {
            if (input.faviconUrl !== null && typeof input.faviconUrl !== 'string') {
                throw new StoreSettingsValidationError('faviconUrl must be a string URL or null')
            }
            updateSettings.faviconUrl = input.faviconUrl
        }

        if (input.primaryColor !== undefined) {
            if (typeof input.primaryColor !== 'string' || !isHexColor(input.primaryColor)) {
                throw new StoreSettingsValidationError('primaryColor must be a hex color like #4F46E5')
            }
            updateSettings.primaryColor = input.primaryColor.toUpperCase()
        }

        if (input.useBrandColor !== undefined) {
            if (typeof input.useBrandColor !== 'boolean') {
                throw new StoreSettingsValidationError('useBrandColor must be a boolean')
            }
            updateSettings.useBrandColor = input.useBrandColor
        }

        if (input.templateKey !== undefined) {
            if (typeof input.templateKey !== 'string' || !isTemplateKey(input.templateKey)) {
                throw new StoreSettingsValidationError(
                    `templateKey must be one of: ${STORE_TEMPLATES.map((t) => t.key).join(', ')}`
                )
            }
            updateSettings.templateKey = input.templateKey
        }

        if (input.announcementText !== undefined) {
            // allow empty string to clear it
            if (typeof input.announcementText !== 'string') {
                throw new StoreSettingsValidationError('announcementText must be a string')
            }
            updateSettings.announcementText = input.announcementText
        }

        if (input.announcementScrolling !== undefined) {
            if (typeof input.announcementScrolling !== 'boolean') {
                throw new StoreSettingsValidationError('announcementScrolling must be a boolean')
            }
            updateSettings.announcementScrolling = input.announcementScrolling
        }

        if (input.language !== undefined) {
            if (typeof input.language !== 'string' || !isLanguage(input.language)) {
                throw new StoreSettingsValidationError(
                    `language must be one of: ${STORE_LANGUAGES.map((l) => l.key).join(', ')}`
                )
            }
            updateSettings.language = input.language
        }

        if (input.cartEnabled !== undefined) {
            if (typeof input.cartEnabled !== 'boolean') {
                throw new StoreSettingsValidationError('cartEnabled must be a boolean')
            }
            updateSettings.cartEnabled = input.cartEnabled
        }

        if (input.codEnabled !== undefined) {
            if (typeof input.codEnabled !== 'boolean') {
                throw new StoreSettingsValidationError('codEnabled must be a boolean')
            }
            updateSettings.codEnabled = input.codEnabled
        }

        if (input.orderIdPrefix !== undefined) {
            const orderIdPrefix = sanitizeOrderIdPrefix(input.orderIdPrefix)
            if (!isValidOrderIdPrefix(orderIdPrefix)) {
                throw new StoreSettingsValidationError('orderIdPrefix must be 4 to 5 uppercase letters or numbers')
            }
            updateSettings.orderIdPrefix = orderIdPrefix
        }

        if (input.minimumOrderAmountDzd !== undefined) {
            const minimumOrderAmountDzd = Math.trunc(Number(input.minimumOrderAmountDzd))
            if (!Number.isFinite(minimumOrderAmountDzd) || minimumOrderAmountDzd < 0) {
                throw new StoreSettingsValidationError('minimumOrderAmountDzd must be a non-negative integer')
            }
            updateSettings.minimumOrderAmountDzd = minimumOrderAmountDzd
        }

        if (input.hideOptionalAddress !== undefined) {
            if (typeof input.hideOptionalAddress !== 'boolean') {
                throw new StoreSettingsValidationError('hideOptionalAddress must be a boolean')
            }
            updateSettings.hideOptionalAddress = input.hideOptionalAddress
        }

        if (input.currencyCode !== undefined) {
            if (typeof input.currencyCode !== 'string' || !/^[A-Z]{3}$/.test(input.currencyCode)) {
                throw new StoreSettingsValidationError('currencyCode must be an ISO-4217 code (3 uppercase letters)')
            }
            updateSettings.currencyCode = input.currencyCode.toUpperCase()
        }

        if (input.currencyCountry !== undefined) {
            if (typeof input.currencyCountry !== 'string' || !/^[A-Z]{2}$/.test(input.currencyCountry)) {
                throw new StoreSettingsValidationError('currencyCountry must be an ISO-3166-1 alpha-2 code')
            }
            updateSettings.currencyCountry = input.currencyCountry.toUpperCase()
        }

        if (input.isCompleted !== undefined) {
            if (typeof input.isCompleted !== 'boolean') {
                throw new StoreSettingsValidationError('isCompleted must be a boolean')
            }
            updateSettings.isCompleted = input.isCompleted
        }

        if (input.checklistDismissed !== undefined) {
            if (typeof input.checklistDismissed !== 'boolean') {
                throw new StoreSettingsValidationError('checklistDismissed must be a boolean')
            }
            updateSettings.checklistDismissed = input.checklistDismissed
        }

        if (input.allowedDeliveryProviders !== undefined) {
            if (!Array.isArray(input.allowedDeliveryProviders) || !input.allowedDeliveryProviders.every(p => typeof p === 'string')) {
                throw new StoreSettingsValidationError('allowedDeliveryProviders must be an array of strings')
            }
            updateSettings.allowedDeliveryProviders = input.allowedDeliveryProviders
        }

        if (input.storePickupEnabled !== undefined) {
            if (typeof input.storePickupEnabled !== 'boolean') {
                throw new StoreSettingsValidationError('storePickupEnabled must be a boolean')
            }
            updateSettings.storePickupEnabled = input.storePickupEnabled
        }

        if (input.loyaltyEnabled !== undefined) {
            if (typeof input.loyaltyEnabled !== 'boolean') {
                throw new StoreSettingsValidationError('loyaltyEnabled must be a boolean')
            }
            updateSettings.loyaltyEnabled = input.loyaltyEnabled
        }

        if (input.loyaltyMinRedeemPoints !== undefined) {
            const minRedeemPoints = Math.trunc(Number(input.loyaltyMinRedeemPoints))
            if (!Number.isFinite(minRedeemPoints) || minRedeemPoints < 0) {
                throw new StoreSettingsValidationError('loyaltyMinRedeemPoints must be a non-negative integer')
            }
            updateSettings.loyaltyMinRedeemPoints = minRedeemPoints
        }

        if (input.loyaltyRedeemRateDzdPerPoint !== undefined) {
            const value = Number(input.loyaltyRedeemRateDzdPerPoint)
            if (!Number.isFinite(value) || value <= 0) {
                throw new StoreSettingsValidationError('loyaltyRedeemRateDzdPerPoint must be greater than 0')
            }
            updateSettings.loyaltyRedeemRateDzdPerPoint = new Prisma.Decimal(toDecimalString(value, 'loyaltyRedeemRateDzdPerPoint'))
        }

        if (input.loyaltyBasePoints !== undefined) {
            updateSettings.loyaltyBasePoints = new Prisma.Decimal(toDecimalString(input.loyaltyBasePoints, 'loyaltyBasePoints'))
        }

        if (input.loyaltyMarginFactor !== undefined) {
            updateSettings.loyaltyMarginFactor = new Prisma.Decimal(toDecimalString(input.loyaltyMarginFactor, 'loyaltyMarginFactor'))
        }

        if (input.salesInvoiceEnabled !== undefined) {
            if (typeof input.salesInvoiceEnabled !== 'boolean') {
                throw new StoreSettingsValidationError('salesInvoiceEnabled must be a boolean')
            }
            updateSettings.salesInvoiceEnabled = input.salesInvoiceEnabled
        }

        if (input.invoiceNumberPrefix !== undefined) {
            updateSettings.invoiceNumberPrefix = sanitizeInvoiceNumberPrefix(input.invoiceNumberPrefix)
        }

        if (input.invoiceFooterText !== undefined) {
            if (input.invoiceFooterText !== null && typeof input.invoiceFooterText !== 'string') {
                throw new StoreSettingsValidationError('invoiceFooterText must be a string or null')
            }
            const footerText = typeof input.invoiceFooterText === 'string' ? input.invoiceFooterText.trim() : ''
            if (footerText.length > 1000) {
                throw new StoreSettingsValidationError('invoiceFooterText is too long (max 1000 chars)')
            }
            updateSettings.invoiceFooterText = footerText || null
        }

        if (input.whatsappConfirmationTemplate !== undefined) {
            if (input.whatsappConfirmationTemplate !== null && typeof input.whatsappConfirmationTemplate !== 'string') {
                throw new StoreSettingsValidationError('whatsappConfirmationTemplate must be a string or null')
            }
            const templateText = typeof input.whatsappConfirmationTemplate === 'string' ? input.whatsappConfirmationTemplate.trim() : ''
            if (templateText.length > 2000) {
                throw new StoreSettingsValidationError('whatsappConfirmationTemplate is too long (max 2000 chars)')
            }
            updateSettings.whatsappConfirmationTemplate = templateText || null
        }

        if (input.invoiceShowLogo !== undefined) {
            if (typeof input.invoiceShowLogo !== 'boolean') {
                throw new StoreSettingsValidationError('invoiceShowLogo must be a boolean')
            }
            updateSettings.invoiceShowLogo = input.invoiceShowLogo
        }

        if (input.clearanceEnabled !== undefined) {
            if (typeof input.clearanceEnabled !== 'boolean') {
                throw new StoreSettingsValidationError('clearanceEnabled must be a boolean')
            }
            updateSettings.clearanceEnabled = input.clearanceEnabled
        }

        if (input.clearanceMultiple !== undefined) {
            const clearanceMultiple = Math.trunc(Number(input.clearanceMultiple))
            if (!Number.isFinite(clearanceMultiple) || clearanceMultiple < 1) {
                throw new StoreSettingsValidationError('clearanceMultiple must be a positive integer')
            }
            updateSettings.clearanceMultiple = clearanceMultiple
        }

        if (input.clearanceDivisor !== undefined) {
            const clearanceDivisor = Math.trunc(Number(input.clearanceDivisor))
            if (!Number.isFinite(clearanceDivisor) || clearanceDivisor < 1) {
                throw new StoreSettingsValidationError('clearanceDivisor must be a positive integer')
            }
            updateSettings.clearanceDivisor = clearanceDivisor
        }

        if (input.clearanceBannerEnabled !== undefined) {
            if (typeof input.clearanceBannerEnabled !== 'boolean') {
                throw new StoreSettingsValidationError('clearanceBannerEnabled must be a boolean')
            }
            updateSettings.clearanceBannerEnabled = input.clearanceBannerEnabled
        }

        if (input.clearanceBannerText !== undefined) {
            if (input.clearanceBannerText !== null && typeof input.clearanceBannerText !== 'string') {
                throw new StoreSettingsValidationError('clearanceBannerText must be a string or null')
            }
            const bannerText = typeof input.clearanceBannerText === 'string' ? input.clearanceBannerText.trim() : ''
            if (bannerText.length > 300) {
                throw new StoreSettingsValidationError('clearanceBannerText is too long (max 300 chars)')
            }
            updateSettings.clearanceBannerText = bannerText || null
        }

        if (input.blacklistEnabled !== undefined) {
            if (typeof input.blacklistEnabled !== 'boolean') {
                throw new StoreSettingsValidationError('blacklistEnabled must be a boolean')
            }
            updateSettings.blacklistEnabled = input.blacklistEnabled
        }

        if (input.duplicateOrderLimitEnabled !== undefined) {
            if (typeof input.duplicateOrderLimitEnabled !== 'boolean') {
                throw new StoreSettingsValidationError('duplicateOrderLimitEnabled must be a boolean')
            }
            updateSettings.duplicateOrderLimitEnabled = input.duplicateOrderLimitEnabled
        }

        if (input.duplicateOrderLimit !== undefined) {
            const duplicateOrderLimit = Math.trunc(Number(input.duplicateOrderLimit))
            if (!Number.isFinite(duplicateOrderLimit) || duplicateOrderLimit < 1) {
                throw new StoreSettingsValidationError('duplicateOrderLimit must be a positive integer')
            }
            updateSettings.duplicateOrderLimit = duplicateOrderLimit
        }

        if (input.duplicateOrderWindowHours !== undefined) {
            const duplicateOrderWindowHours = Math.trunc(Number(input.duplicateOrderWindowHours))
            if (!Number.isFinite(duplicateOrderWindowHours) || duplicateOrderWindowHours < 1) {
                throw new StoreSettingsValidationError('duplicateOrderWindowHours must be a positive integer')
            }
            updateSettings.duplicateOrderWindowHours = duplicateOrderWindowHours
        }

        if (input.maintenanceMode !== undefined) {
            if (typeof input.maintenanceMode !== 'boolean') {
                throw new StoreSettingsValidationError('maintenanceMode must be a boolean')
            }
            updateTenant.maintenanceMode = input.maintenanceMode
        }

        if (input.maintenanceMessage !== undefined) {
            if (input.maintenanceMessage !== null && typeof input.maintenanceMessage !== 'string') {
                throw new StoreSettingsValidationError('maintenanceMessage must be a string or null')
            }
            const maintenanceMessage = typeof input.maintenanceMessage === 'string' ? input.maintenanceMessage.trim() : ''
            if (maintenanceMessage.length > 300) {
                throw new StoreSettingsValidationError('maintenanceMessage is too long (max 300 chars)')
            }
            updateSettings.maintenanceMessage = maintenanceMessage || null
        }

        if (input.legalPages !== undefined) {
            if (!isValidStoreLegalPagesConfig(input.legalPages)) {
                throw new StoreSettingsValidationError(
                    'legalPages must include terms/privacy/returns/contact with enabled, title.{fr,en,ar} and content.{fr,en,ar}'
                )
            }
            updateSettings.legalPages = normalizeStoreLegalPagesConfig(input.legalPages) as unknown as Prisma.InputJsonValue
        }

        // Execute Transaction if tenant fields need updating
        if (Object.keys(updateTenant).length > 0) {
            const [updatedTenant, updatedSettings] = await prisma.$transaction([
                prisma.tenant.update({ where: { id: tenantId }, data: updateTenant }),
                prisma.storeSettings.upsert({
                    where: { tenantId },
                    create: { tenantId, ...updateSettings },
                    update: updateSettings
                })
            ])
            return {
                ...updatedSettings,
                name: updatedTenant.name,
                slug: updatedTenant.slug,
                maintenanceMode: updatedTenant.maintenanceMode
            }
        }

        // Just update settings
        const s = await prisma.storeSettings.upsert({
            where: { tenantId },
            create: { tenantId, ...updateSettings },
            update: updateSettings
        })

        // We need to fetch tenant data to return consistent shape
        const t = await prisma.tenant.findUnique({ where: { id: tenantId } })
        return { ...s, name: t?.name, slug: t?.slug, maintenanceMode: t?.maintenanceMode ?? false }
    }

    async clearanceAppliesToAllProducts(tenantId: string): Promise<boolean> {
        const taggedCount = await prisma.product.count({ where: { tenantId, isClearance: true } })
        return taggedCount === 0
    }

    async getOnboardingChecklist(tenantId: string) {
        const [settings, tenant, productCount, categoryCount] = await Promise.all([
            prisma.storeSettings.findUnique({ where: { tenantId } }),
            prisma.tenant.findUnique({ where: { id: tenantId } }),
            prisma.product.count({ where: { tenantId } }),
            prisma.category.count({ where: { tenantId } })
        ])

        if (!tenant) {
            throw new Error(`Tenant not found: ${tenantId}`)
        }

        const hasLogo = settings?.logoUrl != null
        const hasProducts = productCount > 0
        const hasCategories = categoryCount > 0
        const hasDelivery = (settings?.allowedDeliveryProviders ?? []).some(
            (p: string) => ['MAYSTRO', 'YALIDINE'].includes(p)
        )
        const isPublished = tenant?.isOffline === false
        const checklistDismissed = settings?.checklistDismissed ?? false

        return { hasLogo, hasProducts, hasCategories, hasDelivery, isPublished, checklistDismissed }
    }

    async publishStore(tenantId: string) {
        await prisma.tenant.update({
            where: { id: tenantId },
            data: { isOffline: false }
        })
    }

    buildFrontendAgentSummary(args: {
        tenant: { id: string; slug: string; name: string }
        settings: {
            logoUrl: string | null
            faviconUrl: string | null
            primaryColor: string
            useBrandColor?: boolean
            templateKey: string
            announcementText: string | null
            announcementScrolling: boolean
            language: string
            cartEnabled: boolean
            codEnabled: boolean
            minimumOrderAmountDzd: number
            hideOptionalAddress: boolean
            currencyCode: string
            currencyCountry: string
            orderIdPrefix: string
        }
        apiBasePath?: string
    }): { markdown: string; data: any } {
        const apiBasePath = args.apiBasePath ?? '/api'
        const tenantHostHint = `${args.tenant.slug}.swekly.com (or ${args.tenant.slug}.localhost in dev)`

        const data = {
            tenant: args.tenant,
            storeSettings: args.settings,
            templates: STORE_TEMPLATES,

            languages: STORE_LANGUAGES,
            api: {
                basePath: apiBasePath,
                public: {
                    storeSettings: `${apiBasePath}/store/settings`,
                    products: `${apiBasePath}/products`,
                    categories: `${apiBasePath}/categories`,
                    checkout: `${apiBasePath}/orders (POST)`
                },
                admin: {
                    storeSettings: `${apiBasePath}/admin/store-settings`,
                    agentSummary: `${apiBasePath}/admin/store-settings/agent-summary`
                }
            }
        }

        const markdown = [
            `# Frontend Store Brief (Tenant: ${args.tenant.name})`,
            ``,
            `## Tenant`,
            `- Name: ${args.tenant.name}`,
            `- Slug: ${args.tenant.slug}`,
            `- Host resolution: ${tenantHostHint}`,
            ``,
            `## Store Settings (Chosen)`,
            `- Template: ${args.settings.templateKey}`,
            `- Logo: ${args.settings.logoUrl ? args.settings.logoUrl : '(none)'}`,
            `- Favicon: ${args.settings.faviconUrl ? args.settings.faviconUrl : '(none)'}`,
            `- Primary color: ${args.settings.primaryColor}`,
            `- Apply brand color to template: ${args.settings.useBrandColor ? 'yes' : 'no'}`,
            `- Announcement: ${args.settings.announcementText ? `"${args.settings.announcementText}"` : '(none)'} (scrolling: ${args.settings.announcementScrolling})`,
            `- Language: ${args.settings.language}`,
            `- Cart + checkout enabled: ${args.settings.cartEnabled ? 'yes' : 'no'}`,
            `- Product page COD form: ${args.settings.codEnabled ? 'enabled' : 'disabled'}`,
            `- Customer order prefix: ${args.settings.orderIdPrefix}`,
            `- Minimum order amount: ${args.settings.minimumOrderAmountDzd} DZD`,
            `- Hide optional address at checkout: ${args.settings.hideOptionalAddress ? 'yes' : 'no'}`,
            `- Currency: ${args.settings.currencyCode} (${args.settings.currencyCountry})`,
            ``,
            `## What to Implement`,
            `1) Render storefront using the selected template.`,
            `2) Apply primary color as a CSS variable (e.g. --brand) for buttons/links/accents.`,
            `3) Show prices with the configured currency code (${args.settings.currencyCode}).`,
            `4) If cartEnabled is false, hide cart/checkout entry points.`,
            `5) If codEnabled is true, surface a COD option at checkout.`,
            `6) Enforce the minimum order amount (${args.settings.minimumOrderAmountDzd} DZD) before order submission.`,
            `7) If hideOptionalAddress is true, hide the optional address field in checkout forms.`,
            `8) If language is "ar", consider RTL layout and Arabic-friendly typography.`,
            ``,
            `## Backend API (Tenant-scoped)`,
            `- Public store settings: GET ${data.api.public.storeSettings}`,
            `- Products: GET ${data.api.public.products}`,
            `- Categories: GET ${data.api.public.categories}`,
            `- Checkout (COD): POST ${apiBasePath}/orders`,
            ``,
            `## Admin API (Auth)`,
            `- Store settings: GET/PATCH ${data.api.admin.storeSettings}`,
            `- Summary export: GET ${data.api.admin.agentSummary}`
        ].join('\n')

        return { markdown, data }
    }
}
