import prisma from '../../lib/prisma'

export type StoreTemplateKey = 'classic' | 'modern'
export type StoreLanguage = 'ar' | 'fr' | 'en'
export type StoreFontFamily = 'Inter' | 'Cairo' | 'Poppins' | 'Tajawal'

export const STORE_TEMPLATES: { key: StoreTemplateKey; label: string; description: string }[] = [
    { key: 'classic', label: 'Classic', description: 'Clean layout, ideal for most stores.' },
    { key: 'modern', label: 'Modern', description: 'Bolder typography and more visual spacing.' }
]

export const STORE_LANGUAGES: { key: StoreLanguage; label: string }[] = [
    { key: 'ar', label: 'Arabic (AR)' },
    { key: 'fr', label: 'French (FR)' },
    { key: 'en', label: 'English (EN)' }
]

export const STORE_FONTS: { key: StoreFontFamily; label: string }[] = [
    { key: 'Inter', label: 'Inter' },
    { key: 'Cairo', label: 'Cairo' },
    { key: 'Poppins', label: 'Poppins' },
    { key: 'Tajawal', label: 'Tajawal' }
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

const isFontFamily = (value: string): value is StoreFontFamily => STORE_FONTS.some((f) => f.key === value)

export type StoreSettingsPatchInput = Partial<{
    primaryColor: string
    templateKey: string
    fontFamily: string
    language: string
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

        if (input.fontFamily !== undefined) {
            if (typeof input.fontFamily !== 'string' || !isFontFamily(input.fontFamily)) {
                throw new StoreSettingsValidationError(
                    `fontFamily must be one of: ${STORE_FONTS.map((f) => f.key).join(', ')}`
                )
            }
            update.fontFamily = input.fontFamily
        }

        if (input.language !== undefined) {
            if (typeof input.language !== 'string' || !isLanguage(input.language)) {
                throw new StoreSettingsValidationError(
                    `language must be one of: ${STORE_LANGUAGES.map((l) => l.key).join(', ')}`
                )
            }
            update.language = input.language
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
        settings: { primaryColor: string; templateKey: string; fontFamily: string; language: string }
        apiBasePath?: string
    }): { markdown: string; data: any } {
        const apiBasePath = args.apiBasePath ?? '/api'
        const tenantHostHint = `${args.tenant.slug}.platform.com (or ${args.tenant.slug}.localhost in dev)`

        const data = {
            tenant: args.tenant,
            storeSettings: args.settings,
            templates: STORE_TEMPLATES,
            fonts: STORE_FONTS,
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
            `- Font: ${args.settings.fontFamily}`,
            `- Language: ${args.settings.language}`,
            ``,
            `## What to Implement`,
            `1) Render storefront using the selected template.`,
            `2) Apply primary color as a CSS variable (e.g. --brand) for buttons/links/accents.`,
            `3) Apply fontFamily globally (store layout + template).`,
            `4) If language is "ar", consider RTL layout and Arabic-friendly typography.`,
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

