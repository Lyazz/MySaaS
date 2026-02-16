import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'

describe('Staff roles: permissions enforcement', () => {
    const slug = `staff-perms-${Date.now()}`
    let tenantId = ''
    let adminToken = ''
    let otherAdminId = ''
    let staffToken = ''

    beforeAll(async () => {
        const tenant = await prisma.tenant.create({ data: { name: 'Tenant Staff Perms', slug } })
        tenantId = tenant.id

        const [admin, otherAdmin] = await Promise.all([
            prisma.user.create({
                data: { tenantId, email: `admin-${slug}@example.com`, role: 'admin', passwordHash: 'x' }
            }),
            prisma.user.create({
                data: { tenantId, email: `admin2-${slug}@example.com`, role: 'admin', passwordHash: 'x' }
            })
        ])

        otherAdminId = otherAdmin.id
        adminToken = signAccessToken({
            userId: admin.id,
            email: admin.email,
            role: admin.role,
            tenantId: admin.tenantId
        })

        const staffRole = await prisma.tenantStaffRole.create({
            data: {
                tenantId,
                name: `Catalog read ${slug}`
            },
            select: { id: true }
        })

        await prisma.tenantStaffRolePermission.createMany({
            data: [{ tenantId, roleId: staffRole.id, resource: 'products', action: 'read' }]
        })

        const staffUser = await prisma.user.create({
            data: {
                tenantId,
                email: `staff-${slug}@example.com`,
                role: 'staff',
                passwordHash: 'x',
                staffRoleId: staffRole.id
            }
        })

        staffToken = signAccessToken({
            userId: staffUser.id,
            email: staffUser.email,
            role: staffUser.role,
            tenantId: staffUser.tenantId
        })
    })

    afterAll(async () => {
        await prisma.auditLog.deleteMany({ where: { tenantId } })
        await prisma.user.deleteMany({ where: { tenantId } })
        await prisma.tenantStaffRolePermission.deleteMany({ where: { tenantId } })
        await prisma.tenantStaffRole.deleteMany({ where: { tenantId } })
        await prisma.tenant.deleteMany({ where: { id: tenantId } })
    })

    it('staff permissions restrict CRUD by module', async () => {
        const productsList = await request(app).get('/api/admin/products').set('Authorization', `Bearer ${staffToken}`)
        expect(productsList.status).toBe(200)

        const productsCreate = await request(app)
            .post('/api/admin/products')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({})
        expect(productsCreate.status).toBe(403)

        const ordersList = await request(app).get('/api/admin/orders').set('Authorization', `Bearer ${staffToken}`)
        expect(ordersList.status).toBe(403)
    })

    it('admin cannot deactivate another admin', async () => {
        const res = await request(app)
            .delete(`/api/admin/users/${otherAdminId}`)
            .set('Authorization', `Bearer ${adminToken}`)
        expect(res.status).toBe(403)
    })
})
