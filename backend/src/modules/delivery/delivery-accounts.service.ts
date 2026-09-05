import { randomBytes } from 'node:crypto'
import type { PrismaClient, ShipmentProvider, TenantDeliveryAccount } from '@prisma/client'
import prisma from '../../lib/prisma'
import { DELIVERY_PROVIDER_CATALOG, getProviderCatalogItem } from './catalog'
import { MaystroHooksService } from './maystro/maystro-hooks.service'

// Keys managed by the system (auto-generated) that must survive user credential updates.
const SYSTEM_MANAGED_KEYS = new Set(['webhookSecret'])

export class DeliveryAccountsValidationError extends Error {
    statusCode = 400
    statusMessage: string

    constructor(statusMessage: string) {
        super(statusMessage)
        this.statusMessage = statusMessage
    }
}

type ProviderAccountUpsertInput = {
    offered?: boolean
    isActive?: boolean
    config?: Record<string, unknown> | null
}

type ProviderAccountPublic = {
    isActive: boolean
    updatedAt: Date
    config: Record<string, unknown>
    secrets: Record<string, boolean>
}

export type DeliveryProviderAdminView = {
    provider: ShipmentProvider
    name: string
    supports: {
        quote: boolean
        createShipment: boolean
        track: boolean
        webhooks: boolean
    }
    credentialFields: { key: string; label: string; required: boolean; secret: boolean }[]
    offered: boolean
    account: ProviderAccountPublic | null
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value)

const normalizeConfigUpdate = (value: unknown): Record<string, unknown> => {
    if (value == null) return {}
    if (!isRecord(value)) throw new DeliveryAccountsValidationError('config must be an object')
    return value
}

const applyConfigPatch = (existing: Record<string, unknown>, patch: Record<string, unknown>) => {
    const next = { ...existing }
    for (const [key, rawValue] of Object.entries(patch)) {
        if (rawValue === null || rawValue === undefined || rawValue === '') {
            delete next[key]
            continue
        }
        next[key] = rawValue
    }
    return next
}

const pickAllowedKeys = (provider: ShipmentProvider, config: Record<string, unknown>) => {
    const allowedKeys = new Set(getProviderCatalogItem(provider).credentialFields.map((f) => f.key))
    if (provider === 'MAYSTRO') allowedKeys.add('apiKey') // legacy alias for apiToken
    const picked: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(config)) {
        if (!allowedKeys.has(key)) continue
        picked[key] = value
    }
    return picked
}

const normalizeProviderConfigPatch = (provider: ShipmentProvider, patch: Record<string, unknown>) => {
    const allowedKeys = new Set(getProviderCatalogItem(provider).credentialFields.map((f) => f.key))
    if (provider === 'MAYSTRO') allowedKeys.add('apiKey') // legacy alias for apiToken
    const normalized: Record<string, unknown> = {}

    for (const [key, rawValue] of Object.entries(patch)) {
        if (!allowedKeys.has(key)) continue

        if (rawValue === null || rawValue === undefined || rawValue === '') {
            normalized[key] = rawValue
            continue
        }

        // Allow boolean flags for specific providers.
        if (key === 'inventorySyncEnabled' && typeof rawValue === 'boolean') {
            normalized[key] = rawValue
            continue
        }

        if (typeof rawValue !== 'string') {
            throw new DeliveryAccountsValidationError(`${key} must be a string`)
        }

        const trimmed = rawValue.trim()
        normalized[key] = trimmed.length ? trimmed : ''
    }

    return normalized
}

const toPublicAccount = (provider: ShipmentProvider, account: TenantDeliveryAccount): ProviderAccountPublic => {
    const item = getProviderCatalogItem(provider)
    const raw = isRecord(account.config) ? account.config : {}

    const config: Record<string, unknown> = {}
    const secrets: Record<string, boolean> = {}

    for (const field of item.credentialFields) {
        const value =
            provider === 'MAYSTRO' && field.key === 'apiToken'
                ? (raw.apiToken ?? raw.apiKey)
                : raw[field.key]
        if (field.secret) {
            secrets[field.key] = typeof value === 'string' ? value.trim().length > 0 : value != null
        } else if (value !== undefined) {
            config[field.key] = value
        }
    }

    return {
        isActive: account.isActive,
        updatedAt: account.updatedAt,
        config,
        secrets
    }
}

