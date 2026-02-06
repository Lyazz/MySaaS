import prisma from '../../lib/prisma'

export class MetaPixelValidationError extends Error {
    statusCode: number
    statusMessage: string

    constructor(statusCode: number, statusMessage: string) {
        super(statusMessage)
        this.statusCode = statusCode
        this.statusMessage = statusMessage
    }
}

const normalizePixelId = (value: unknown): string => {
    const s = typeof value === 'string' ? value.trim() : ''
    if (!s) return ''
    if (!/^[0-9]+$/.test(s)) return ''
    return s
}

export type MetaPixelRecord = {
    id: string
    name: string | null
    pixelId: string
    isActive: boolean
    isGlobal: boolean
    createdAt: Date
    updatedAt: Date
    productsCount?: number
}

export class MetaPixelsService {
    async list(tenantId: string): Promise<MetaPixelRecord[]> {
        await this.backfillFromLegacyIntegrationIfNeeded(tenantId)

        const pixels = await prisma.tenantMetaPixel.findMany({
            where: { tenantId },
            orderBy: [{ isGlobal: 'desc' }, { createdAt: 'desc' }]
        })

        const counts = await prisma.productMetaPixel.groupBy({
            by: ['metaPixelId'],
            where: { tenantId },
            _count: { _all: true }
        })
        const countMap = new Map(counts.map((c) => [c.metaPixelId, c._count._all]))

        return pixels.map((p) => ({ ...p, productsCount: countMap.get(p.id) ?? 0 }))
    }

    async create(tenantId: string, input: any): Promise<MetaPixelRecord> {
        const pixelId = normalizePixelId(input?.pixelId)
        if (!pixelId) throw new MetaPixelValidationError(400, 'pixelId is required and must be numeric')

        const name = typeof input?.name === 'string' ? input.name.trim() || null : null
        const isActive = input?.isActive !== undefined ? Boolean(input.isActive) : true
        const isGlobal = Boolean(input?.isGlobal)

        try {
            return await prisma.$transaction(async (tx) => {
                if (isGlobal) {
                    await tx.tenantMetaPixel.updateMany({ where: { tenantId }, data: { isGlobal: false } })
                }

                return tx.tenantMetaPixel.create({
                    data: { tenantId, pixelId, name, isActive, isGlobal }
                })
            })
        } catch (e: any) {
            if (String(e?.message || '').includes('TenantMetaPixel_tenantId_pixelId_key')) {
                throw new MetaPixelValidationError(409, 'A pixel with this pixelId already exists')
            }
            throw e
        }
    }

    async update(tenantId: string, id: string, input: any): Promise<MetaPixelRecord> {
        const existing = await prisma.tenantMetaPixel.findFirst({ where: { tenantId, id } })
        if (!existing) throw new MetaPixelValidationError(404, 'Meta pixel not found')

        const pixelIdRaw = input?.pixelId !== undefined ? normalizePixelId(input.pixelId) : undefined
        if (input?.pixelId !== undefined && !pixelIdRaw) throw new MetaPixelValidationError(400, 'pixelId must be numeric')

        const name = input?.name !== undefined ? (typeof input.name === 'string' ? input.name.trim() || null : null) : undefined
        const isActive = input?.isActive !== undefined ? Boolean(input.isActive) : undefined
        const isGlobal = input?.isGlobal !== undefined ? Boolean(input.isGlobal) : undefined

        try {
            return await prisma.$transaction(async (tx) => {
                if (isGlobal) {
                    await tx.tenantMetaPixel.updateMany({ where: { tenantId }, data: { isGlobal: false } })
                }

                await tx.tenantMetaPixel.updateMany({
                    where: { tenantId, id },
                    data: {
                        pixelId: pixelIdRaw,
                        name,
                        isActive,
                        isGlobal
                    }
                })

                const updated = await tx.tenantMetaPixel.findFirst({ where: { tenantId, id } })
                if (!updated) throw new MetaPixelValidationError(404, 'Meta pixel not found')
                return updated
            })
        } catch (e: any) {
            if (String(e?.message || '').includes('TenantMetaPixel_tenantId_pixelId_key')) {
                throw new MetaPixelValidationError(409, 'A pixel with this pixelId already exists')
            }
            throw e
        }
    }

    async delete(tenantId: string, id: string) {
        const existing = await prisma.tenantMetaPixel.findFirst({ where: { tenantId, id } })
        if (!existing) throw new MetaPixelValidationError(404, 'Meta pixel not found')

        await prisma.tenantMetaPixel.deleteMany({ where: { tenantId, id } })
        return { success: true }
    }

    async setGlobal(tenantId: string, id: string) {
        const existing = await prisma.tenantMetaPixel.findFirst({ where: { tenantId, id } })
        if (!existing) throw new MetaPixelValidationError(404, 'Meta pixel not found')

        await prisma.$transaction(async (tx) => {
            await tx.tenantMetaPixel.updateMany({ where: { tenantId }, data: { isGlobal: false } })
            await tx.tenantMetaPixel.updateMany({ where: { tenantId, id }, data: { isGlobal: true } })
        })

        return prisma.tenantMetaPixel.findFirst({ where: { tenantId, id } })
    }

    async getGlobalPixelId(tenantId: string): Promise<string | null> {
        await this.backfillFromLegacyIntegrationIfNeeded(tenantId)

        const global = await prisma.tenantMetaPixel.findFirst({
            where: { tenantId, isGlobal: true, isActive: true },
            orderBy: { updatedAt: 'desc' }
        })
        return global?.pixelId ?? null
    }

    private async backfillFromLegacyIntegrationIfNeeded(tenantId: string) {
        const existingCount = await prisma.tenantMetaPixel.count({ where: { tenantId } })
        if (existingCount > 0) return

        const legacy = await prisma.tenantIntegration.findUnique({
            where: { tenantId_provider: { tenantId, provider: 'FACEBOOK' } },
            select: { isActive: true, config: true }
        })
        const pixelId = normalizePixelId((legacy?.config as any)?.pixelId)
        if (!pixelId) return

        try {
            await prisma.tenantMetaPixel.create({
                data: {
                    tenantId,
                    pixelId,
                    name: 'Default Pixel',
                    isActive: Boolean(legacy?.isActive),
                    isGlobal: true
                }
            })
        } catch {
            // ignore backfill races
        }
    }
}

