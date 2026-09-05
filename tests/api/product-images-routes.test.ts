import request from 'supertest'
import { describe, it, expect, beforeAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'

const createTestPng = () =>
    Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89,
        0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54,
        0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01,
        0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
        0xae, 0x42, 0x60, 0x82
    ])

describe('Admin product image routes', () => {
    const slug = `imgroutes-${Date.now()}`
    const host = `${slug}.localhost:3000`
    let tenantId: string
    let token: string
    let productId: string

    beforeAll(async () => {
        const tenant = await prisma.tenant.create({ data: { publishedAt: new Date(), name: 'ImgRoutes', slug } })
        tenantId = tenant.id
        const admin = await prisma.user.create({
            data: { tenantId, email: `admin-${slug}@example.com`, role: 'admin', passwordHash: 'x' }
        })
        token = signAccessToken({ userId: admin.id, email: admin.email, role: admin.role, tenantId: admin.tenantId })

        const createRes = await request(app)
            .post('/api/admin/products')
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${token}`)
            .send({ title: 'Image Routes Product', slug: `image-routes-${Date.now()}`, price: 50, isActive: true })
        productId = createRes.body.id
    })

    // Regression test: PUT /:productId/images/sync and /reorder previously matched the earlier
    // `PUT /:productId/images/:imageId` route (Express matches in registration order), so every
    // save from the product edit page silently failed to create/update ProductImage rows.
    it('reaches PUT .../images/sync (not the :imageId update handler) and creates rows', async () => {
        const upload = await request(app)
            .post('/api/upload')
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${token}`)
            .attach('file', createTestPng(), { filename: 'a.png', contentType: 'image/png' })
        const url = upload.body.url

        const syncRes = await request(app)
            .put(`/api/admin/products/${productId}/images/sync`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${token}`)
            .send({ images: [{ id: null, url, alt: '', position: 0, isMain: true }] })

        expect(syncRes.status).toBe(200)

        const rows = await prisma.productImage.findMany({ where: { tenantId, productId } })
        expect(rows.length).toBe(1)
        expect(rows[0]!.url).toBe(url)
    })

    it('reaches PUT .../images/reorder (not the :imageId update handler)', async () => {
        const rows = await prisma.productImage.findMany({ where: { tenantId, productId } })
        const reorderRes = await request(app)
            .put(`/api/admin/products/${productId}/images/reorder`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${token}`)
            .send({ imageIds: rows.map((r) => r.id) })

        expect(reorderRes.status).not.toBe(500)
    })

    it('still updates and deletes a real image by id', async () => {
        const rows = await prisma.productImage.findMany({ where: { tenantId, productId } })
        const imageId = rows[0]!.id

        const updateRes = await request(app)
            .put(`/api/admin/products/${productId}/images/${imageId}`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${token}`)
            .send({ alt: 'updated alt' })
        expect(updateRes.status).toBe(200)

        const deleteRes = await request(app)
            .delete(`/api/admin/products/${productId}/images/${imageId}`)
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${token}`)
        expect(deleteRes.status).toBe(200)
    })
})