const assertRequiredConfig = (provider: ShipmentProvider, config: Record<string, unknown>) => {
    const item = getProviderCatalogItem(provider)
    const missing = item.credentialFields
        .filter((f) => f.required)
        .filter((f) => {
            const value =
                provider === 'MAYSTRO' && f.key === 'apiToken'
                    ? (config.apiToken ?? (config as any).apiKey)
                    : config[f.key]
            if (typeof value === 'string') return value.trim().length === 0
            return value == null
        })
        .map((f) => f.key)

    if (missing.length > 0) {
        throw new DeliveryAccountsValidationError(`Missing required credentials: ${missing.join(', ')}`)
    }
}

export class DeliveryAccountsService {
    private prisma: PrismaClient

    constructor(client: PrismaClient = prisma) {
        this.prisma = client
    }

    async listProviders(tenantId: string): Promise<DeliveryProviderAdminView[]> {
        const [settings, accounts] = await this.prisma.$transaction([
            this.prisma.storeSettings.upsert({
                where: { tenantId },
                create: { tenantId },
                update: {},
                select: { allowedDeliveryProviders: true }
            }),
            this.prisma.tenantDeliveryAccount.findMany({
                where: { tenantId }
            })
        ])

        const offeredSet = new Set(settings.allowedDeliveryProviders)
        const accountByProvider = new Map<ShipmentProvider, TenantDeliveryAccount>()
        accounts.forEach((a) => accountByProvider.set(a.provider, a))

        return DELIVERY_PROVIDER_CATALOG.map((item) => {
            const account = accountByProvider.get(item.provider)
            return {
                provider: item.provider,
                name: item.name,
                supports: item.supports,
                credentialFields: item.credentialFields,
                offered: offeredSet.has(item.provider),
                account: account ? toPublicAccount(item.provider, account) : null
            }
        })
    }

    async upsertProviderAccount(tenantId: string, provider: ShipmentProvider, input: ProviderAccountUpsertInput) {
        getProviderCatalogItem(provider)

        const storeSettings = await this.prisma.storeSettings.upsert({
            where: { tenantId },
            create: { tenantId },
            update: {}
        })

        const existingAccount = await this.prisma.tenantDeliveryAccount.findUnique({
            where: { tenantId_provider: { tenantId, provider } }
        })

        const allowedKeys = new Set(getProviderCatalogItem(provider).credentialFields.map((f) => f.key))
        if (provider === 'MAYSTRO') allowedKeys.add('apiKey') // legacy alias for apiToken
        const rawExistingConfig = isRecord(existingAccount?.config) ? existingAccount!.config : {}
        const existingConfig =
            provider === 'MAYSTRO' && typeof (rawExistingConfig as any).apiToken !== 'string'
                ? { ...rawExistingConfig, apiToken: (rawExistingConfig as any).apiKey }
                : rawExistingConfig
        const patch =
            input.config === null
                ? null
                : normalizeProviderConfigPatch(provider, pickAllowedKeys(provider, normalizeConfigUpdate(input.config)))

        if (provider === 'MAYSTRO' && patch && (patch.apiToken === '' || patch.apiToken == null)) {
            (patch as any).apiKey = ''
        }

        // Carry forward system-managed keys (e.g. webhookSecret) regardless of what the user sends.
        const systemPreserved = Object.fromEntries(
            Object.entries(rawExistingConfig).filter(([k]) => SYSTEM_MANAGED_KEYS.has(k))
        )

        const nextConfig =
            patch === null
                ? { ...systemPreserved }
                : {
                    ...applyConfigPatch(
                        Object.fromEntries(Object.entries(existingConfig).filter(([k]) => allowedKeys.has(k))),
                        patch
                    ),
                    ...systemPreserved
                  }

        const configUpdate =
            input.config === undefined ? undefined : Object.keys(nextConfig).length ? nextConfig : null

        const isActive = input.isActive ?? existingAccount?.isActive ?? false
        if (isActive) assertRequiredConfig(provider, nextConfig)

        const currentAllowed = new Set(storeSettings.allowedDeliveryProviders)
        if (typeof input.offered === 'boolean') {
            if (input.offered) currentAllowed.add(provider)
            else currentAllowed.delete(provider)
        }
        const nextAllowed = Array.from(currentAllowed)

        const ops: Parameters<PrismaClient['$transaction']>[0] = []

        if (typeof input.offered === 'boolean') {
            ops.push(
                this.prisma.storeSettings.update({
                    where: { tenantId },
                    data: { allowedDeliveryProviders: nextAllowed }
                })
            )
        }

        const shouldUpsertAccount = input.config !== undefined || input.isActive !== undefined || existingAccount != null
        if (shouldUpsertAccount) {
            ops.push(
                this.prisma.tenantDeliveryAccount.upsert({
                    where: { tenantId_provider: { tenantId, provider } },
                    create: {
                        tenantId,
                        provider,
                        isActive,
                        config: configUpdate
                    },
                    update: {
                        isActive,
                        config: configUpdate
                    }
                })
            )
        }

        if (ops.length) {
            await this.prisma.$transaction(ops)
        }

        // Auto-register Maystro webhook when credentials are activated.
        // Best-effort: a failure here must not block the credential save.
        if (provider === 'MAYSTRO' && isActive && Object.keys(nextConfig).length > 0) {
            try {
                await this.ensureMaystroWebhookRegistered(tenantId, nextConfig)
            } catch (err) {
                console.warn('[delivery-accounts] Maystro webhook auto-registration failed:', err)
            }
        }

        const updated = await this.listProviders(tenantId)
        return updated.find((p) => p.provider === provider) ?? updated
    }

