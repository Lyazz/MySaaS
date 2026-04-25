import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import app from '../../backend/src/app'
import prisma from '../../backend/src/lib/prisma'
import { signAccessToken } from '../../backend/src/lib/jwt'

describe('Admin slug availability endpoints', () => {
    const slugA = `slug-check-a-${Date.now()}`
    const slugB = `slug-check-b-${Date.now()}`
    const hostA = `${slugA}.localhost:3000`
    const hostB = `${slugB}.localhost:3000`

    let tenantAId = ''
    let tenantBId = ''
    let adminAToken = ''
    let adminBToken = ''
    let productAId = ''
    let categoryAId = ''

    beforeAll(async () => {
        const [tenantA, tenantB] = await Promise.all([
            prisma.tenant.create({ data: { name: 'Slug Check A', slug: slugA } }),
            prisma.tenant.create({ data: { name: 'Slug Check B', slug: slugB } })
        ])
        tenantAId = tenantA.id
        tenantBId = tenantB.id

        const [adminA, adminB] = await Promise.all([
            prisma.user.create({
                data: { tenantId: tenantA.id, email: `admin-a-${slugA}@example.com`, role: 'admin', passwordHash: 'x' }
            }),
            prisma.user.create({
                data: { tenantId: tenantB.id, email: `admin-b-${slugB}@example.com`, role: 'admin', passwordHash: 'x' }
            })
        ])

        adminAToken = signAccessToken({
            userId: adminA.id,
            email: adminA.email,
            role: adminA.role,
            tenantId: adminA.tenantId
        })
        adminBToken = signAccessToken({
            userId: adminB.id,
            email: adminB.email,
            role: adminB.role,
            tenantId: adminB.tenantId
        })

        const categoryA = await prisma.category.create({
            data: { tenantId: tenantAId, title: 'Tenant A Category', slug: 'tenant-a-category' }
        })
        categoryAId = categoryA.id

        const productA = await prisma.product.create({
            data: {
                tenantId: tenantAId,
                title: 'Tenant A Product',
                slug: 'tenant-a-product',
                price: 100,
                stock: 5,
                isActive: true,
                categoryId: categoryA.id
            }
        })
        productAId = productA.id
    })

    afterAll(async () => {
        const tenantIds = [tenantAId, tenantBId].filter(Boolean)
        if (tenantIds.length === 0) return

        await prisma.inventoryMovement.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.productVariantImage.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.productVariantOptionValue.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.productVariant.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.productOptionValue.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.productOption.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.productImage.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.productBundleDeal.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.productCategory.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.product.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.category.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.user.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } })
    })

    it('checks product slug availability per tenant', async () => {
        const takenOnTenantA = await request(app)
            .get('/api/admin/products/slug-availability')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${adminAToken}`)
            .query({ slug: 'tenant-a-product' })

        expect(takenOnTenantA.status).toBe(200)
        expect(takenOnTenantA.body.available).toBe(false)

        const availableOnTenantB = await request(app)
            .get('/api/admin/products/slug-availability')
            .set('X-Forwarded-Host', hostB)
            .set('Authorization', `Bearer ${adminBToken}`)
            .query({ slug: 'tenant-a-product' })

        expect(availableOnTenantB.status).toBe(200)
        expect(availableOnTenantB.body.available).toBe(true)

        const availableWhenEditingCurrent = await request(app)
            .get('/api/admin/products/slug-availability')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${adminAToken}`)
            .query({ slug: 'tenant-a-product', excludeId: productAId })

        expect(availableWhenEditingCurrent.status).toBe(200)
        expect(availableWhenEditingCurrent.body.available).toBe(true)
    })

    it('checks category slug availability per tenant', async () => {
        const takenOnTenantA = await request(app)
            .get('/api/admin/categories/slug-availability')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${adminAToken}`)
            .query({ slug: 'tenant-a-category' })

        expect(takenOnTenantA.status).toBe(200)
        expect(takenOnTenantA.body.available).toBe(false)

        const availableOnTenantB = await request(app)
            .get('/api/admin/categories/slug-availability')
            .set('X-Forwarded-Host', hostB)
            .set('Authorization', `Bearer ${adminBToken}`)
            .query({ slug: 'tenant-a-category' })

        expect(availableOnTenantB.status).toBe(200)
        expect(availableOnTenantB.body.available).toBe(true)

        const availableWhenEditingCurrent = await request(app)
            .get('/api/admin/categories/slug-availability')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${adminAToken}`)
            .query({ slug: 'tenant-a-category', excludeId: categoryAId })

        expect(availableWhenEditingCurrent.status).toBe(200)
        expect(availableWhenEditingCurrent.body.available).toBe(true)
    })
})
