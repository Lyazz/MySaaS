import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'

const parseBuffer = (response: any, callback: any) => {
    const chunks: Buffer[] = []
    response.on('data', (chunk: Buffer | string) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
    response.on('end', () => callback(null, Buffer.concat(chunks)))
}

describe('Sales invoice API', () => {
    const slugA = `invoice-a-${Date.now()}`
    const slugB = `invoice-b-${Date.now()}`
    const hostA = `${slugA}.localhost:3000`
    const hostB = `${slugB}.localhost:3000`

    let tenantAId: string
    let tenantBId: string
    let tokenA: string
    let productAId: string
    let productBId: string
    let posSaleAId: string
    let deliveredOrderAId: string
    let posSaleBId: string

    beforeAll(async () => {
        const tenantA = await prisma.tenant.create({ data: { publishedAt: new Date(), name: 'Invoice Tenant A', slug: slugA } })
        tenantAId = tenantA.id
        const tenantB = await prisma.tenant.create({ data: { publishedAt: new Date(), name: 'Invoice Tenant B', slug: slugB } })
        tenantBId = tenantB.id

        const adminA = await prisma.user.create({
            data: { tenantId: tenantAId, email: `admin-${slugA}@example.com`, role: 'admin', passwordHash: 'x' }
        })
        tokenA = signAccessToken({ userId: adminA.id, email: adminA.email, role: adminA.role, tenantId: adminA.tenantId })

        await prisma.storeSettings.create({
            data: {
                tenantId: tenantAId,
                salesInvoiceEnabled: true,
                invoiceNumberPrefix: 'INV',
                invoiceFooterText: 'Thank you',
                invoiceShowLogo: false
            }
        })
        await prisma.storeSettings.create({
            data: { tenantId: tenantBId, salesInvoiceEnabled: true, invoiceNumberPrefix: 'INV' }
        })

        const [productA, productB] = await Promise.all([
            prisma.product.create({
                data: { tenantId: tenantAId, title: 'Invoice Product A', slug: `invoice-a-${Date.now()}`, price: 100, stock: 10 }
            }),
            prisma.product.create({
                data: { tenantId: tenantBId, title: 'Invoice Product B', slug: `invoice-b-${Date.now()}`, price: 150, stock: 10 }
            })
        ])
        productAId = productA.id
        productBId = productB.id

        const saleA = await prisma.sale.create({
            data: {
                tenantId: tenantAId,
                totalAmount: 200,
                status: 'COMPLETED',
                customerName: 'POS Buyer',
                customerPhone: '0550000001'
            }
        })
        posSaleAId = saleA.id
        await prisma.saleItem.create({
            data: { tenantId: tenantAId, saleId: posSaleAId, productId: productAId, quantity: 2, price: 100 }
        })

        const orderA = await prisma.order.create({
            data: {
                tenantId: tenantAId,
                status: 'DELIVERED',
                totalAmount: 300,
                totalWithShippingAmount: 350,
                shippingAmount: 50,
                customerName: 'Order Buyer',
                customerPhone: '0550000002'
            }
        })
        deliveredOrderAId = orderA.id
        await prisma.orderItem.create({
            data: {
                tenantId: tenantAId,
                orderId: deliveredOrderAId,
                productId: productAId,
                quantity: 3,
                price: 100,
                lineTotal: 300
            }
        })

        const saleB = await prisma.sale.create({
            data: {
                tenantId: tenantBId,
                totalAmount: 150,
                status: 'COMPLETED',
                customerName: 'Other Buyer',
                customerPhone: '0550000003'
            }
        })
        posSaleBId = saleB.id
        await prisma.saleItem.create({
            data: { tenantId: tenantBId, saleId: posSaleBId, productId: productBId, quantity: 1, price: 150 }
        })
    })

    afterAll(async () => {
        const tenantIds = [tenantAId, tenantBId].filter((id): id is string => typeof id === 'string' && id.length > 0)
        if (tenantIds.length === 0) return

        await prisma.salesInvoice.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.saleItem.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.sale.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.orderItem.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.order.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.product.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.storeSettings.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.user.deleteMany({ where: { tenantId: { in: tenantIds } } })
        await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } })
    })

    it('requires authentication to create an invoice', async () => {
        const res = await request(app)
            .post(`/api/admin/sales/${posSaleAId}/invoice`)
            .set('X-Forwarded-Host', hostA)

        expect(res.status).toBe(401)
    })

    it('creates invoices idempotently for POS sales', async () => {
        const first = await request(app)
            .post(`/api/admin/sales/${posSaleAId}/invoice`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)

        const second = await request(app)
            .post(`/api/admin/sales/${posSaleAId}/invoice`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)

        expect(first.status).toBe(200)
        expect(second.status).toBe(200)
        expect(second.body.invoice.invoiceNumber).toBe(first.body.invoice.invoiceNumber)
        expect(first.body.invoice.invoiceNumber).toMatch(/^INV-SALE-/)
    })

    it('returns a POS sale invoice PDF', async () => {
        const res = await request(app)
            .get(`/api/admin/sales/${posSaleAId}/invoice/pdf`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)
            .buffer(true)
            .parse(parseBuffer)

        expect(res.status).toBe(200)
        expect(res.headers['content-type']).toContain('application/pdf')
        expect(Buffer.isBuffer(res.body)).toBe(true)
        expect(res.body.subarray(0, 4).toString('utf8')).toBe('%PDF')
    })

    it('returns a delivered order-origin invoice PDF', async () => {
        const res = await request(app)
            .get(`/api/admin/sales/${deliveredOrderAId}/invoice/pdf`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)
            .buffer(true)
            .parse(parseBuffer)

        expect(res.status).toBe(200)
        expect(res.headers['content-type']).toContain('application/pdf')
        expect(res.body.subarray(0, 4).toString('utf8')).toBe('%PDF')
    })

    it('does not allow Tenant A to read Tenant B invoice PDF', async () => {
        const res = await request(app)
            .get(`/api/admin/sales/${posSaleBId}/invoice/pdf`)
            .set('X-Forwarded-Host', hostA)
            .set('Authorization', `Bearer ${tokenA}`)

        expect(res.status).toBe(404)
    })

    it('does not allow Tenant A token on Tenant B host', async () => {
        const res = await request(app)
            .get(`/api/admin/sales/${posSaleBId}/invoice/pdf`)
            .set('X-Forwarded-Host', hostB)
            .set('Authorization', `Bearer ${tokenA}`)

        expect(res.status).toBe(403)
    })
})
