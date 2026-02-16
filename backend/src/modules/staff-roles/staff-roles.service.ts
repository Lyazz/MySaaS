import prisma from '../../lib/prisma'
import { Prisma } from '@prisma/client'

export class StaffRolesValidationError extends Error {
    statusCode: number
    statusMessage: string

    constructor(statusCode: number, statusMessage: string) {
        super(statusMessage)
        this.statusCode = statusCode
        this.statusMessage = statusMessage
    }
}

export type StaffCrudAction = 'create' | 'read' | 'update' | 'delete'

export const STAFF_RESOURCES = [
    'dashboard',
    'products',
    'categories',
    'variants',
    'inventory',
    'orders',
    'sales',
    'purchases',
    'suppliers',
    'customers',
    'delivery',
    'cash',
    'billing',
    'storeSettings',
    'homepageSettings',
    'contactInfos',
    'integrations',
    'metaPixels',
    'pos'
] as const

export type StaffResource = typeof STAFF_RESOURCES[number]

const STAFF_ACTIONS: StaffCrudAction[] = ['create', 'read', 'update', 'delete']

export interface StaffRolePermissionsInput {
    resource: StaffResource
    actions: StaffCrudAction[]
}

export interface CreateStaffRoleInput {
    name: string
    permissions: StaffRolePermissionsInput[]
}

export interface UpdateStaffRoleInput {
    name?: string
    permissions?: StaffRolePermissionsInput[]
}

const normalizeName = (name: unknown): string => (typeof name === 'string' ? name.trim() : '')

const isValidResource = (resource: unknown): resource is StaffResource =>
    typeof resource === 'string' && (STAFF_RESOURCES as readonly string[]).includes(resource)

const isValidAction = (action: unknown): action is StaffCrudAction =>
    typeof action === 'string' && (STAFF_ACTIONS as readonly string[]).includes(action)

const normalizePermissions = (raw: unknown): StaffRolePermissionsInput[] => {
    if (!Array.isArray(raw)) return []

    const result: StaffRolePermissionsInput[] = []
    for (const entry of raw) {
        if (!entry || typeof entry !== 'object') continue
        const resource = (entry as any).resource
        const actionsRaw = (entry as any).actions
        if (!isValidResource(resource)) continue
        const actions = Array.isArray(actionsRaw) ? actionsRaw.filter(isValidAction) : []
        const uniqueActions = Array.from(new Set(actions))
        if (uniqueActions.length === 0) continue
        result.push({ resource, actions: uniqueActions })
    }

    return result
}

const flattenPermissions = (permissions: StaffRolePermissionsInput[]) => {
    const flat: Array<{ resource: StaffResource; action: StaffCrudAction }> = []
    for (const p of permissions) {
        for (const action of p.actions) flat.push({ resource: p.resource, action })
    }
    return flat
}

const groupPermissions = (
    perms: Array<{ resource: string; action: string }>
): StaffRolePermissionsInput[] => {
    const map = new Map<string, Set<StaffCrudAction>>()
    for (const p of perms) {
        if (!isValidResource(p.resource) || !isValidAction(p.action)) continue
        if (!map.has(p.resource)) map.set(p.resource, new Set())
        map.get(p.resource)!.add(p.action)
    }
    return Array.from(map.entries()).map(([resource, actionsSet]) => ({
        resource: resource as StaffResource,
        actions: Array.from(actionsSet.values())
    }))
}

