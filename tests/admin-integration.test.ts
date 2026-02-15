import { describe, it, expect } from 'vitest'
import request from 'supertest'
import prisma from '../backend/src/lib/prisma'
import app from '../backend/src/app'
import { signAccessToken } from '../backend/src/lib/jwt'

describe('Express Admin API', () => {

    // Setup test data
    const slug = `admin-test-${Date.now()}`
    const email = `admin-${slug}@example.com`
    let tenantId: string
    let userId: string
    let token: string // Valid JWT token
    let productId: string
    let categoryId: string
    let secondCategoryId: string

    it('registers a tenant successfully', async () => {
        const res = await request(app).post('/api/register').send({
            name: 'Admin Test Tenant',
            slug,
            email,
            password: 'password123'
        })

        const body = res.body
        expect(res.status).toBe(200)
        expect(body.success).toBe(true)

        tenantId = body.tenant.id
        // Find the user created
        const user = await prisma.user.findFirst({ where: { email } })
        expect(user).toBeTruthy()
        userId = user!.id

        token = signAccessToken({ userId })
    })

    it('Create Product (Admin)', async () => {
        const images = ['http://example.com/a.jpg']
        const res = await request(app)
            .post('/api/admin/products')
            .set('X-Forwarded-Host', `${slug}.localhost:3000`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                title: 'Test Product',
                slug: 'test-product',
                price: 100,
                stock: 10,
                images
            })

        const body = res.body
        if (res.status !== 200) console.log('Create Product Failed:', res.status, body)
        expect(res.status).toBe(200)
        expect(body.title).toBe('Test Product')
        expect(body.images).toEqual(images)
        productId = body.id
    })

    it('Create Category with image (Admin)', async () => {
        const imageUrl = 'http://example.com/category-a.png'
        const res = await request(app)
            .post('/api/admin/categories')
            .set('X-Forwarded-Host', `${slug}.localhost:3000`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                title: 'Phones',
                slug: 'phones',
                imageUrl
            })

        const body = res.body
        expect(res.status).toBe(200)
        expect(body.imageUrl).toBe(imageUrl)
        categoryId = body.id
    })

    it('Update Category image (Admin)', async () => {
        const newImage = 'http://example.com/category-b.png'
        const res = await request(app)
            .put(`/api/admin/categories/${categoryId}`)
            .set('X-Forwarded-Host', `${slug}.localhost:3000`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                title: 'Phones',
                slug: 'phones',
                imageUrl: newImage
            })

        const body = res.body
        expect(res.status).toBe(200)
        expect(body.imageUrl).toBe(newImage)

        const listRes = await request(app).get('/api/categories').set('X-Forwarded-Host', `${slug}.localhost:3000`)
        const listBody = listRes.body
        expect(listRes.status).toBe(200)
        const found = listBody.find((c: any) => c.slug === 'phones')
        expect(found.imageUrl).toBe(newImage)
    })

    it('Get Category by id (Admin)', async () => {
        const res = await request(app)
            .get(`/api/admin/categories/${categoryId}`)
            .set('X-Forwarded-Host', `${slug}.localhost:3000`)
            .set('Authorization', `Bearer ${token}`)

        const body = res.body
        expect(res.status).toBe(200)
        expect(body.id).toBe(categoryId)
        expect(body.slug).toBe('phones')
    })

    it('List Categories sorted by title (Admin)', async () => {
        // Create another category to test sorting
        const createRes = await request(app)
            .post('/api/admin/categories')
            .set('X-Forwarded-Host', `${slug}.localhost:3000`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                title: 'Accessories',
                slug: 'accessories',
                imageUrl: 'http://example.com/accessories.png'
            })

        const createBody = createRes.body
        expect(createRes.status).toBe(200)
        secondCategoryId = createBody.id

        const listRes = await request(app)
            .get('/api/admin/categories?sortBy=title&sortOrder=asc')
            .set('X-Forwarded-Host', `${slug}.localhost:3000`)
            .set('Authorization', `Bearer ${token}`)

        const listBody = listRes.body
        expect(listRes.status).toBe(200)
        expect(Array.isArray(listBody)).toBe(true)
        expect(listBody[0].title).toBe('Accessories')
    })

    it('Update Product Images (Admin)', async () => {
        const images = ['http://example.com/b.jpg', 'http://example.com/c.jpg']

        const updateRes = await request(app)
            .put(`/api/admin/products/${productId}`)
            .set('X-Forwarded-Host', `${slug}.localhost:3000`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                title: 'Test Product',
                slug: 'test-product',
                price: 100,
                images
            })

        const updateBody = updateRes.body
        if (updateRes.status !== 200) console.log('Update Product Failed:', updateRes.status, updateBody)
        expect(updateRes.status).toBe(200)
        expect(updateBody.images).toEqual(images)

        const getRes = await request(app)
            .get(`/api/admin/products/${productId}`)
            .set('X-Forwarded-Host', `${slug}.localhost:3000`)
            .set('Authorization', `Bearer ${token}`)

        const getBody = getRes.body
        expect(getRes.status).toBe(200)
        expect(getBody.images).toEqual(images)
    })

    it('List Products (Admin)', async () => {
        const res = await request(app)
            .get('/api/admin/products')
            .set('X-Forwarded-Host', `${slug}.localhost:3000`)
            .set('Authorization', `Bearer ${token}`)

        const body = res.body
        expect(res.status).toBe(200)
        expect(Array.isArray(body)).toBe(true)
        expect(body.length).toBeGreaterThan(0)
        expect(body[0].title).toBe('Test Product')
    })

    it('Create Options and Generate Variants (Admin)', async () => {
        // 1. Create Option
        const optRes = await request(app)
            .post(`/api/admin/products/${productId}/options`)
            .set('X-Forwarded-Host', `${slug}.localhost:3000`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'Size',
                displayType: 'dropdown',
                values: [{ label: 'Small' }, { label: 'Medium' }]
            })
        expect(optRes.status).toBe(200)

        // 2. Generate Variants
        const genRes = await request(app)
            .post(`/api/admin/products/${productId}/variants/generate`)
            .set('X-Forwarded-Host', `${slug}.localhost:3000`)
            .set('Authorization', `Bearer ${token}`)

        const genBody = genRes.body
        expect(genRes.status).toBe(200)
        expect(genBody.length).toBe(2)

        // 3. Verify Variants created via Get Product
        const productRes = await request(app)
            .get(`/api/admin/products/${productId}`)
            .set('X-Forwarded-Host', `${slug}.localhost:3000`)
            .set('Authorization', `Bearer ${token}`)

        const productBody = productRes.body
        expect(productBody.variants.length).toBe(2)
        expect(productBody.options.length).toBe(1)
        expect(productBody.options[0].name).toBe('Size')
    })

    // Cleanup
    it('cleanups', async () => {
        // Delete tenant-owned data first (FKs do not cascade on Tenant delete)
        if (tenantId) {
            await prisma.orderItem.deleteMany({ where: { tenantId } })
            await prisma.order.deleteMany({ where: { tenantId } })
            await prisma.productVariant.deleteMany({ where: { tenantId } })
            await prisma.productOptionValue.deleteMany({ where: { tenantId } })
            await prisma.productOption.deleteMany({ where: { tenantId } })
            await prisma.productImage.deleteMany({ where: { tenantId } })
            await prisma.product.deleteMany({ where: { tenantId } })
            await prisma.category.deleteMany({ where: { tenantId } })
            await prisma.user.deleteMany({ where: { tenantId } })
            await prisma.tenant.delete({ where: { id: tenantId } })
        }
    })
})
