import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'

describe('Tenant users: creation, RBAC, audit', () => {
    const slugA = `users-a-${Date.now()}`
    const slugB = `users-b-${Date.now()}`
    let tenantAId = ''
    let tenantBId = ''
    let ownerAId = ''
    let ownerAToken = ''
    let adminAToken = ''
    let staffRoleAId = ''

    beforeAll(async () => {
        const [tenantA, tenantB] = await Promise.all([
            prisma.tenant.create({ data: { publishedAt: new Date(), name: 'Tenant A', slug: slugA } }),
            prisma.tenant.create({ data: { publishedAt: new Date(), name: 'Tenant B', slug: slugB } })
        ])
        tenantAId = tenantA.id
        tenantBId = tenantB.id

        const staffRoleA = await prisma.tenantStaffRole.create({
            data: {
                tenantId: tenantAId,
                name: `Staff Orders ${slugA}`
            },
            select: { id: true }
        })
        staffRoleAId = staffRoleA.id

        await prisma.tenantStaffRolePermission.createMany({
            data: [
                { tenantId: tenantAId, roleId: staffRoleAId, resource: 'orders', action: 'read' },
                { tenantId: tenantAId, roleId: staffRoleAId, resource: 'orders', action: 'update' }
            ]
        })

        const [ownerA, adminA, ownerB] = await Promise.all([
            prisma.user.create({
                data: { tenantId: tenantAId, email: `owner-${slugA}@example.com`, role: 'owner', passwordHash: 'x' }
            }),
            prisma.user.create({
                data: { tenantId: tenantAId, email: `admin-${slugA}@example.com`, role: 'admin', passwordHash: 'x' }
            }),
            prisma.user.create({
                data: { tenantId: tenantBId, email: `owner-${slugB}@example.com`, role: 'owner', passwordHash: 'x' }
            })
        ])

        ownerAId = ownerA.id
        ownerAToken = signAccessToken({
            userId: ownerA.id,
            email: ownerA.email,
            role: ownerA.role,
            tenantId: ownerA.tenantId
        })
        adminAToken = signAccessToken({
            userId: adminA.id,
            email: adminA.email,
            role: adminA.role,
            tenantId: adminA.tenantId
        })

        // Ensure tenant B has a second user to test cross-tenant access by ID.
        await prisma.user.create({
            data: { tenantId: tenantBId, email: `staff-${slugB}@example.com`, role: 'staff', passwordHash: 'x' }
        })
    })

    afterAll(async () => {
        await prisma.auditLog.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.user.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.tenantStaffRolePermission.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.tenantStaffRole.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } })
    })

    it('owner can create staff; admin cannot create admin', async () => {
        const createdStaff = await request(app)
            .post('/api/admin/users')
            .set('Authorization', `Bearer ${ownerAToken}`)
            .send({ email: `staff-${slugA}@example.com`, password: 'password123', role: 'staff', staffRoleId: staffRoleAId })
        expect(createdStaff.status).toBe(201)
        expect(createdStaff.body.email).toBe(`staff-${slugA}@example.com`)
        expect(createdStaff.body.role).toBe('staff')
        expect(createdStaff.body.passwordHash).toBeUndefined()

        const adminCreateAdmin = await request(app)
            .post('/api/admin/users')
            .set('Authorization', `Bearer ${adminAToken}`)
            .send({ email: `admin2-${slugA}@example.com`, password: 'password123', role: 'admin' })
        expect(adminCreateAdmin.status).toBe(403)

        const adminCreateStaff = await request(app)
            .post('/api/admin/users')
            .set('Authorization', `Bearer ${adminAToken}`)
            .send({ email: `staff2-${slugA}@example.com`, password: 'password123', role: 'staff', staffRoleId: staffRoleAId })
        expect(adminCreateStaff.status).toBe(201)
        expect(adminCreateStaff.body.role).toBe('staff')
    })

    it('cannot demote or deactivate the last owner', async () => {
        const demote = await request(app)
            .patch(`/api/admin/users/${ownerAId}`)
            .set('Authorization', `Bearer ${ownerAToken}`)
            .send({ role: 'staff' })
        expect(demote.status).toBe(400)

        const deactivateOwner = await request(app)
            .delete(`/api/admin/users/${ownerAId}`)
            .set('Authorization', `Bearer ${adminAToken}`)
        expect(deactivateOwner.status).toBe(400)
    })

    it('staff can access orders but not products/users; cross-tenant user IDs are not accessible', async () => {
        const createRes = await request(app)
            .post('/api/admin/users')
            .set('Authorization', `Bearer ${ownerAToken}`)
            .send({
                email: `staff-rbac-${slugA}@example.com`,
                password: 'password123',
                role: 'staff',
                staffRoleId: staffRoleAId
            })
        expect(createRes.status).toBe(201)
        const staffId = createRes.body.id as string

        const staffToken = signAccessToken({
            userId: staffId,
            email: createRes.body.email,
            role: createRes.body.role,
            tenantId: tenantAId
        })

        const orders = await request(app).get('/api/admin/orders').set('Authorization', `Bearer ${staffToken}`)
        expect(orders.status).toBe(200)

        const products = await request(app).get('/api/admin/products').set('Authorization', `Bearer ${staffToken}`)
        expect(products.status).toBe(403)

        const users = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${staffToken}`)
        expect(users.status).toBe(403)

        const tenantBUser = await prisma.user.findFirstOrThrow({
            where: { tenantId: tenantBId, role: 'staff' },
            select: { id: true }
        })
        const crossTenantGet = await request(app)
            .get(`/api/admin/users/${tenantBUser.id}`)
            .set('Authorization', `Bearer ${ownerAToken}`)
        expect(crossTenantGet.status).toBe(404)

        const audit = await request(app).get('/api/admin/audit-logs').set('Authorization', `Bearer ${ownerAToken}`)
        expect(audit.status).toBe(200)
        expect(audit.body.some((l: any) => l.action === 'TENANT_USER_CREATE' && l.targetId === staffId)).toBe(true)

        const deactivate = await request(app)
            .delete(`/api/admin/users/${staffId}`)
            .set('Authorization', `Bearer ${ownerAToken}`)
        expect(deactivate.status).toBe(200)
        expect(deactivate.body.success).toBe(true)

        const ordersAfterDeactivate = await request(app)
            .get('/api/admin/orders')
            .set('Authorization', `Bearer ${staffToken}`)
        expect(ordersAfterDeactivate.status).toBe(401)
    })
})
