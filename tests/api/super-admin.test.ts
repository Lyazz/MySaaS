import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'

describe('Super Admin API Tests', () => {
    let superAdminToken: string
    let regularToken: string
    let testTenantId: string

    beforeAll(async () => {
        // Create a test tenant with regular user
        const slug = `test-${Date.now()}`
        const tenant = await prisma.tenant.create({
            data: {
                name: 'Test Tenant',
                slug
            }
        })
        testTenantId = tenant.id

        // Create a regular user
        const regularUser = await prisma.user.create({
            data: {
                email: `user-${Date.now()}@test.com`,
                passwordHash: 'hashed',
                role: 'owner',
                tenantId: tenant.id
            }
        })

        // Create a super admin user
        const superAdmin = await prisma.user.create({
            data: {
                email: `admin-${Date.now()}@test.com`,
                passwordHash: 'hashed',
                role: 'owner',
                isSuperAdmin: true,
                tenantId: tenant.id
            }
        })

        // Generate tokens (simplified - in real app would use JWT)
        const jwt = require('jsonwebtoken')
        const secret = process.env.JWT_SECRET || 'secret'
        superAdminToken = jwt.sign({ userId: superAdmin.id }, secret)
        regularToken = jwt.sign({ userId: regularUser.id }, secret)
    })

    afterAll(async () => {
        // Cleanup: delete tenant-owned data first to satisfy FK constraints.
        const tenants = await prisma.tenant.findMany({
            where: {
                OR: [
                    { slug: { startsWith: 'test-' } },
                    { slug: { startsWith: 'new-tenant-' } },
                    { slug: { startsWith: 'logged-tenant-' } }
                ]
            },
            select: { id: true }
        })

        const tenantIds = tenants.map((t) => t.id)

        if (tenantIds.length) {
            const products = await prisma.product.findMany({
                where: { tenantId: { in: tenantIds } },
                select: { id: true }
            })
            const productIds = products.map((p) => p.id)

            const orders = await prisma.order.findMany({
                where: { tenantId: { in: tenantIds } },
                select: { id: true }
            })
            const orderIds = orders.map((o) => o.id)

            if (productIds.length) {
                await prisma.productVariant.deleteMany({ where: { productId: { in: productIds } } })
            }

            if (orderIds.length) {
                await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } })
                await prisma.order.deleteMany({ where: { id: { in: orderIds } } })
            }

            if (productIds.length) {
                await prisma.product.deleteMany({ where: { id: { in: productIds } } })
            }

            await prisma.category.deleteMany({ where: { tenantId: { in: tenantIds } } })
            await prisma.user.deleteMany({ where: { tenantId: { in: tenantIds } } })
            await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } })
        }
    })

    describe('Authentication & Authorization', () => {
        it('should deny access without token', async () => {
            const response = await request(app).get('/api/super-admin/stats/platform')
            expect(response.status).toBe(401)
        })

        it('should deny access for non-super-admin users', async () => {
            const response = await request(app)
                .get('/api/super-admin/stats/platform')
                .set('Authorization', `Bearer ${regularToken}`)
            expect(response.status).toBe(403)
        })

        it('should allow access for super admin', async () => {
            const response = await request(app)
                .get('/api/super-admin/stats/platform')
                .set('Authorization', `Bearer ${superAdminToken}`)
            expect(response.status).toBe(200)
        })
    })

    describe('Platform Stats', () => {
        it('should get platform stats', async () => {
            const response = await request(app)
                .get('/api/super-admin/stats/platform')
                .set('Authorization', `Bearer ${superAdminToken}`)

            expect(response.status).toBe(200)
            expect(response.body).toHaveProperty('tenants')
            expect(response.body).toHaveProperty('users')
            expect(response.body).toHaveProperty('products')
            expect(response.body).toHaveProperty('orders')
        })

        it('should get revenue stats', async () => {
            const response = await request(app)
                .get('/api/super-admin/stats/revenue')
                .set('Authorization', `Bearer ${superAdminToken}`)

            expect(response.status).toBe(200)
            expect(response.body).toHaveProperty('totalRevenue')
            expect(response.body).toHaveProperty('byTenant')
            expect(Array.isArray(response.body.byTenant)).toBe(true)
        })
    })

    describe('Tenant Management', () => {
        it('should list all tenants', async () => {
            const response = await request(app)
                .get('/api/super-admin/tenants')
                .set('Authorization', `Bearer ${superAdminToken}`)

            expect(response.status).toBe(200)
            expect(Array.isArray(response.body)).toBe(true)
        })

        it('should create a new tenant', async () => {
            const slug = `new-tenant-${Date.now()}`
            const response = await request(app)
                .post('/api/super-admin/tenants')
                .set('Authorization', `Bearer ${superAdminToken}`)
                .send({
                    name: 'New Test Tenant',
                    slug,
                    ownerEmail: `owner-${Date.now()}@test.com`,
                    ownerPassword: 'Password123!'
                })

            expect(response.status).toBe(201)
            expect(response.body).toHaveProperty('id')
            expect(response.body.slug).toBe(slug)

            // Verify owner user was created
            const owner = await prisma.user.findFirst({
                where: { tenantId: response.body.id, role: 'owner' }
            })
            expect(owner).toBeTruthy()
        })

        it('should update a tenant', async () => {
            const response = await request(app)
                .patch(`/api/super-admin/tenants/${testTenantId}`)
                .set('Authorization', `Bearer ${superAdminToken}`)
                .send({
                    name: 'Updated Tenant Name'
                })

            expect(response.status).toBe(200)
            expect(response.body.name).toBe('Updated Tenant Name')
        })

        it('should get tenant stats', async () => {
            const response = await request(app)
                .get(`/api/super-admin/tenants/${testTenantId}/stats`)
                .set('Authorization', `Bearer ${superAdminToken}`)

            expect(response.status).toBe(200)
            expect(response.body).toHaveProperty('users')
            expect(response.body).toHaveProperty('products')
            expect(response.body).toHaveProperty('orders')
            expect(response.body).toHaveProperty('revenue')
        })

        it('should suspend a tenant', async () => {
            const response = await request(app)
                .post(`/api/super-admin/tenants/${testTenantId}/suspend`)
                .set('Authorization', `Bearer ${superAdminToken}`)

            expect(response.status).toBe(200)
            expect(response.body).toHaveProperty('success', true)

            const tenant = await prisma.tenant.findUnique({ where: { id: testTenantId } })
            expect(tenant?.isSuspended).toBe(true)
        })

        it('should unsuspend a tenant', async () => {
            const response = await request(app)
                .post(`/api/super-admin/tenants/${testTenantId}/unsuspend`)
                .set('Authorization', `Bearer ${superAdminToken}`)

            expect(response.status).toBe(200)
            expect(response.body).toHaveProperty('success', true)

            const tenant = await prisma.tenant.findUnique({ where: { id: testTenantId } })
            expect(tenant?.isSuspended).toBe(false)
        })
    })

    describe('Audit Logs', () => {
        it('should retrieve audit logs', async () => {
            const response = await request(app)
                .get('/api/super-admin/audit-logs')
                .set('Authorization', `Bearer ${superAdminToken}`)

            expect(response.status).toBe(200)
            expect(Array.isArray(response.body)).toBe(true)
        })

        it('should log tenant creation', async () => {
            const slug = `logged-tenant-${Date.now()}`
            await request(app)
                .post('/api/super-admin/tenants')
                .set('Authorization', `Bearer ${superAdminToken}`)
                .send({
                    name: 'Logged Tenant',
                    slug,
                    ownerEmail: `logged-${Date.now()}@test.com`,
                    ownerPassword: 'Password123!'
                })

            const logs = await prisma.auditLog.findMany({
                where: { action: 'CREATE_TENANT' },
                orderBy: { createdAt: 'desc' },
                take: 1
            })

            expect(logs.length).toBeGreaterThan(0)
            expect(logs[0].details).toContain(slug)
        })
    })
})