    private async ensureMaystroWebhookRegistered(tenantId: string, config: Record<string, unknown>) {
        const apiToken =
            typeof config.apiToken === 'string' ? config.apiToken.trim() :
            typeof config.apiKey === 'string' ? config.apiKey.trim() : ''
        if (!apiToken) return

        const platformDomain = (process.env.PLATFORM_BASE_DOMAIN ?? process.env.PLATFORM_DOMAIN ?? '').trim()
        if (!platformDomain) {
            console.warn(`[delivery-accounts] Maystro webhook registration skipped: PLATFORM_BASE_DOMAIN not configured.`)
            return  // not configured — skip silently
        }

        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { slug: true, domains: { take: 1, select: { domain: true } } }
        })
        if (!tenant) return

        const host = tenant.domains[0]?.domain?.trim() || `${tenant.slug}.${platformDomain}`

        // Generate a per-tenant secret if not already stored.
        // Receiver prefers X-Webhook-Secret and still accepts ?secret=... as legacy fallback.
        let webhookSecret = typeof config.webhookSecret === 'string' ? config.webhookSecret : ''
        if (!webhookSecret) {
            webhookSecret = randomBytes(32).toString('hex')
            await this.prisma.tenantDeliveryAccount.update({
                where: { tenantId_provider: { tenantId, provider: 'MAYSTRO' } },
                data: { config: { ...config, webhookSecret } }
            })
        }

        const webhookUrl = `https://${host}/api/webhooks/maystro?secret=${webhookSecret}`

        const hooks = new MaystroHooksService()

        // 'OrderStatusChanged' no longer exists in Maystro's trigger type list, and the 'all'
        // catch-all trigger does not reliably fire for order status/field changes in practice
        // (confirmed zero webhook deliveries across months of production use while registered
        // under 'all'). Register the specific event types instead.
        const desiredTriggerNames = ['OrderFieldUpdated', 'OrderDelivered', 'DeliveryInfoUpdated']

        const types = await hooks.listTypes({ apiToken })
        const targetTypes = desiredTriggerNames
            .map((name) => types.find((t) => String(t.name ?? t.code ?? '').toLowerCase() === name.toLowerCase()))
            .filter((t): t is NonNullable<typeof t> => Boolean(t))

        if (targetTypes.length === 0) {
            console.warn(`[delivery-accounts] Maystro webhook registration skipped: No suitable trigger types found in API.`)
            return
        }

        const existing = await hooks.listHooks({ apiToken })

        const registeredTriggerNamesForUrl = new Set(
            existing
                .filter((h) => h.endpoint === webhookUrl)
                .map((h) => String(h.trigger_type?.name ?? '').toLowerCase())
        )

        // Remove stale registrations pointing to our host: wrong/old secret, or the previous
        // unreliable 'all'/'OrderStatusChanged' registration this replaces.
        for (const h of existing) {
            const url = typeof h.endpoint === 'string' ? h.endpoint : ''
            if (!url.includes(`${host}/api/webhooks/maystro`)) continue
            const triggerName = String(h.trigger_type?.name ?? '').toLowerCase()
            const isDesired = url === webhookUrl && desiredTriggerNames.some((n) => n.toLowerCase() === triggerName)
            if (isDesired) continue
            try {
                await hooks.deleteHook({ apiToken, id: h.id })
                console.log(`[delivery-accounts] Removed stale Maystro webhook (${triggerName || 'unknown'}) for tenant ${tenantId}`)
            } catch {
                // best-effort: log but don't block registration
            }
        }

        for (const type of targetTypes) {
            const name = String(type.name ?? type.code ?? '').toLowerCase()
            if (registeredTriggerNamesForUrl.has(name)) continue
            await hooks.createHook({ apiToken, endpoint: webhookUrl, triggerTypeId: type.id })
            console.log(`[delivery-accounts] Maystro webhook (${type.name || type.code || type.id}) registered for tenant ${tenantId}`)
        }
    }
}
