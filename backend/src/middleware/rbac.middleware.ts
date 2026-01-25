import type { Request, Response, NextFunction } from 'express'
import prisma from '../lib/prisma'

export const requireTenantAdmin = async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user
    let tenant = req.tenant

    if (!user) {
        return res.status(401).json({
            statusCode: 401,
            statusMessage: 'Unauthorized'
        })
    }

    // SaaS-host admin: derive tenant context from authenticated user.
    // Tenant-host admin: tenant context is derived from Host via expressTenantMiddleware.
    if (!tenant) {
        try {
            const foundTenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } })
            if (!foundTenant) {
                return res.status(404).json({
                    statusCode: 404,
                    statusMessage: 'Tenant not found'
                })
            }
            tenant = foundTenant
            req.tenant = foundTenant
        } catch (error) {
            console.error('RBAC tenant resolution error', error)
            return res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    if (user.tenantId !== tenant.id) {
        return res.status(403).json({
            statusCode: 403,
            statusMessage: 'Access denied: User belongs to a different tenant'
        })
    }

    // Check roles if needed
    if (user.role !== 'owner' && user.role !== 'admin') {
        return res.status(403).json({
            statusCode: 403,
            statusMessage: 'Access denied: Insufficient permissions'
        })
    }

    next()
}
