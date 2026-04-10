import type { PrismaClient, TenantDeliveryAccount } from '@prisma/client'
import prisma from '../../../lib/prisma'
import { MaystroIntegrationError } from './maystro.errors'

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value)

export type MaystroCredentials = {
    apiToken: string
    storeId: string
    inventorySyncEnabled: boolean
}

export const getMaystroCredentials = async (
    tenantId: string,
    client: PrismaClient = prisma
): Promise<MaystroCredentials> => {
    const account = await client.tenantDeliveryAccount.findUnique({
        where: { tenantId_provider: { tenantId, provider: 'MAYSTRO' } }
    })

    if (!account || !account.isActive) {
        throw new MaystroIntegrationError({
            statusCode: 400,
            statusMessage: 'Maystro credentials are not configured'
        })
    }

    const raw = isRecord(account.config) ? account.config : {}
    const apiToken =
        typeof raw.apiToken === 'string'
            ? raw.apiToken.trim()
            : typeof raw.apiKey === 'string'
                ? raw.apiKey.trim()
                : ''
    const storeId = typeof raw.storeId === 'string' ? raw.storeId.trim() : ''
    const inventorySyncEnabled = raw.inventorySyncEnabled === true

    if (!apiToken || !storeId) {
        throw new MaystroIntegrationError({
            statusCode: 400,
            statusMessage: 'Maystro credentials are not configured'
        })
    }

    return { apiToken, storeId, inventorySyncEnabled }
}

export const redactMaystroCredentials = (account: TenantDeliveryAccount | null) => {
    if (!account) return null
    const raw = isRecord(account.config) ? account.config : {}
    return {
        ...account,
        config: {
            storeId: typeof raw.storeId === 'string' ? raw.storeId : undefined,
            inventorySyncEnabled: raw.inventorySyncEnabled === true ? true : undefined,
            apiToken: raw.apiToken ? '[REDACTED]' : undefined
        }
    }
}
