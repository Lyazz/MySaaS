import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'

describe('Product variant stock allocation workflow', () => {
    const slug = `variant-alloc-${Date.now()}`
    const host = `${slug}.localhost:3000`

    let tenantId: string
    let adminToken: string
    let productId: string
    let defaultVariantId: string
    let optionId: string
    let smallValueId: string
    let largeValueId: string

    beforeAll(async () => {
        const tenant = await prisma.tenant.create({
            data: { name: 'Variant Allocation Tenant', slug }
        })
        tenantId = tenant.id

        const admin = await prisma.user.create({
            data: {
                tenantId,
                email: `variant-alloc-${slug}@example.com`,
                role: 'admin',
                passwordHash: 'x'
            }
        })
        adminToken = signAccessToken({ userId: admin.id, email: admin.email, role: admin.role, tenantId: admin.tenantId })

        const product = await prisma.product.create({
            data: {
                tenantId,
                title: 'Alloc Product',
                slug: `alloc-product-${Date.now()}`,
                price: 120,
                stock: 9,
                isActive: true
            }
        })
        productId = product.id

        const defaultVariant = await prisma.productVariant.create({
            data: {
                tenantId,
                productId,
                sku: `ALLOC-DEFAULT-${Date.now()}`,
                price: 120,
                stock: 12,
                reserved: 2,
                safetyStock: 1,
                trackInventory: true,
                isActive: true
            }
        })
        defaultVariantId = defaultVariant.id

        const option = await prisma.productOption.create({
            data: {
                tenantId,
                productId,
                name: 'Size',
                position: 0,
                displayType: 'dropdown' as any
            }
        })
        optionId = option.id

        const [smallValue, largeValue] = await prisma.$transaction([
            prisma.productOptionValue.create({
                data: { tenantId, optionId, label: 'S', position: 0 }
            }),
            prisma.productOptionValue.create({
                data: { tenantId, optionId, label: 'L', position: 1 }
            })
        ])
        smallValueId = smallValue.id
        largeValueId = largeValue.id
    })

    afterAll(async () => {
        await prisma.inventoryMovement.deleteMany({ where: { tenantId } })
        await prisma.productVariantOptionValue.deleteMany({ where: { tenantId } })
        await prisma.productVariant.deleteMany({ where: { tenantId } })
        await prisma.productOptionValue.deleteMany({ where: { tenantId } })
        await prisma.productOption.deleteMany({ where: { tenantId } })
        await prisma.product.deleteMany({ where: { tenantId } })
        await prisma.user.deleteMany({ where: { tenantId } })
        await prisma.tenant.deleteMany({ where: { id: tenantId } })
    })

    it('requires explicit allocation and does not auto-carry stock into generated variants', async () => {
        const generate = await request(app)
            .post(`/api/admin/products/${productId}/variants/generate`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${adminToken}`)

        expect(generate.status).toBe(200)
        expect(Array.isArray(generate.body)).toBe(true)
        expect(generate.body).toHaveLength(2)
        for (const variant of generate.body as any[]) {
            expect(Number(variant.stock)).toBe(0)
            expect(Number(variant.reserved)).toBe(0)
            expect(Number(variant.safetyStock)).toBe(0)
        }

        const product = await request(app)
            .get(`/api/admin/products/${productId}`)
            .query({ includeInactiveVariants: '1' })
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${adminToken}`)

        expect(product.status).toBe(200)
        expect(product.body.stockAllocationRequired).toBe(true)
        expect(product.body.stockAllocationSourceVariantId).toBe(defaultVariantId)
        expect(product.body.stockAllocationSourceBalance).toMatchObject({
            stock: 12,
            reserved: 2,
            safetyStock: 1
        })
        expect(Number(product.body.stock)).toBe(0)

        const sourceVariant = await prisma.productVariant.findUnique({
            where: { id: defaultVariantId },
            select: { isActive: true, stock: true, reserved: true, safetyStock: true }
        })
        expect(sourceVariant?.isActive).toBe(false)
        expect(sourceVariant?.stock).toBe(12)
        expect(sourceVariant?.reserved).toBe(2)
        expect(sourceVariant?.safetyStock).toBe(1)
    })

    it('rejects unbalanced allocation totals', async () => {
        const product = await prisma.product.findUniqueOrThrow({
            where: { id: productId },
            include: {
                variants: {
                    where: { tenantId, isActive: true, optionValues: { some: {} } },
                    include: { optionValues: true }
                }
            }
        })

        const [smallVariant, largeVariant] = product.variants
        const res = await request(app)
            .post(`/api/admin/products/${productId}/variants/allocate-stock`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                sourceVariantId: defaultVariantId,
                allocations: [
                    { variantId: smallVariant.id, stock: 5, reserved: 1, safetyStock: 1 },
                    { variantId: largeVariant.id, stock: 5, reserved: 0, safetyStock: 0 }
                ]
            })

        expect(res.status).toBe(409)
        expect(res.body.code).toBe('STOCK_ALLOCATION_REQUIRED')
    })

    it('allocates the full hidden balance and syncs product stock from active variants', async () => {
        const productBefore = await prisma.product.findUniqueOrThrow({
            where: { id: productId },
            include: {
                variants: {
                    where: { tenantId, isActive: true, optionValues: { some: {} } },
                    include: {
                        optionValues: {
                            include: { optionValue: true }
                        }
                    }
                }
            }
        })

        const smallVariant = productBefore.variants.find((variant) =>
            variant.optionValues.some((entry) => entry.optionValueId === smallValueId)
        )
        const largeVariant = productBefore.variants.find((variant) =>
            variant.optionValues.some((entry) => entry.optionValueId === largeValueId)
        )

        expect(smallVariant?.id).toBeTruthy()
        expect(largeVariant?.id).toBeTruthy()

        const allocate = await request(app)
            .post(`/api/admin/products/${productId}/variants/allocate-stock`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                sourceVariantId: defaultVariantId,
                allocations: [
                    { variantId: smallVariant!.id, stock: 7, reserved: 1, safetyStock: 1 },
                    { variantId: largeVariant!.id, stock: 5, reserved: 1, safetyStock: 0 }
                ]
            })

        expect(allocate.status).toBe(200)
        expect(allocate.body.stockAllocationRequired).toBe(false)

        const variantsAfter = await prisma.productVariant.findMany({
            where: { tenantId, productId, isActive: true, optionValues: { some: {} } },
            select: { id: true, stock: true, reserved: true, safetyStock: true }
        })

        const sourceVariant = await prisma.productVariant.findUnique({
            where: { id: defaultVariantId },
            select: { stock: true, reserved: true, safetyStock: true }
        })
        expect(sourceVariant).toMatchObject({ stock: 0, reserved: 0, safetyStock: 0 })

        const totalAvailable = variantsAfter.reduce(
            (sum, variant) => sum + Math.max(variant.stock - variant.reserved - variant.safetyStock, 0),
            0
        )

        const productAfter = await prisma.product.findUnique({
            where: { id: productId },
            select: { stock: true }
        })
        expect(Number(productAfter?.stock)).toBe(totalAvailable)
        expect(totalAvailable).toBe(9)
    })

    it('blocks deleting an option value while one of its variants still has stock balances', async () => {
        const res = await request(app)
            .delete(`/api/admin/products/${productId}/options/${optionId}/values/${smallValueId}`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${adminToken}`)

        expect(res.status).toBe(409)
        expect(res.body.code).toBe('VARIANT_STOCK_NOT_EMPTY')
    })
})
