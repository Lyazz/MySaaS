import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'

describe('Super Admin: tenant detail, archive/restore, delete-guard', () => {
    let superAdminToken: string
    let regularToken: string
    let tenantId: string
    let tenantSlug: string
    let ownerEmail: string

    beforeAll(async () => {
        tenantSlug = `lifecycle-${Date.now()}`
        const tenant = await prisma.tenant.create({
            data: { name: 'Lifecycle Tenant', slug: tenantSlug }
        })
        tenantId = tenant.id

        await prisma.tenantSubscription.create({
            data: {
                tenantId,
                planCode: 'basic',
                interval: 'month',
                status: 'ACTIVE',
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }
        })

        ownerEmail = `owner-${Date.now()}@lifecycle.test`
        await prisma.user.create({
            data: {
                tenantId,
                email: ownerEmail,
                passwordHash: await bcrypt.hash('password', 10),
                role: 'owner'
            }
        })

        const admin = await prisma.user.create({
            data: {
                tenantId,
                email: `admin-${Date.now()}@lifecycle.test`,
                passwordHash: 'hashed',
                role: 'owner',
                isSuperAdmin: true
            }
        })
        const regular = await prisma.user.create({
            data: {
                tenantId,
                email: `regular-${Date.now()}@lifecycle.test`,
                passwordHash: 'hashed',
                role: 'staff'
            }
        })

        const secret = process.env.JWT_SECRET!
        superAdminToken = jwt.sign({ userId: admin.id }, secret)
        regularToken = jwt.sign({ userId: regular.id }, secret)
    })

    afterAll(async () => {
        await prisma.tenantSubscription.deleteMany({ where: { tenantId } })
        await prisma.user.deleteMany({ where: { tenantId } })
        await prisma.tenant.deleteMany({ where: { id: tenantId } })
    })

    describe('GET /:id/detail', () => {
        it('denies non-super-admins', async () => {
            const res = await request(app)
                .get(`/api/super-admin/tenants/${tenantId}/detail`)
                .set('Authorization', `Bearer ${regularToken}`)
            expect(res.status).toBe(403)
        })

        it('returns subscription, usage, users and integrations without leaking secrets', async () => {
            const res = await request(app)
                .get(`/api/super-admin/tenants/${tenantId}/detail`)
                .set('Authorization', `Bearer ${superAdminToken}`)

            expect(res.status).toBe(200)
            expect(res.body.tenant.id).toBe(tenantId)
            expect(res.body.subscription.planCode).toBe('basic')
            expect(res.body.usage).toHaveProperty('productCount')
            expect(res.body.usage).toHaveProperty('userCount')
            expect(res.body.usage).toHaveProperty('ordersThisPeriod')
            expect(Array.isArray(res.body.users)).toBe(true)
            expect(res.body.users.length).toBeGreaterThan(0)
            for (const user of res.body.users) {
                expect(user).not.toHaveProperty('passwordHash')
            }
            for (const integration of res.body.integrations) {
                expect(integration).not.toHaveProperty('config')
            }
            for (const account of res.body.deliveryAccounts) {
                expect(account).not.toHaveProperty('config')
            }
        })
    })

    describe('Archive / restore', () => {
        it('cannot permanently delete a non-archived tenant', async () => {
            const res = await request(app)
                .delete(`/api/super-admin/tenants/${tenantId}`)
                .set('Authorization', `Bearer ${superAdminToken}`)
            expect(res.status).toBe(400)

            const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
            expect(tenant).not.toBeNull()
        })

        it('archives a tenant, hides it from the default list, and blocks tenant-hosted login', async () => {
            const archiveRes = await request(app)
                .post(`/api/super-admin/tenants/${tenantId}/archive`)
                .set('Authorization', `Bearer ${superAdminToken}`)
            expect(archiveRes.status).toBe(200)

            const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
            expect(tenant?.archivedAt).not.toBeNull()
            expect(tenant?.isSuspended).toBe(true)

            const log = await prisma.auditLog.findFirst({
                where: { action: 'ARCHIVE_TENANT', targetId: tenantId },
                orderBy: { createdAt: 'desc' }
            })
            expect(log).not.toBeNull()

            const listRes = await request(app)
                .get('/api/super-admin/tenants')
                .set('Authorization', `Bearer ${superAdminToken}`)
            expect(listRes.body.find((t: any) => t.id === tenantId)).toBeUndefined()

            const listAllRes = await request(app)
                .get('/api/super-admin/tenants?includeArchived=true')
                .set('Authorization', `Bearer ${superAdminToken}`)
            expect(listAllRes.body.find((t: any) => t.id === tenantId)).toBeDefined()

            const loginRes = await request(app)
                .post('/api/login')
                .set('X-Forwarded-Host', `${tenantSlug}.localhost:3000`)
                .send({ email: ownerEmail, password: 'password' })
            expect(loginRes.status).toBe(403)
        })

        it('restores an archived tenant', async () => {
            const restoreRes = await request(app)
                .post(`/api/super-admin/tenants/${tenantId}/restore`)
                .set('Authorization', `Bearer ${superAdminToken}`)
            expect(restoreRes.status).toBe(200)

            const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
            expect(tenant?.archivedAt).toBeNull()
            expect(tenant?.isSuspended).toBe(false)

            const log = await prisma.auditLog.findFirst({
                where: { action: 'RESTORE_TENANT', targetId: tenantId },
                orderBy: { createdAt: 'desc' }
            })
            expect(log).not.toBeNull()

            const listRes = await request(app)
                .get('/api/super-admin/tenants')
                .set('Authorization', `Bearer ${superAdminToken}`)
            expect(listRes.body.find((t: any) => t.id === tenantId)).toBeDefined()
        })

        it('permanently deletes a tenant once archived', async () => {
            await request(app)
                .post(`/api/super-admin/tenants/${tenantId}/archive`)
                .set('Authorization', `Bearer ${superAdminToken}`)

            const deleteRes = await request(app)
                .delete(`/api/super-admin/tenants/${tenantId}`)
                .set('Authorization', `Bearer ${superAdminToken}`)
            expect(deleteRes.status).toBe(200)

            const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
            expect(tenant).toBeNull()

            const log = await prisma.auditLog.findFirst({
                where: { action: 'DELETE_TENANT', targetId: tenantId },
                orderBy: { createdAt: 'desc' }
            })
            expect(log).not.toBeNull()
        })
    })
})
