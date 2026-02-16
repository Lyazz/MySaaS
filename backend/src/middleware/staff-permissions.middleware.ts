import type { Request, Response, NextFunction } from 'express'
import prisma from '../lib/prisma'
import type { StaffCrudAction, StaffResource } from '../modules/staff-roles/staff-roles.service'

const methodToAction = (method: string): StaffCrudAction | null => {
    const upper = method.toUpperCase()
    if (upper === 'GET' || upper === 'HEAD' || upper === 'OPTIONS') return 'read'
    if (upper === 'POST') return 'create'
    if (upper === 'PUT' || upper === 'PATCH') return 'update'
    if (upper === 'DELETE') return 'delete'
    return null
}

const loadStaffPermissions = async (req: Request): Promise<Set<string>> => {
    if (req.staffPermissions) return req.staffPermissions

    const user = req.user
    const tenant = req.tenant
    if (!user) return new Set()
    if (user.role !== 'staff') return new Set()
    if (!tenant) return new Set()
    if (!user.staffRoleId) return new Set()

    const perms = await prisma.tenantStaffRolePermission.findMany({
        where: { tenantId: tenant.id, roleId: user.staffRoleId },
        select: { resource: true, action: true }
    })

    const set = new Set(perms.map((p) => `${p.resource}:${p.action}`))
    req.staffPermissions = set
    return set
}

export const requireStaffCrud =
    (resource: StaffResource) => async (req: Request, res: Response, next: NextFunction) => {
        const user = req.user
        if (!user) {
            return res.status(401).json({ statusCode: 401, statusMessage: 'Unauthorized' })
        }

        if (user.role !== 'staff') return next()

        const tenant = req.tenant
        if (!tenant) {
            return res.status(404).json({ statusCode: 404, statusMessage: 'Tenant not found' })
        }

        const action = methodToAction(req.method)
        if (!action) {
            return res.status(405).json({ statusCode: 405, statusMessage: 'Method not allowed' })
        }

        if (!user.staffRoleId) {
            return res.status(403).json({ statusCode: 403, statusMessage: 'Access denied: Staff role required' })
        }

        const perms = await loadStaffPermissions(req)
        if (!perms.has(`${resource}:${action}`)) {
            return res.status(403).json({ statusCode: 403, statusMessage: 'Access denied: Missing permission' })
        }

        next()
    }

export const requireStaffPermission =
    (resource: StaffResource, action: StaffCrudAction) => async (req: Request, res: Response, next: NextFunction) => {
        const user = req.user
        if (!user) {
            return res.status(401).json({ statusCode: 401, statusMessage: 'Unauthorized' })
        }

        if (user.role !== 'staff') return next()

        const tenant = req.tenant
        if (!tenant) {
            return res.status(404).json({ statusCode: 404, statusMessage: 'Tenant not found' })
        }

        if (!user.staffRoleId) {
            return res.status(403).json({ statusCode: 403, statusMessage: 'Access denied: Staff role required' })
        }

        const perms = await loadStaffPermissions(req)
        if (!perms.has(`${resource}:${action}`)) {
            return res.status(403).json({ statusCode: 403, statusMessage: 'Access denied: Missing permission' })
        }

        next()
    }
