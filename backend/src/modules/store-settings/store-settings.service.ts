import prisma from '../../lib/prisma'

export type StoreTemplateKey = 'classic' | 'modern'
export type StoreLanguage = 'ar' | 'fr' | 'en'


export const STORE_TEMPLATES: { key: StoreTemplateKey; label: string; description: string }[] = [
    { key: 'classic', label: 'Classic', description: 'Clean layout, ideal for most stores.' },
    { key: 'modern', label: 'Modern', description: 'Bolder typography and more visual spacing.' }
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
    primaryColor: string
    templateKey: string

    language: string
    cartEnabled: boolean
    codEnabled: boolean
    currencyCode: string
    currencyCountry: string
    isCompleted: boolean
}>

export class StoreSettingsService {
    async getOrCreate(tenantId: string) {
        return await prisma.storeSettings.upsert({
            where: { tenantId },
            create: { tenantId },
            update: {}
        })
    }

    async update(tenantId: string, input: StoreSettingsPatchInput) {
        const update: any = {}

        if (input.primaryColor !== undefined) {
            if (typeof input.primaryColor !== 'string' || !isHexColor(input.primaryColor)) {
                throw new StoreSettingsValidationError('primaryColor must be a hex color like #4F46E5')
            }
            update.primaryColor = input.primaryColor.toUpperCase()
        }

        if (input.templateKey !== undefined) {
            if (typeof input.templateKey !== 'string' || !isTemplateKey(input.templateKey)) {
                throw new StoreSettingsValidationError(
                    `templateKey must be one of: ${STORE_TEMPLATES.map((t) => t.key).join(', ')}`
                )
            }
            update.templateKey = input.templateKey
        }



        if (input.language !== undefined) {
            if (typeof input.language !== 'string' || !isLanguage(input.language)) {
                throw new StoreSettingsValidationError(
                    `language must be one of: ${STORE_LANGUAGES.map((l) => l.key).join(', ')}`
                )
            }
            update.language = input.language
        }

        if (input.cartEnabled !== undefined) {
            if (typeof input.cartEnabled !== 'boolean') {
                throw new StoreSettingsValidationError('cartEnabled must be a boolean')
            }
            update.cartEnabled = input.cartEnabled
        }

        if (input.codEnabled !== undefined) {
            if (typeof input.codEnabled !== 'boolean') {
                throw new StoreSettingsValidationError('codEnabled must be a boolean')
            }
            update.codEnabled = input.codEnabled
        }

        if (input.currencyCode !== undefined) {
            if (typeof input.currencyCode !== 'string' || !/^[A-Z]{3}$/.test(input.currencyCode)) {
                throw new StoreSettingsValidationError('currencyCode must be an ISO-4217 code (3 uppercase letters)')
            }
            update.currencyCode = input.currencyCode.toUpperCase()
        }

        if (input.currencyCountry !== undefined) {
            if (typeof input.currencyCountry !== 'string' || !/^[A-Z]{2}$/.test(input.currencyCountry)) {
                throw new StoreSettingsValidationError('currencyCountry must be an ISO-3166-1 alpha-2 code')
            }
            update.currencyCountry = input.currencyCountry.toUpperCase()
        }

        if (input.isCompleted !== undefined) {
            if (typeof input.isCompleted !== 'boolean') {
                throw new StoreSettingsValidationError('isCompleted must be a boolean')
            }
            update.isCompleted = input.isCompleted
        }

        return await prisma.storeSettings.upsert({
            where: { tenantId },
            create: { tenantId, ...update },
            update
        })
    }

    buildFrontendAgentSummary(args: {
        tenant: { id: string; slug: string; name: string }
        settings: {
            primaryColor: string
            templateKey: string
            language: string
            cartEnabled: boolean
            codEnabled: boolean
            currencyCode: string
            currencyCountry: string
        }
        apiBasePath?: string
    }): { markdown: string; data: any } {
        const apiBasePath = args.apiBasePath ?? '/api'
        const tenantHostHint = `${args.tenant.slug}.platform.com (or ${args.tenant.slug}.localhost in dev)`

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
            `- Primary color: ${args.settings.primaryColor}`,
            `- Language: ${args.settings.language}`,
            `- Cart + checkout enabled: ${args.settings.cartEnabled ? 'yes' : 'no'}`,
            `- Product page COD form: ${args.settings.codEnabled ? 'enabled' : 'disabled'}`,
            `- Currency: ${args.settings.currencyCode} (${args.settings.currencyCountry})`,
            ``,
            `## What to Implement`,
            `1) Render storefront using the selected template.`,
            `2) Apply primary color as a CSS variable (e.g. --brand) for buttons/links/accents.`,
            `3) Show prices with the configured currency code (${args.settings.currencyCode}).`,
            `4) If cartEnabled is false, hide cart/checkout entry points.`,
            `5) If codEnabled is true, surface a COD option at checkout.`,
            `6) If language is "ar", consider RTL layout and Arabic-friendly typography.`,
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
