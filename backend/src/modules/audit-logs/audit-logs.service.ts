import prisma from '../../lib/prisma'

export class AuditLogsService {
    async listByTenant(tenantId: string, take: number) {
        return prisma.auditLog.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
            take,
            select: {
                id: true,
                action: true,
                details: true,
                userId: true,
                targetId: true,
                tenantId: true,
                createdAt: true
            }
        })
    }
}

