import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'

describe('Tenancy (DB-level constraints)', () => {
    let tenantAId: string
    let tenantBId: string
    let productAId: string
    let productBId: string
    let orderAId: string
    let optionBId: string
    let shipmentAId: string

    beforeAll(async () => {
        const [tenantA, tenantB] = await prisma.$transaction([
            prisma.tenant.create({ data: { name: 'Constraint Tenant A', slug: `c-a-${Date.now()}` } }),
            prisma.tenant.create({ data: { name: 'Constraint Tenant B', slug: `c-b-${Date.now()}` } })
        ])

        tenantAId = tenantA.id
        tenantBId = tenantB.id

        const [productA, productB] = await prisma.$transaction([
            prisma.product.create({
                data: { tenantId: tenantAId, title: 'A Product', slug: `a-${Date.now()}`, price: 100, stock: 10 }
            }),
            prisma.product.create({
                data: { tenantId: tenantBId, title: 'B Product', slug: `b-${Date.now()}`, price: 120, stock: 10 }
            })
        ])
        productAId = productA.id
        productBId = productB.id

        const orderA = await prisma.order.create({
            data: {
                tenantId: tenantAId,
                status: 'PENDING',
                totalAmount: 100,
                customerName: 'Alice',
                customerPhone: '0550123456'
            }
        })
        orderAId = orderA.id

        const optionB = await prisma.productOption.create({
            data: {
                tenantId: tenantBId,
                productId: productBId,
                name: 'Size',
                position: 0,
                displayType: 'dropdown'
            }
        })
        optionBId = optionB.id

        const shipmentA = await prisma.shipment.create({
            data: {
                tenantId: tenantAId,
                orderId: orderAId,
                provider: 'SELF',
                status: 'PENDING',
                contactName: 'Alice',
                contactPhone: '0550123456',
                wilayaCode: '16',
                addressLine1: '123 Rue Test'
            }
        })
        shipmentAId = shipmentA.id
    })

    afterAll(async () => {
        await prisma.shipmentEvent.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.shipment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })

        await prisma.orderItem.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.order.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })

        await prisma.productOptionValue.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.productOption.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.productImage.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.productVariant.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })
        await prisma.product.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } })

        await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } })
    })

    it('prevents creating a ProductImage that links to another tenant product', async () => {
        await expect(
            prisma.productImage.create({
                data: {
                    tenantId: tenantAId,
                    productId: productBId,
                    url: 'https://example.com/cross-tenant.png',
                    position: 0,
                    isMain: false
                }
            })
        ).rejects.toHaveProperty('code', 'P2003')
    })

    it('prevents creating a ProductOptionValue that links to another tenant option', async () => {
        await expect(
            prisma.productOptionValue.create({
                data: {
                    tenantId: tenantAId,
                    optionId: optionBId,
                    label: 'XL',
                    position: 0
                }
            })
        ).rejects.toHaveProperty('code', 'P2003')
    })

    it('prevents creating an OrderItem that links to another tenant product', async () => {
        await expect(
            prisma.orderItem.create({
                data: {
                    tenantId: tenantAId,
                    orderId: orderAId,
                    productId: productBId,
                    quantity: 1,
                    price: 120
                }
            })
        ).rejects.toHaveProperty('code', 'P2003')
    })

    it('prevents creating a ShipmentEvent that links to another tenant shipment', async () => {
        await expect(
            prisma.shipmentEvent.create({
                data: {
                    tenantId: tenantBId,
                    shipmentId: shipmentAId,
                    status: 'IN_TRANSIT',
                    description: 'Cross-tenant event'
                }
            })
        ).rejects.toHaveProperty('code', 'P2003')
    })
})

