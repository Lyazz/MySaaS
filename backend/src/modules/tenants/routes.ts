import { Router } from 'express'
import prisma from '../../lib/prisma'
import { requireSuperAdmin } from '../../middleware/superadmin.middleware'
import { logAction } from '../../lib/audit'
import bcrypt from 'bcryptjs'
import { seedStaffRolePresets } from '../staff-roles/presets'

const router = Router()

router.use(requireSuperAdmin)

const addUtcMonths = (date: Date, months: number) =>
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate(), 0, 0, 0, 0))

// GET / - List tenants
router.get('/', async (req, res) => {
    const includeArchived = req.query.includeArchived === 'true'

    try {
        const tenants = await prisma.tenant.findMany({
            where: includeArchived ? {} : { archivedAt: null },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: {
                        users: true,
                        products: true,
                        orders: true
                    }
                }
            }
        })
        res.json(tenants)
    } catch (error) {
        console.error('List tenants error:', error)
        res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
    }
})

// POST / - Create tenant
router.post('/', async (req, res) => {
    const { name, slug, ownerEmail, ownerPassword } = req.body
    const normalizedOwnerEmail = typeof ownerEmail === 'string' ? ownerEmail.trim().toLowerCase() : ''
    const user = req.user!

    if (!name || !slug || !normalizedOwnerEmail || !ownerPassword) {
        return res.status(400).json({
            statusCode: 400,
            statusMessage: 'Missing required fields: name, slug, ownerEmail, ownerPassword'
        })
    }

    try {
        // Check if slug already exists
        const existingTenant = await prisma.tenant.findUnique({ where: { slug } })
        if (existingTenant) {
            return res.status(409).json({
                statusCode: 409,
                statusMessage: 'Tenant with this slug already exists'
            })
        }

        // Hash password
        const passwordHash = await bcrypt.hash(ownerPassword, 10)

        // Create tenant and owner user in a transaction
        const tenant = await prisma.$transaction(async (tx) => {
            const now = new Date()
            const newTenant = await tx.tenant.create({
                data: { name, slug }
            })

            const defaultCashbox = await tx.cashbox.create({
                data: {
                    tenantId: newTenant.id,
                    name: 'Caisse principale',
                    isActive: true
                }
            })

            await tx.user.create({
                data: {
                    email: normalizedOwnerEmail,
                    passwordHash,
                    role: 'owner',
                    tenantId: newTenant.id,
                    cashboxId: defaultCashbox.id
                }
            })

            await seedStaffRolePresets(tx, newTenant.id)

            await tx.storeSettings.create({
                data: {
                    tenantId: newTenant.id,
                    defaultCashboxId: defaultCashbox.id
                }
            })

            await tx.tenantSubscription.create({
                data: {
                    tenantId: newTenant.id,
                    planCode: 'basic',
                    interval: 'month',
                    status: 'ACTIVE',
                    currentPeriodStart: now,
                    currentPeriodEnd: addUtcMonths(now, 1)
                }
            })

            return newTenant
        })

        await logAction({
            action: 'CREATE_TENANT',
            details: `Tenant ${tenant.slug} created`,
            userId: user.id,
            targetId: tenant.id
        })

        res.status(201).json(tenant)
    } catch (error) {
        console.error('Create tenant error:', error)
        res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
    }
})

// PATCH /:id - Update tenant
router.patch('/:id', async (req, res) => {
    const { id } = req.params
    const { name, slug } = req.body
    const user = req.user!

    if (!id) return res.status(400).json({ statusCode: 400, statusMessage: 'Missing ID' })
    if (!name && !slug) {
        return res.status(400).json({ statusCode: 400, statusMessage: 'No fields to update' })
    }

    try {
        const updateData: any = {}
        if (name) updateData.name = name
        if (slug) updateData.slug = slug

        const tenant = await prisma.tenant.update({
            where: { id },
            data: updateData
        })

        await logAction({
            action: 'UPDATE_TENANT',
            details: `Tenant ${tenant.slug} updated`,
            userId: user.id,
            targetId: tenant.id
        })

        res.json(tenant)
    } catch (error) {
        console.error('Update tenant error:', error)
        res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
    }
})

