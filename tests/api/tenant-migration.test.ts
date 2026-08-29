import bcrypt from 'bcryptjs'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'
import prisma from '../../backend/src/lib/prisma'

/**
 * Offline-only → online migration.
 *
 * The predecessor was `POST /api/admin/sync/upgrade`, guarded only by
 * `requireTenantMember`: any staff account could move its own tenant onto a paid
 * tier for free, uploading client-supplied ids with no validation.
 */
describe('tenant migration to an online tier', () => {
    const stamp = Date.now()
    const saasHost = 'localhost:3000'
    const slug = `migrate-${stamp}`

    let tenantId = ''
    let adminTenantId = ''
    let superAdminToken = ''
    let ownerToken = ''
    let jobId = ''

    const asSuperAdmin = (path: string) =>
        request(app)
            .post(path)
            .set('X-Forwarded-Host', saasHost)
            .set('Authorization', `Bearer ${superAdminToken}`)

    beforeAll(async () => {
        const tenant = await prisma.tenant.create({
            data: { name: 'Offline Shop', slug, isOffline: true }
        })
        tenantId = tenant.id

        const passwordHash = await bcrypt.hash('Password123!', 10)
        const owner = await prisma.user.create({
            data: {
                tenantId,
                email: `owner-${slug}@example.com`,
                role: 'owner',
                passwordHash
            }
        })
        ownerToken = signAccessToken({
            userId: owner.id,
            email: owner.email,
            role: owner.role,
            tenantId
        })

        const adminTenant = await prisma.tenant.create({
            data: { name: 'Platform', slug: `platform-mig-${stamp}` }
        })
        adminTenantId = adminTenant.id
        const admin = await prisma.user.create({
            data: {
                tenantId: adminTenantId,
                email: `admin-mig-${stamp}@example.com`,
                role: 'owner',
                isSuperAdmin: true,
                passwordHash
            }
        })
        superAdminToken = signAccessToken({
            userId: admin.id,
            email: admin.email,
            role: admin.role,
            tenantId: adminTenantId
        })
    })

    beforeEach(async () => {
        await prisma.tenantMigrationStagingRow.deleteMany({
            where: { job: { tenantId } }
        })
        await prisma.tenantMigrationJob.deleteMany({ where: { tenantId } })
        await prisma.productCategory.deleteMany({ where: { tenantId } })
        await prisma.product.deleteMany({ where: { tenantId } })
        await prisma.category.deleteMany({ where: { tenantId } })
        await prisma.customer.deleteMany({ where: { tenantId } })
        await prisma.tenant.update({
            where: { id: tenantId },
            data: { isOffline: true }
        })

        const opened = await asSuperAdmin(
            `/api/super-admin/tenants/${tenantId}/migration`
        ).send({ declaredCounts: { categories: 1, products: 1 } })
        jobId = opened.body.job.id
    })

    afterAll(async () => {
        await prisma.tenantMigrationStagingRow.deleteMany({
            where: { job: { tenantId } }
        })
        await prisma.tenantMigrationJob.deleteMany({ where: { tenantId } })
        await prisma.productCategory.deleteMany({ where: { tenantId } })
        await prisma.product.deleteMany({ where: { tenantId } })
        await prisma.category.deleteMany({ where: { tenantId } })
        await prisma.customer.deleteMany({ where: { tenantId } })
        await prisma.user.deleteMany({ where: { tenantId: { in: [tenantId, adminTenantId] } } })
        await prisma.tenant.deleteMany({ where: { id: { in: [tenantId, adminTenantId] } } })
    })

    const uploadFixture = async () => {
        await asSuperAdmin(
            `/api/super-admin/tenants/${tenantId}/migration/${jobId}/batch`
        ).send({ domain: 'categories', rows: [{ title: 'Drinks', slug: 'drinks' }] })

        await asSuperAdmin(
            `/api/super-admin/tenants/${tenantId}/migration/${jobId}/batch`
        ).send({
            domain: 'products',
            rows: [{ title: 'Cola', slug: 'cola', price: 120 }]
        })
    }

    it('refuses every route to a tenant owner', async () => {
        // The regression that matters: the old endpoint let any staff member
        // upgrade their own tenant for free.
        for (const path of [
            `/api/super-admin/tenants/${tenantId}/migration`,
            `/api/super-admin/tenants/${tenantId}/migration/${jobId}/apply`,
            `/api/super-admin/tenants/${tenantId}/tier`
        ]) {
            const res = await request(app)
                .post(path)
                .set('X-Forwarded-Host', saasHost)
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ isOffline: false })

            expect(res.status).toBe(403)
        }

        const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } })
        expect(tenant.isOffline).toBe(true)
    })

    it('reports count mismatches without applying anything', async () => {
        // Only the categories batch arrives; products is short.
        await asSuperAdmin(
            `/api/super-admin/tenants/${tenantId}/migration/${jobId}/batch`
        ).send({ domain: 'categories', rows: [{ title: 'Drinks', slug: 'drinks' }] })

        const res = await asSuperAdmin(
            `/api/super-admin/tenants/${tenantId}/migration/${jobId}/validate`
        ).send({})

        expect(res.status).toBe(200)
        expect(res.body.ready).toBe(false)
        expect(res.body.problems.join(' ')).toContain('products')

        const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } })
        expect(tenant.isOffline).toBe(true)
        expect(await prisma.category.count({ where: { tenantId } })).toBe(0)
    })

    it('refuses to apply before validation has passed', async () => {
        await uploadFixture()

        const res = await asSuperAdmin(
            `/api/super-admin/tenants/${tenantId}/migration/${jobId}/apply`
        ).send({})

        expect(res.status).toBe(409)
        expect(res.body.code).toBe('JOB_NOT_VALIDATED')

        const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } })
        expect(tenant.isOffline).toBe(true)
    })

    it('applies the data and flips the tier only on success', async () => {
        await uploadFixture()

        const validated = await asSuperAdmin(
            `/api/super-admin/tenants/${tenantId}/migration/${jobId}/validate`
        ).send({})
        expect(validated.body.ready).toBe(true)

        const applied = await asSuperAdmin(
            `/api/super-admin/tenants/${tenantId}/migration/${jobId}/apply`
        ).send({})

        expect(applied.status).toBe(200)
        expect(applied.body.job.status).toBe('APPLIED')

        const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } })
        expect(tenant.isOffline).toBe(false)

        const category = await prisma.category.findFirstOrThrow({ where: { tenantId } })
        expect(category.title).toBe('Drinks')
        // Scoped by the route's tenant, never by anything in the payload.
        expect(category.tenantId).toBe(tenantId)

        const product = await prisma.product.findFirstOrThrow({ where: { tenantId } })
        expect(product.title).toBe('Cola')
    })

    it('is idempotent under a repeated batch', async () => {
        await uploadFixture()
        // The uploading device is by definition on a bad connection, so a
        // resend must not duplicate the catalogue.
        await uploadFixture()

        await asSuperAdmin(
            `/api/super-admin/tenants/${tenantId}/migration/${jobId}/validate`
        ).send({})

        // Counts will mismatch after a double upload, so force it through to
        // prove the upsert, not the validator.
        await prisma.tenantMigrationJob.update({
            where: { id: jobId },
            data: { status: 'VALIDATED' }
        })

        const applied = await asSuperAdmin(
            `/api/super-admin/tenants/${tenantId}/migration/${jobId}/apply`
        ).send({})
        expect(applied.status).toBe(200)

        expect(await prisma.category.count({ where: { tenantId } })).toBe(1)
        expect(await prisma.product.count({ where: { tenantId } })).toBe(1)
    })

    it('refuses to apply the same job twice', async () => {
        await uploadFixture()
        await asSuperAdmin(
            `/api/super-admin/tenants/${tenantId}/migration/${jobId}/validate`
        ).send({})
        await asSuperAdmin(
            `/api/super-admin/tenants/${tenantId}/migration/${jobId}/apply`
        ).send({})

        const replay = await asSuperAdmin(
            `/api/super-admin/tenants/${tenantId}/migration/${jobId}/apply`
        ).send({})

        expect(replay.status).toBe(409)
        expect(replay.body.code).toBe('JOB_ALREADY_APPLIED')
    })

    it('lets a super admin set the tier directly, with an audit trail', async () => {
        const res = await asSuperAdmin(`/api/super-admin/tenants/${tenantId}/tier`).send({
            isOffline: false
        })

        expect(res.status).toBe(200)
        expect(res.body.tenant.isOffline).toBe(false)

        const audit = await prisma.auditLog.findFirst({
            where: { action: 'TENANT_TIER_CHANGED', targetId: tenantId },
            orderBy: { createdAt: 'desc' }
        })
        expect(audit).not.toBeNull()
    })
})
