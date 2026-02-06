import prisma from '../../lib/prisma'

export class IntegrationsService {
    async getIntegration(tenantId: string, provider: string) {
        return prisma.tenantIntegration.findUnique({
            where: {
                tenantId_provider: {
                    tenantId,
                    provider
                }
            }
        })
    }

    async upsertIntegration(tenantId: string, provider: string, config: any, isActive: boolean) {
        return prisma.tenantIntegration.upsert({
            where: {
                tenantId_provider: {
                    tenantId,
                    provider
                }
            },
            create: {
                tenantId,
                provider,
                config,
                isActive
            },
            update: {
                config,
                isActive
            }
        })
    }
}