// GET /:id/stats - Get tenant stats
router.get('/:id/stats', async (req, res) => {
    const { id } = req.params

    if (!id) return res.status(400).json({ statusCode: 400, statusMessage: 'Missing ID' })

    try {
        const [userCount, productCount, orderCount, revenue] = await Promise.all([
            prisma.user.count({ where: { tenantId: id } }),
            prisma.product.count({ where: { tenantId: id } }),
            prisma.order.count({ where: { tenantId: id } }),
            prisma.order.aggregate({
                where: {
                    tenantId: id,
                    status: { in: ['CONFIRMED', 'SHIPPED', 'DELIVERED'] }
                },
                _sum: { totalAmount: true }
            })
        ])

        res.json({
            users: userCount,
            products: productCount,
            orders: orderCount,
            revenue: revenue._sum.totalAmount || 0
        })
    } catch (error) {
        console.error('Get tenant stats error:', error)
        res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
    }
})

// GET /:id/detail - Full detail view for the tenant detail page
router.get('/:id/detail', async (req, res) => {
    const { id } = req.params

    if (!id) return res.status(400).json({ statusCode: 400, statusMessage: 'Missing ID' })

    try {
        const tenant = await prisma.tenant.findUnique({ where: { id } })
        if (!tenant) {
            return res.status(404).json({ statusCode: 404, statusMessage: 'Tenant not found' })
        }

        const subscription = await prisma.tenantSubscription.findUnique({ where: { tenantId: id } })

        const ordersSince = subscription?.currentPeriodStart
            ?? new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1))

        const [productCount, userCount, ordersThisPeriod, users, integrations, deliveryAccounts, domains] =
            await Promise.all([
                prisma.product.count({ where: { tenantId: id } }),
                prisma.user.count({ where: { tenantId: id } }),
                prisma.order.count({ where: { tenantId: id, createdAt: { gte: ordersSince } } }),
                prisma.user.findMany({
                    where: { tenantId: id },
                    select: { id: true, email: true, role: true, isActive: true, createdAt: true },
                    orderBy: { createdAt: 'asc' }
                }),
                prisma.tenantIntegration.findMany({
                    where: { tenantId: id },
                    select: { id: true, provider: true, isActive: true, updatedAt: true }
                }),
                prisma.tenantDeliveryAccount.findMany({
                    where: { tenantId: id },
                    select: { id: true, provider: true, isActive: true, updatedAt: true }
                }),
                prisma.tenantDomain.findMany({
                    where: { tenantId: id },
                    select: { id: true, domain: true, createdAt: true }
                })
            ])

        res.json({
            tenant,
            subscription,
            usage: { productCount, userCount, ordersThisPeriod },
            users,
            integrations,
            deliveryAccounts,
            domains
        })
    } catch (error) {
        console.error('Get tenant detail error:', error)
        res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
    }
})

// POST /:id/archive - Soft-delete: disables the tenant and hides it from the default list
router.post('/:id/archive', async (req, res) => {
    const { id } = req.params
    const user = req.user!

    if (!id) return res.status(400).json({ statusCode: 400, statusMessage: 'Missing ID' })

    try {
        const tenant = await prisma.tenant.update({
            where: { id },
            data: { archivedAt: new Date(), isSuspended: true }
        })

        await logAction({
            action: 'ARCHIVE_TENANT',
            details: `Tenant ${tenant.slug} archived`,
            userId: user.id,
            targetId: tenant.id
        })

        res.json({ success: true })
    } catch (error) {
        console.error('Archive tenant error:', error)
        res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
    }
})

