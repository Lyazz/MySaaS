import type { PrismaClient, ShipmentProvider, TenantDeliveryAccount } from '@prisma/client'
import prisma from '../../lib/prisma'
import { DELIVERY_PROVIDER_CATALOG, getProviderCatalogItem } from './catalog'

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
    const picked: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(config)) {
        if (!allowedKeys.has(key)) continue
        picked[key] = value
    }
    return picked
}

const normalizeProviderConfigPatch = (provider: ShipmentProvider, patch: Record<string, unknown>) => {
    const allowedKeys = new Set(getProviderCatalogItem(provider).credentialFields.map((f) => f.key))
    const normalized: Record<string, unknown> = {}

    for (const [key, rawValue] of Object.entries(patch)) {
        if (!allowedKeys.has(key)) continue

        if (rawValue === null || rawValue === undefined || rawValue === '') {
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
        const value = raw[field.key]
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
            const value = config[f.key]
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
        const existingConfig = isRecord(existingAccount?.config) ? existingAccount!.config : {}
        const patch =
            input.config === null
                ? null
                : normalizeProviderConfigPatch(provider, pickAllowedKeys(provider, normalizeConfigUpdate(input.config)))

        const nextConfig =
            patch === null
                ? {}
                : applyConfigPatch(
                    Object.fromEntries(Object.entries(existingConfig).filter(([k]) => allowedKeys.has(k))),
                    patch
                )

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

        const updated = await this.listProviders(tenantId)
        return updated.find((p) => p.provider === provider) ?? updated
    }
}
