import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'

describe('Products delete policy (archive vs hard-delete)', () => {
    const slugA = `prod-del-a-${Date.now()}`
    const slugB = `prod-del-b-${Date.now()}`
    const hostA = `${slugA}.localhost:3000`
    const hostB = `${slugB}.localhost:3000`

    let tenantAId: string
    let tenantBId: string
    let tokenA: string
    let tokenB: string

    beforeAll(async () => {
        const [tenantA, tenantB] = await prisma.$transaction([
            prisma.tenant.create({ data: { name: 'Products Delete A', slug: slugA } }),
            prisma.tenant.create({ data: { name: 'Products Delete B', slug: slugB } })
        ])
        tenantAId = tenantA.id
        tenantBId = tenantB.id

        const [adminA, adminB] = await prisma.$transaction([
            prisma.user.create({
                data: { tenantId: tenantAId, email: `admin-${slugA}@example.com`, role: 'admin', passwordHash: 'x' }
            }),
            prisma.user.create({
                data: { tenantId: tenantBId, email: `admin-${slugB}@example.com`, role: 'admin', passwordHash: 'x' }
            })
        ])

        tokenA = signAccessToken({ userId: adminA.id, email: adminA.email, role: adminA.role, tenantId: adminA.tenantId })
        tokenB = signAccessToken({ userId: adminB.id, email: adminB.email, role: adminB.role, tenantId: adminB.tenantId })
    })

    afterAll(async () => {
        await prisma.orderItem.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.order.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.inventoryMovement.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.productVariant.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.product.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.user.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } })
    })

    it('archives product when linked to transactions', async () => {
        const referenced = await prisma.product.create({
            data: {
                tenantId: tenantAId,
                title: 'Referenced Product',
                slug: `referenced-${Date.now()}`,
                price: 100,
                stock: 10,
                isActive: true
            }
        })

        await prisma.order.create({
            data: {
                tenantId: tenantAId,
                status: 'PENDING',
                totalAmount: 100,
                customerName: 'Buyer',
                customerPhone: '0550000000',
                items: {
                    create: [{ productId: referenced.id, quantity: 1, price: 100 }]
                }
            }
        })

        const res = await request(app)
            .delete(`/api/admin/products/${referenced.id}`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)

        expect(res.status).toBe(200)
        expect(res.body).toMatchObject({ success: true, action: 'archived' })

        const product = await prisma.product.findFirst({ where: { tenantId: tenantAId, id: referenced.id } })
        expect(product).not.toBeNull()
        expect(product?.isActive).toBe(false)

        const variants = await prisma.productVariant.findMany({ where: { tenantId: tenantAId, productId: referenced.id } })
        expect(variants.length).toBeGreaterThan(0)
        expect(variants.every((v) => v.isActive === false)).toBe(true)
    })

    it('hard-deletes unreferenced product', async () => {
        const plain = await prisma.product.create({
            data: {
                tenantId: tenantAId,
                title: 'Unreferenced Product',
                slug: `plain-${Date.now()}`,
                price: 50,
                stock: 3,
                isActive: true
            }
        })

        const res = await request(app)
            .delete(`/api/admin/products/${plain.id}`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)

        expect(res.status).toBe(200)
        expect(res.body).toMatchObject({ success: true, action: 'deleted' })

        const product = await prisma.product.findFirst({ where: { tenantId: tenantAId, id: plain.id } })
        expect(product).toBeNull()
    })

    it('bulk delete aggregates deleted and archived counts', async () => {
        const archivedCandidate = await prisma.product.create({
            data: {
                tenantId: tenantAId,
                title: 'Bulk Archived Candidate',
                slug: `bulk-arch-${Date.now()}`,
                price: 90,
                stock: 5,
                isActive: true
            }
        })
        const deletedCandidate = await prisma.product.create({
            data: {
                tenantId: tenantAId,
                title: 'Bulk Deleted Candidate',
                slug: `bulk-del-${Date.now()}`,
                price: 80,
                stock: 5,
                isActive: true
            }
        })

        await prisma.order.create({
            data: {
                tenantId: tenantAId,
                status: 'PENDING',
                totalAmount: 90,
                customerName: 'Bulk Buyer',
                customerPhone: '0550000009',
                items: {
                    create: [{ productId: archivedCandidate.id, quantity: 1, price: 90 }]
                }
            }
        })

        const res = await request(app)
            .delete('/api/admin/products/bulk')
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ ids: [archivedCandidate.id, deletedCandidate.id] })

        expect(res.status).toBe(200)
        expect(res.body).toMatchObject({ success: true, archivedCount: 1, deletedCount: 1 })
    })

    it('enforces tenant isolation for delete', async () => {
        const tenantAProduct = await prisma.product.create({
            data: {
                tenantId: tenantAId,
                title: 'Tenant A Product',
                slug: `tenant-a-${Date.now()}`,
                price: 70,
                stock: 2,
                isActive: true
            }
        })

        const res = await request(app)
            .delete(`/api/admin/products/${tenantAProduct.id}`)
            .set('X-Forwarded-Host', hostB)
            .set('Authorization', `Bearer ${tokenB}`)

        expect(res.status).toBe(404)
    })
})
