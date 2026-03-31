import { Router } from 'express'
import prisma from '../../lib/prisma'
import { Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { signAccessToken } from '../../lib/jwt'
import { seedStaffRolePresets } from '../staff-roles/presets'

const router = Router()

const addUtcMonths = (date: Date, months: number) =>
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate(), 0, 0, 0, 0))

router.post('/register', async (req, res) => {
    // Tenants must register from the SaaS host (root domain), not from a tenant subdomain.
    if (req.tenant) {
        return res.status(403).json({
            statusCode: 403,
            statusMessage: 'Registration is only allowed from the SaaS landing domain'
        })
    }

    const { name, slug, email, password } = req.body
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

    if (!name || !slug || !normalizedEmail || !password) {
        return res.status(400).json({
            statusCode: 400,
            statusMessage: 'Missing required fields'
        })
    }

    // Basic slug validation
    const slugRegex = /^[a-z0-9-]+$/
    if (!slugRegex.test(slug)) {
        return res.status(400).json({
            statusCode: 400,
            statusMessage: 'Invalid slug format. Use lowercase letters, numbers, and hyphens only.'
        })
    }

    try {
        // Check if tenant exists
        const existingTenant = await prisma.tenant.findUnique({
            where: { slug }
        })

        if (existingTenant) {
            return res.status(409).json({
                statusCode: 409, // Conflict
                statusMessage: 'Tenant URL is already taken'
            })
        }

        const passwordHash = await bcrypt.hash(password, 10)

        // Transaction: Create Tenant + Create Owner User
        const result = await prisma.$transaction(async (tx) => {
            const now = new Date()
            const tenant = await tx.tenant.create({
                data: {
                    name,
                    slug,
                }
            })

            const defaultCashbox = await tx.cashbox.create({
                data: {
                    tenantId: tenant.id,
                    name: 'Caisse principale',
                    isActive: true
                }
            })

            const user = await tx.user.create({
                data: {
                    email: normalizedEmail,
                    passwordHash,
                    role: 'owner',
                    isSuperAdmin: false,
                    tenantId: tenant.id,
                    cashboxId: defaultCashbox.id
                }
            })

            await seedStaffRolePresets(tx, tenant.id)

            await tx.storeSettings.create({
                data: {
                    tenantId: tenant.id,
                    defaultCashboxId: defaultCashbox.id
                }
            })

            await tx.tenantSubscription.create({
                data: {
                    tenantId: tenant.id,
                    planCode: 'basic',
                    interval: 'month',
                    status: 'ACTIVE',
                    currentPeriodStart: now,
                    currentPeriodEnd: addUtcMonths(now, 1)
                }
            })

            return { tenant, user }
        })

        return res.json({
            success: true,
            tenant: {
                id: result.tenant.id,
                name: result.tenant.name,
                slug: result.tenant.slug,
                url: `http://${result.tenant.slug}.localhost:3000` // Helper for dev
            },
            onboarding: {
                required: true
            }
        })

    } catch (error) {
        console.error('Registration error:', error)
        res.status(500).json({
            statusCode: 500,
            statusMessage: 'Internal Server Error'
        })
    }
})

router.post('/login', async (req, res) => {
    type UserWithTenant = Prisma.UserGetPayload<{ include: { tenant: true } }>

    const { email, password } = req.body
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

    console.log('Login attempt:', { email: normalizedEmail, passwordProvided: !!password })

    if (!normalizedEmail || !password) {
        return res.status(400).json({
            statusCode: 400,
            statusMessage: 'Email and password are required'
        })
    }

    try {
        const tenant = req.tenant

        if (tenant?.isSuspended) {
            return res.status(403).json({ statusCode: 403, statusMessage: 'Tenant is suspended' })
        }

        let user: UserWithTenant | null = null

        if (tenant) {
            user = await prisma.user.findFirst({
                where: { tenantId: tenant.id, email: { equals: normalizedEmail, mode: 'insensitive' }, isActive: true },
                include: { tenant: true }
            })
        } else {
            const matches = await prisma.user.findMany({
                where: { email: { equals: normalizedEmail, mode: 'insensitive' }, isActive: true },
                include: { tenant: true },
                orderBy: { createdAt: 'desc' },
                take: 2
            })

            if (matches.length > 1) {
                return res.status(409).json({
                    statusCode: 409,
                    statusMessage: 'This email exists on multiple tenants. Please log in from your tenant domain.'
                })
            }

            user = matches[0] ?? null
        }

        console.log('Login user found:', user ? user.email : 'not found')

        if (!user || !user.passwordHash) {
            return res.status(401).json({
                statusCode: 401,
                statusMessage: 'Invalid credentials'
            })
        }

        const isValid = await bcrypt.compare(password, user.passwordHash)
        console.log('Login password valid:', isValid)

        if (!isValid) {
            return res.status(401).json({
                statusCode: 401,
                statusMessage: 'Invalid credentials'
            })
        }

        const token = signAccessToken({
            userId: user.id,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId
        })

        const { passwordHash, ...userInfo } = user

        const responseTenant = tenant || user.tenant
        let isOffline = false
        if (responseTenant) {
            isOffline = responseTenant.isOffline
        }

        let staffRole: { id: string; name: string } | null = null
        let staffPermissions: string[] | null = null
        if (user.role === 'staff' && user.staffRoleId) {
            const role = await prisma.tenantStaffRole.findUnique({
                where: { tenantId_id: { tenantId: user.tenantId, id: user.staffRoleId } },
                select: { id: true, name: true, permissions: { select: { resource: true, action: true } } }
            })
            if (role) {
                staffRole = { id: role.id, name: role.name }
                staffPermissions = role.permissions.map((p) => `${p.resource}:${p.action}`)
            }
        }

        res.json({
            success: true,
            token,
            user: { ...userInfo, tenant: responseTenant ? { ...responseTenant, isOffline } : null },
            tenant: responseTenant ? { ...responseTenant, isOffline } : null,
            staffRole,
            staffPermissions
        })

    } catch (error) {
        console.error('Login error:', error)
        res.status(500).json({
            statusCode: 500,
            statusMessage: 'Internal Server Error'
        })
    }
})

router.get('/me', async (req, res) => {
    const user = req.user
    if (!user) {
        return res.status(401).json({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    try {
        const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } })
        const { passwordHash, ...userInfo } = user as any
        let staffRole: { id: string; name: string } | null = null
        let staffPermissions: string[] | null = null

        if (user.role === 'staff' && user.staffRoleId) {
            const role = await prisma.tenantStaffRole.findUnique({
                where: { tenantId_id: { tenantId: user.tenantId, id: user.staffRoleId } },
                select: { id: true, name: true, permissions: { select: { resource: true, action: true } } }
            })

            if (role) {
                staffRole = { id: role.id, name: role.name }
                staffPermissions = role.permissions.map((p) => `${p.resource}:${p.action}`)
            }
        }

        let isOffline = false
        if (tenant) {
            isOffline = tenant.isOffline
        }

        return res.json({ success: true, user: userInfo, tenant: { ...tenant, isOffline }, staffRole, staffPermissions })
    } catch (error) {
        console.error('Me endpoint error:', error)
        return res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
    }
})

export default router
