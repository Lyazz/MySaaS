import type { Request, Response, NextFunction } from 'express'
import prisma from '../lib/prisma'

type TenantRole = 'owner' | 'admin' | 'staff'

const ensureTenantContext = async (req: Request, res: Response): Promise<boolean> => {
    const user = req.user
    let tenant = req.tenant

    if (!user) {
        res.status(401).json({
            statusCode: 401,
            statusMessage: 'Unauthorized'
        })
        return false
    }

    // SaaS-host admin: derive tenant context from authenticated user.
    // Tenant-host admin: tenant context is derived from Host via expressTenantMiddleware.
    if (!tenant) {
        try {
            const foundTenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } })
            if (!foundTenant) {
                res.status(404).json({
                    statusCode: 404,
                    statusMessage: 'Tenant not found'
                })
                return false
            }
            tenant = foundTenant
            req.tenant = foundTenant
        } catch (error) {
            console.error('RBAC tenant resolution error', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
            return false
        }
    }

    if (user.tenantId !== tenant.id) {
        res.status(403).json({
            statusCode: 403,
            statusMessage: 'Access denied: User belongs to a different tenant'
        })
        return false
    }

    return true
}

export const requireTenantRoles =
    (roles: TenantRole[]) => async (req: Request, res: Response, next: NextFunction) => {
        const ok = await ensureTenantContext(req, res)
        if (!ok) return

        const user = req.user!
        if (!roles.includes(user.role as TenantRole)) {
            return res.status(403).json({
                statusCode: 403,
                statusMessage: 'Access denied: Insufficient permissions'
            })
        }

        next()
    }

export const requireTenantAdmin = requireTenantRoles(['owner', 'admin'])

export const requireTenantMember = requireTenantRoles(['owner', 'admin', 'staff'])
