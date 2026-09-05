import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'

describe('Variants: archived visibility + safe deletion', () => {
    const slug = `var-arch-${Date.now()}`
    const host = `${slug}.localhost:3000`
    let tenantId: string
    let adminToken: string
    let productId: string

    let optionAId: string
    let optionBId: string
    let valueA1Id: string
    let valueB1Id: string

    let activeVariantId: string
    let inactiveVariantId: string
    let incompleteVariantId: string

    beforeAll(async () => {
        const tenant = await prisma.tenant.create({ data: { publishedAt: new Date(), name: 'Variants Tenant', slug } })
        tenantId = tenant.id

        const admin = await prisma.user.create({
            data: { tenantId, email: `admin-${slug}@example.com`, role: 'admin', passwordHash: 'x' }
        })
        adminToken = signAccessToken({ userId: admin.id, email: admin.email, role: admin.role, tenantId: admin.tenantId })

        const product = await prisma.product.create({
            data: {
                tenantId,
                title: 'Variant Product',
                slug: `variant-product-${Date.now()}`,
                price: 100,
                stock: 0,
                isActive: true
            }
        })
        productId = product.id

        const [optA, optB] = await prisma.$transaction([
            prisma.productOption.create({ data: { tenantId, productId, name: 'Poids', position: 0, displayType: 'dropdown' as any } }),
            prisma.productOption.create({ data: { tenantId, productId, name: 'Type', position: 1, displayType: 'dropdown' as any } })
        ])
        optionAId = optA.id
        optionBId = optB.id

        const [valA1, valB1] = await prisma.$transaction([
            prisma.productOptionValue.create({ data: { tenantId, optionId: optionAId, label: '1kg', position: 0 } }),
            prisma.productOptionValue.create({ data: { tenantId, optionId: optionBId, label: 'Gusto', position: 0 } })
        ])
        valueA1Id = valA1.id
        valueB1Id = valB1.id

        const [activeVariant, inactiveVariant, incompleteVariant] = await prisma.$transaction([
            prisma.productVariant.create({
                data: {
                    tenantId,
                    productId,
                    sku: `VAR-ACT-${Date.now()}`,
                    price: 100,
                    stock: 0,
                    reserved: 0,
                    safetyStock: 0,
                    trackInventory: true,
                    isActive: true
                }
            }),
            prisma.productVariant.create({
                data: {
                    tenantId,
                    productId,
                    sku: `VAR-INACT-${Date.now()}`,
                    price: 100,
                    stock: 0,
                    reserved: 0,
                    safetyStock: 0,
                    trackInventory: true,
                    isActive: false
                }
            }),
            prisma.productVariant.create({
                data: {
                    tenantId,
                    productId,
                    sku: `VAR-PART-${Date.now()}`,
                    price: 100,
                    stock: 0,
                    reserved: 0,
                    safetyStock: 0,
                    trackInventory: true,
                    isActive: false
                }
            })
        ])
        activeVariantId = activeVariant.id
        inactiveVariantId = inactiveVariant.id
        incompleteVariantId = incompleteVariant.id

        await prisma.$transaction([
            prisma.productVariantOptionValue.createMany({
                data: [
                    { tenantId, variantId: activeVariantId, optionValueId: valueA1Id },
                    { tenantId, variantId: activeVariantId, optionValueId: valueB1Id },
                    { tenantId, variantId: inactiveVariantId, optionValueId: valueA1Id },
                    { tenantId, variantId: inactiveVariantId, optionValueId: valueB1Id },
                    { tenantId, variantId: incompleteVariantId, optionValueId: valueB1Id }
                ],
                skipDuplicates: true
            })
        ])
    })

    afterAll(async () => {
        await prisma.inventoryMovement.deleteMany({ where: { tenantId } })
        await prisma.productVariantImage.deleteMany({ where: { tenantId } })
        await prisma.productVariantOptionValue.deleteMany({ where: { tenantId } })
        await prisma.productVariant.deleteMany({ where: { tenantId } })
        await prisma.productOptionValue.deleteMany({ where: { tenantId } })
        await prisma.productOption.deleteMany({ where: { tenantId } })
        await prisma.product.deleteMany({ where: { tenantId } })
        await prisma.user.deleteMany({ where: { tenantId } })
        await prisma.tenant.deleteMany({ where: { id: tenantId } })
    })

    it('returns only active variants by default', async () => {
        const res = await request(app)
            .get(`/api/admin/products/${productId}`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${adminToken}`)

        expect(res.status).toBe(200)
        expect(Array.isArray(res.body?.variants)).toBe(true)
        const ids = (res.body.variants as any[]).map((v) => v.id)
        expect(ids).toContain(activeVariantId)
        expect(ids).not.toContain(inactiveVariantId)
        expect(ids).not.toContain(incompleteVariantId)
    })

    it('includes inactive variants when includeInactiveVariants=1', async () => {
        const res = await request(app)
            .get(`/api/admin/products/${productId}?includeInactiveVariants=1`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${adminToken}`)

        expect(res.status).toBe(200)
        const ids = (res.body.variants as any[]).map((v) => v.id)
        expect(ids).toContain(activeVariantId)
        expect(ids).toContain(inactiveVariantId)
        expect(ids).toContain(incompleteVariantId)
    })

    it('rejects activating an incomplete variant for current options', async () => {
        const res = await request(app)
            .put(`/api/admin/variants/${incompleteVariantId}`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ isActive: true })

        expect(res.status).toBe(400)

        const refreshed = await prisma.productVariant.findFirst({
            where: { tenantId, id: incompleteVariantId },
            select: { isActive: true }
        })
        expect(refreshed?.isActive).toBe(false)
    })

    it('archives (does not delete) a variant that has inventory movements', async () => {
        const toArchive = inactiveVariantId
        await prisma.productVariant.updateMany({ where: { tenantId, id: toArchive }, data: { isActive: true } })

        await prisma.inventoryMovement.create({
            data: {
                tenantId,
                variantId: toArchive,
                type: 'MANUAL_ADJUSTMENT' as any,
                delta: 0,
                reason: 'test_archive'
            }
        })

        const res = await request(app)
            .delete(`/api/admin/variants/${toArchive}`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${adminToken}`)

        expect(res.status).toBe(200)
        expect(res.body?.archived).toBe(true)
        expect(res.body?.deleted).toBe(false)

        const stillThere = await prisma.productVariant.findFirst({
            where: { tenantId, id: toArchive },
            select: { id: true, isActive: true }
        })
        expect(stillThere?.id).toBe(toArchive)
        expect(stillThere?.isActive).toBe(false)
    })

    it('rejects deleting a variant that still has stock balances', async () => {
        const stocked = await prisma.productVariant.create({
            data: {
                tenantId,
                productId,
                sku: `VAR-STOCK-${Date.now()}`,
                price: 100,
                stock: 3,
                reserved: 1,
                safetyStock: 0,
                trackInventory: true,
                isActive: true
            }
        })

        await prisma.productVariantOptionValue.createMany({
            data: [
                { tenantId, variantId: stocked.id, optionValueId: valueA1Id },
                { tenantId, variantId: stocked.id, optionValueId: valueB1Id }
            ],
            skipDuplicates: true
        })

        const res = await request(app)
            .delete(`/api/admin/variants/${stocked.id}`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${adminToken}`)

        expect(res.status).toBe(409)
        expect(res.body.code).toBe('VARIANT_STOCK_NOT_EMPTY')

        const stillThere = await prisma.productVariant.findFirst({
            where: { tenantId, id: stocked.id },
            select: { id: true, stock: true, reserved: true, safetyStock: true, isActive: true }
        })
        expect(stillThere).toMatchObject({
            id: stocked.id,
            stock: 3,
            reserved: 1,
            safetyStock: 0,
            isActive: true
        })
    })

    it('hard-deletes a variant with no references', async () => {
        const created = await prisma.productVariant.create({
            data: {
                tenantId,
                productId,
                sku: `VAR-DEL-${Date.now()}`,
                price: 100,
                stock: 0,
                reserved: 0,
                safetyStock: 0,
                trackInventory: true,
                isActive: false
            }
        })

        const res = await request(app)
            .delete(`/api/admin/variants/${created.id}`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${adminToken}`)

        expect(res.status).toBe(200)
        expect(res.body?.deleted).toBe(true)
        expect(res.body?.archived).toBe(false)

        const missing = await prisma.productVariant.findFirst({ where: { tenantId, id: created.id }, select: { id: true } })
        expect(missing).toBeNull()
    })
})
