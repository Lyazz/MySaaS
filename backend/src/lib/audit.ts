import prisma from './prisma'

interface AuditLogParams {
    action: string
    details?: string
    userId?: string
    targetId?: string
    tenantId?: string
}

export const logAction = async (params: AuditLogParams) => {
    try {
        await prisma.auditLog.create({
            data: {
                action: params.action,
                details: params.details,
                userId: params.userId,
                targetId: params.targetId,
                tenantId: params.tenantId
            }
        })
    } catch (error) {
        console.error('Failed to create audit log:', error)
        // Don't throw, we don't want to fail the main request just because logging failed? 
        // Or maybe we do for strict auditing. Let's log error but proceed for now.
    }
}
