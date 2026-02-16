import prisma from '../../lib/prisma'
import { Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { logAction } from '../../lib/audit'

export class UsersValidationError extends Error {
    statusCode: number
    statusMessage: string

    constructor(statusCode: number, statusMessage: string) {
        super(statusMessage)
        this.statusCode = statusCode
        this.statusMessage = statusMessage
    }
}

type TenantRole = 'owner' | 'admin' | 'staff'

export interface ActorContext {
    userId: string
    role: TenantRole
}

export interface CreateTenantUserInput {
    email: string
    password: string
    role?: 'admin' | 'staff'
    staffRoleId?: string
}

export interface UpdateTenantUserInput {
    email?: string
    password?: string
    role?: 'admin' | 'staff'
    isActive?: boolean
    staffRoleId?: string | null
}

const normalizeEmail = (email: unknown): string => {
    if (typeof email !== 'string') return ''
    return email.trim().toLowerCase()
}

const isValidEmail = (email: string): boolean => {
    if (!email) return false
    if (email.length > 320) return false
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

const isValidPassword = (password: unknown): password is string => {
    return typeof password === 'string' && password.length >= 8 && password.length <= 128
}

const canManageRole = (actorRole: TenantRole, targetRole: 'admin' | 'staff'): boolean => {
    if (actorRole === 'owner') return true
    if (actorRole === 'admin') return targetRole === 'staff'
    return false
}

const safeUserSelect = {
    id: true,
    email: true,
    role: true,
    isActive: true,
    staffRoleId: true,
    createdAt: true,
    updatedAt: true
} as const

export class UsersService {
    async list(tenantId: string, includeInactive: boolean) {
        return prisma.user.findMany({
            where: {
                tenantId,
                ...(includeInactive ? {} : { isActive: true })
            },
            orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
            select: safeUserSelect
        })
    }

    async getById(tenantId: string, id: string) {
        const user = await prisma.user.findUnique({
            where: { tenantId_id: { tenantId, id } },
            select: safeUserSelect
        })
        if (!user) throw new UsersValidationError(404, 'User not found')
        return user
    }

    async create(tenantId: string, actor: ActorContext, input: CreateTenantUserInput) {
        const email = normalizeEmail(input.email)
        if (!isValidEmail(email)) throw new UsersValidationError(400, 'Invalid email')
        if (!isValidPassword(input.password)) throw new UsersValidationError(400, 'Password must be at least 8 characters')

        const role: 'admin' | 'staff' = input.role ?? 'staff'
        if (role !== 'admin' && role !== 'staff') throw new UsersValidationError(400, 'Invalid role')
        if (!canManageRole(actor.role, role)) throw new UsersValidationError(403, 'Access denied: Cannot assign this role')

        const passwordHash = await bcrypt.hash(input.password, 10)
        const staffRoleId = role === 'staff' && typeof input.staffRoleId === 'string' && input.staffRoleId.trim()
            ? input.staffRoleId.trim()
            : null

        if (role === 'staff' && staffRoleId) {
            const roleExists = await prisma.tenantStaffRole.findUnique({
                where: { tenantId_id: { tenantId, id: staffRoleId } },
                select: { id: true }
            })
            if (!roleExists) throw new UsersValidationError(400, 'Invalid staffRoleId')
        }

        try {
            const user = await prisma.user.create({
                data: {
                    tenantId,
                    email,
                    passwordHash,
                    role,
                    ...(role === 'staff' ? { staffRoleId } : { staffRoleId: null }),
                    isActive: true
                },
                select: safeUserSelect
            })

            await logAction({
                action: 'TENANT_USER_CREATE',
                details: `Created tenant user ${user.email} (${user.role})`,
                userId: actor.userId,
                targetId: user.id,
                tenantId
            })

            return user
        } catch (error: any) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new UsersValidationError(409, 'A user with this email already exists')
            }
            throw error
        }
    }

    async update(tenantId: string, actor: ActorContext, id: string, patch: UpdateTenantUserInput) {
        const existing = await prisma.user.findUnique({
            where: { tenantId_id: { tenantId, id } },
            select: { id: true, email: true, role: true, isActive: true, staffRoleId: true }
        })
        if (!existing) throw new UsersValidationError(404, 'User not found')

        if (actor.role === 'admin' && existing.role === 'admin' && actor.userId !== existing.id) {
            throw new UsersValidationError(403, 'Access denied: Cannot modify another admin')
        }

        const data: Record<string, any> = {}
        const changes: string[] = []

        const nextRole = patch.role !== undefined ? patch.role : (existing.role as any)

        if (patch.email !== undefined) {
            const email = normalizeEmail(patch.email)
            if (!isValidEmail(email)) throw new UsersValidationError(400, 'Invalid email')
            data.email = email
            changes.push('email')
        }

        if (patch.password !== undefined) {
            if (!isValidPassword(patch.password)) {
                throw new UsersValidationError(400, 'Password must be at least 8 characters')
            }
            data.passwordHash = await bcrypt.hash(patch.password, 10)
            changes.push('password')
        }

        if (patch.role !== undefined) {
            if (existing.role === 'owner') {
                throw new UsersValidationError(400, 'Owner role cannot be changed')
            }
            if (patch.role !== 'admin' && patch.role !== 'staff') throw new UsersValidationError(400, 'Invalid role')
            if (!canManageRole(actor.role, patch.role)) throw new UsersValidationError(403, 'Access denied: Cannot assign this role')
            data.role = patch.role
            changes.push('role')
        }

        if (patch.staffRoleId !== undefined || (existing.role !== nextRole && nextRole === 'staff')) {
            if (nextRole !== 'staff') {
                data.staffRoleId = null
                changes.push('staffRole')
            } else {
                const newIdRaw = patch.staffRoleId
                const staffRoleId =
                    typeof newIdRaw === 'string' && newIdRaw.trim().length > 0 ? newIdRaw.trim() : null

                if (staffRoleId) {
                    const roleExists = await prisma.tenantStaffRole.findUnique({
                        where: { tenantId_id: { tenantId, id: staffRoleId } },
                        select: { id: true }
                    })
                    if (!roleExists) throw new UsersValidationError(400, 'Invalid staffRoleId')
                }

                data.staffRoleId = staffRoleId
                changes.push('staffRole')
            }
        }

        if (patch.isActive !== undefined) {
            if (typeof patch.isActive !== 'boolean') throw new UsersValidationError(400, 'Invalid isActive')

            if (existing.role === 'owner' && patch.isActive === false) {
                const otherOwners = await prisma.user.count({
                    where: { tenantId, role: 'owner', isActive: true, id: { not: existing.id } }
                })
                if (otherOwners === 0) throw new UsersValidationError(400, 'Cannot deactivate the last owner')
            }

            data.isActive = patch.isActive
            changes.push('isActive')
        }

        if (changes.length === 0) throw new UsersValidationError(400, 'No fields to update')

        try {
            const user = await prisma.user.update({
                where: { tenantId_id: { tenantId, id } },
                data,
                select: safeUserSelect
            })

            await logAction({
                action: 'TENANT_USER_UPDATE',
                details: `Updated tenant user ${existing.email}: ${changes.join(', ')}`,
                userId: actor.userId,
                targetId: user.id,
                tenantId
            })

            return user
        } catch (error: any) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new UsersValidationError(409, 'A user with this email already exists')
            }
            throw error
        }
    }

    async deactivate(tenantId: string, actor: ActorContext, id: string) {
        const user = await prisma.user.findUnique({
            where: { tenantId_id: { tenantId, id } },
            select: { id: true, email: true, role: true, isActive: true }
        })
        if (!user) throw new UsersValidationError(404, 'User not found')
        if (!user.isActive) return { success: true }

        if (actor.role === 'admin' && user.role === 'admin' && actor.userId !== user.id) {
            throw new UsersValidationError(403, 'Access denied: Cannot deactivate another admin')
        }

        if (user.role === 'owner') {
            const otherOwners = await prisma.user.count({
                where: { tenantId, role: 'owner', isActive: true, id: { not: user.id } }
            })
            if (otherOwners === 0) throw new UsersValidationError(400, 'Cannot deactivate the last owner')
        }

        await prisma.user.update({
            where: { tenantId_id: { tenantId, id } },
            data: { isActive: false }
        })

        await logAction({
            action: 'TENANT_USER_DEACTIVATE',
            details: `Deactivated tenant user ${user.email}`,
            userId: actor.userId,
            targetId: user.id,
            tenantId
        })

        return { success: true }
    }
}