// POST /:id/restore - Reverses an archive
router.post('/:id/restore', async (req, res) => {
    const { id } = req.params
    const user = req.user!

    if (!id) return res.status(400).json({ statusCode: 400, statusMessage: 'Missing ID' })

    try {
        const tenant = await prisma.tenant.update({
            where: { id },
            data: { archivedAt: null, isSuspended: false }
        })

        await logAction({
            action: 'RESTORE_TENANT',
            details: `Tenant ${tenant.slug} restored`,
            userId: user.id,
            targetId: tenant.id
        })

        res.json({ success: true })
    } catch (error) {
        console.error('Restore tenant error:', error)
        res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
    }
})

// DELETE /:id - Permanent delete. Only allowed once a tenant has been archived first.
router.delete('/:id', async (req, res) => {
    const { id } = req.params
    const user = req.user!

    if (!id) return res.status(400).json({ statusCode: 400, statusMessage: 'Missing ID' })

    try {
        const existing = await prisma.tenant.findUnique({ where: { id } })
        if (!existing) {
            return res.status(404).json({ statusCode: 404, statusMessage: 'Tenant not found' })
        }
        if (!existing.archivedAt) {
            return res.status(400).json({
                statusCode: 400,
                statusMessage: 'Tenant must be archived before it can be permanently deleted'
            })
        }

        const tenant = await prisma.tenant.delete({
            where: { id }
        })

        await logAction({
            action: 'DELETE_TENANT',
            details: `Tenant ${tenant.slug} deleted`,
            userId: user.id,
            targetId: tenant.id
        })

        res.json({ success: true })
    } catch (error) {
        console.error('Delete tenant error:', error)
        res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
    }
})

// POST /:id/suspend
router.post('/:id/suspend', async (req, res) => {
    const { id } = req.params
    const user = req.user!

    if (!id) return res.status(400).json({ statusCode: 400, statusMessage: 'Missing ID' })

    try {
        const tenant = await prisma.tenant.update({
            where: { id },
            data: { isSuspended: true }
        })

        await logAction({
            action: 'SUSPEND_TENANT',
            details: `Tenant ${tenant.slug} suspended`,
            userId: user.id,
            targetId: tenant.id
        })

        res.json({ success: true })
    } catch (error) {
        console.error('Suspend tenant error:', error)
        res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
    }
})

// POST /:id/unsuspend
router.post('/:id/unsuspend', async (req, res) => {
    const { id } = req.params
    const user = req.user!

    if (!id) return res.status(400).json({ statusCode: 400, statusMessage: 'Missing ID' })

    try {
        const tenant = await prisma.tenant.update({
            where: { id },
            data: { isSuspended: false }
        })

        await logAction({
            action: 'UNSUSPEND_TENANT',
            details: `Tenant ${tenant.slug} unsuspended`,
            userId: user.id,
            targetId: tenant.id
        })

        res.json({ success: true })
    } catch (error) {
        console.error('Unsuspend tenant error:', error)
        res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
    }
})

// POST /:id/impersonate
router.post('/:id/impersonate', async (req, res) => {
    const { id } = req.params
    const adminUser = req.user!

    if (!id) return res.status(400).json({ statusCode: 400, statusMessage: 'Missing Tenant ID' })

    try {
        const targetUser = await prisma.user.findFirst({
            where: {
                tenantId: id,
                role: 'owner'
            }
        })

        if (!targetUser) {
            return res.status(404).json({ statusCode: 404, statusMessage: 'Tenant owner not found' })
        }

        await logAction({
            action: 'IMPERSONATE_USER',
            details: `Impersonated user ${targetUser.email} of tenant ${id}`,
            userId: adminUser.id,
            targetId: targetUser.id,
            tenantId: id
        })

        res.json({
            success: true,
            impersonatedUser: targetUser
        })
    } catch (error) {
        console.error('Impersonate error:', error)
        res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
    }
})

export default router