export class StaffRolesService {
    async list(tenantId: string) {
        const roles = await prisma.tenantStaffRole.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                createdAt: true,
                updatedAt: true,
                permissions: { select: { resource: true, action: true } }
            }
        })

        return roles.map((r) => ({
            id: r.id,
            name: r.name,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            permissions: groupPermissions(r.permissions)
        }))
    }

    async create(tenantId: string, input: CreateStaffRoleInput) {
        const name = normalizeName(input?.name)
        if (!name || name.length < 2 || name.length > 50) {
            throw new StaffRolesValidationError(400, 'Invalid role name')
        }

        const permissions = normalizePermissions(input?.permissions)
        if (permissions.length === 0) {
            throw new StaffRolesValidationError(400, 'At least one permission is required')
        }

        const flat = flattenPermissions(permissions)

        try {
            const created = await prisma.$transaction(async (tx) => {
                const role = await tx.tenantStaffRole.create({
                    data: {
                        name,
                        tenant: { connect: { id: tenantId } }
                    },
                    select: { id: true, name: true, createdAt: true, updatedAt: true }
                })

                await tx.tenantStaffRolePermission.createMany({
                    data: flat.map((p) => ({
                        tenantId,
                        roleId: role.id,
                        resource: p.resource,
                        action: p.action
                    }))
                })

                const perms = await tx.tenantStaffRolePermission.findMany({
                    where: { tenantId, roleId: role.id },
                    select: { resource: true, action: true }
                })

                return { ...role, permissions: perms }
            })

            return {
                id: created.id,
                name: created.name,
                createdAt: created.createdAt,
                updatedAt: created.updatedAt,
                permissions: groupPermissions(created.permissions)
            }
        } catch (error: any) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new StaffRolesValidationError(409, 'A role with this name already exists')
            }
            throw error
        }
    }

    async update(tenantId: string, id: string, patch: UpdateStaffRoleInput) {
        const existing = await prisma.tenantStaffRole.findUnique({
            where: { tenantId_id: { tenantId, id } },
            select: { id: true, name: true }
        })
        if (!existing) throw new StaffRolesValidationError(404, 'Role not found')

        const data: Record<string, any> = {}

        if (patch?.name !== undefined) {
            const name = normalizeName(patch.name)
            if (!name || name.length < 2 || name.length > 50) {
                throw new StaffRolesValidationError(400, 'Invalid role name')
            }
            data.name = name
        }

        const updatePerms = patch?.permissions !== undefined
        const permissions = updatePerms ? normalizePermissions(patch.permissions) : null
        if (updatePerms && (!permissions || permissions.length === 0)) {
            throw new StaffRolesValidationError(400, 'At least one permission is required')
        }

        if (!updatePerms && Object.keys(data).length === 0) {
            throw new StaffRolesValidationError(400, 'No fields to update')
        }

        if (updatePerms && Object.keys(data).length === 0) {
            data.updatedAt = new Date()
        }

        try {
            const updated = await prisma.$transaction(async (tx) => {
                if (updatePerms) {
                    await tx.tenantStaffRolePermission.deleteMany({
                        where: { tenantId, roleId: id }
                    })

                    const flat = flattenPermissions(permissions!)
                    if (flat.length > 0) {
                        await tx.tenantStaffRolePermission.createMany({
                            data: flat.map((p) => ({
                                tenantId,
                                roleId: id,
                                resource: p.resource,
                                action: p.action
                            }))
                        })
                    }
                }

                return tx.tenantStaffRole.update({
                    where: { tenantId_id: { tenantId, id } },
                    data,
                    select: {
                        id: true,
                        name: true,
                        createdAt: true,
                        updatedAt: true,
                        permissions: { select: { resource: true, action: true } }
                    }
                })
            })

            return {
                id: updated.id,
                name: updated.name,
                createdAt: updated.createdAt,
                updatedAt: updated.updatedAt,
                permissions: groupPermissions(updated.permissions)
            }
        } catch (error: any) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new StaffRolesValidationError(409, 'A role with this name already exists')
            }
            throw error
        }
    }

    async remove(tenantId: string, id: string) {
        const existing = await prisma.tenantStaffRole.findUnique({
            where: { tenantId_id: { tenantId, id } },
            select: { id: true }
        })
        if (!existing) throw new StaffRolesValidationError(404, 'Role not found')

        const assigned = await prisma.user.count({
            where: { tenantId, staffRoleId: id }
        })
        if (assigned > 0) {
            throw new StaffRolesValidationError(409, 'Role is assigned to users')
        }

        await prisma.tenantStaffRole.delete({
            where: { tenantId_id: { tenantId, id } }
        })

        return { success: true }
    }
}
