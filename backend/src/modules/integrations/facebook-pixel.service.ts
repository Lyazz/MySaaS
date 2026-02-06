import prisma from '../../lib/prisma'

export class FacebookPixelService {
    async getActivePixelId(tenantId: string): Promise<string | null> {
        const global = await prisma.tenantMetaPixel.findFirst({
            where: { tenantId, isGlobal: true, isActive: true },
            orderBy: { updatedAt: 'desc' },
            select: { pixelId: true }
        })

        if (global?.pixelId && /^[0-9]+$/.test(global.pixelId)) return global.pixelId

        // Backward-compatibility: legacy config stored on TenantIntegration(FACEBOOK)
        const integration = await prisma.tenantIntegration.findUnique({
            where: { tenantId_provider: { tenantId, provider: 'FACEBOOK' } },
            select: { isActive: true, config: true }
        })
        if (!integration?.isActive) return null
        const pixelIdRaw = (integration.config as any)?.pixelId
        const pixelId = typeof pixelIdRaw === 'string' ? pixelIdRaw.trim() : ''
        if (pixelId && /^[0-9]+$/.test(pixelId)) return pixelId
        return null
    }
}
