import type { Request, Response, NextFunction } from 'express'
import prisma from '../lib/prisma'

const isSuperAdminPath = (path: string) => path.startsWith('/api/super-admin')
const isAuthPath = (path: string) => path === '/api/login' || path === '/api/register'

// For SaaS-host API calls (no tenant host), derive tenant context from the authenticated user.
// This keeps tenant isolation intact (tenantId comes from the user record) while avoiding
// "Tenant is required" errors in admin/staff flows.
export const expressTenantFromUserMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const path = req.path || ''
    if (!path.startsWith('/api')) return next()
    if (isAuthPath(path)) return next()
    if (isSuperAdminPath(path)) return next()

    if (req.tenant) return next()
    if (!req.user?.tenantId) return next()

    try {
        const tenant = await prisma.tenant.findUnique({ where: { id: req.user.tenantId } })
        if (!tenant) {
            return res.status(404).json({ statusCode: 404, statusMessage: 'Tenant not found' })
        }
        req.tenant = tenant
        return next()
    } catch (error) {
        console.error('Tenant-from-user middleware error', error)
        return res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
    }
}

