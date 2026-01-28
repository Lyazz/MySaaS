import { describe, it, expect } from 'vitest'
import { setup, fetch } from '@nuxt/test-utils'
import prisma from '../backend/src/lib/prisma'
import jwt from 'jsonwebtoken'

describe('Express Admin API', async () => {
    await setup({ setupTimeout: 300_000 })

    // Setup test data
    const slug = `admin-test-${Date.now()}`
    const email = `admin-${slug}@example.com`
    let tenantId: string
    let userId: string
    let token: string // Valid JWT token
    let productId: string
    let categoryId: string

    it('registers a tenant successfully', async () => {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Admin Test Tenant',
                slug,
                email,
                password: 'password123'
            })
        })
        const body = await res.json()
        expect(res.status).toBe(200)
        expect(body.success).toBe(true)

        tenantId = body.tenant.id
        // Find the user created
        const user = await prisma.user.findFirst({ where: { email } })
        expect(user).toBeTruthy()
        userId = user!.id

        // Generate valid JWT using matching secret
        const secret = process.env.JWT_SECRET || 'secret'
        token = jwt.sign(
            { userId: user!.id, email: user!.email, role: user!.role, tenantId: user!.tenantId },
            secret,
            { expiresIn: '1h' }
        )
    })

    it('Create Product (Admin)', async () => {
        const images = ['http://example.com/a.jpg']
        const res = await fetch('/api/admin/products', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Forwarded-Host': `${slug}.localhost:3000`, // Simulate tenant domain
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title: 'Test Product',
                slug: 'test-product',
                price: 100,
                stock: 10,
                images
            })
        })
        const body = await res.json()
        if (res.status !== 200) console.log('Create Product Failed:', res.status, body)
        expect(res.status).toBe(200)
        expect(body.title).toBe('Test Product')
        expect(body.images).toEqual(images)
        productId = body.id
    })

    it('Create Category with image (Admin)', async () => {
        const imageUrl = 'http://example.com/category-a.png'
        const res = await fetch('/api/admin/categories', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Forwarded-Host': `${slug}.localhost:3000`,
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title: 'Phones',
                slug: 'phones',
                imageUrl
            })
        })
        const body = await res.json()
        expect(res.status).toBe(200)
        expect(body.imageUrl).toBe(imageUrl)
        categoryId = body.id
    })

    it('Update Category image (Admin)', async () => {
        const newImage = 'http://example.com/category-b.png'
        const res = await fetch(`/api/admin/categories/${categoryId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Forwarded-Host': `${slug}.localhost:3000`,
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title: 'Phones',
                slug: 'phones',
                imageUrl: newImage
            })
        })
        const body = await res.json()
        expect(res.status).toBe(200)
        expect(body.imageUrl).toBe(newImage)

        const listRes = await fetch('/api/categories', {
            headers: {
                'X-Forwarded-Host': `${slug}.localhost:3000`
            }
        })
        const listBody = await listRes.json()
        expect(listRes.status).toBe(200)
        const found = listBody.find((c: any) => c.slug === 'phones')
        expect(found.imageUrl).toBe(newImage)
    })

    it('Update Product Images (Admin)', async () => {
        const images = ['http://example.com/b.jpg', 'http://example.com/c.jpg']

        const updateRes = await fetch(`/api/admin/products/${productId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Forwarded-Host': `${slug}.localhost:3000`,
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title: 'Test Product',
                slug: 'test-product',
                price: 100,
                stock: 10,
                images
            })
        })
        const updateBody = await updateRes.json()
        if (updateRes.status !== 200) console.log('Update Product Failed:', updateRes.status, updateBody)
        expect(updateRes.status).toBe(200)
        expect(updateBody.images).toEqual(images)

        const getRes = await fetch(`/api/admin/products/${productId}`, {
            headers: {
                'X-Forwarded-Host': `${slug}.localhost:3000`,
                'Authorization': `Bearer ${token}`
            }
        })
        const getBody = await getRes.json()
        expect(getRes.status).toBe(200)
        expect(getBody.images).toEqual(images)
    })

    it('List Products (Admin)', async () => {
        const res = await fetch('/api/admin/products', {
            headers: {
                'X-Forwarded-Host': `${slug}.localhost:3000`,
                'Authorization': `Bearer ${token}`
            }
        })
        const body = await res.json()
        expect(res.status).toBe(200)
        expect(Array.isArray(body)).toBe(true)
        expect(body.length).toBeGreaterThan(0)
        expect(body[0].title).toBe('Test Product')
    })

    it('Create Options and Generate Variants (Admin)', async () => {
        // 1. Create Option
        const optRes = await fetch(`/api/admin/products/${productId}/options`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Forwarded-Host': `${slug}.localhost:3000`,
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: 'Size',
                displayType: 'dropdown',
                values: [{ label: 'Small' }, { label: 'Medium' }]
            })
        })
        expect(optRes.status).toBe(200)

        // 2. Generate Variants
        const genRes = await fetch(`/api/admin/products/${productId}/variants/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Forwarded-Host': `${slug}.localhost:3000`,
                'Authorization': `Bearer ${token}`
            }
        })
        const genBody = await genRes.json()
        expect(genRes.status).toBe(200)
        expect(genBody.length).toBe(2)

        // 3. Verify Variants created via Get Product
        const productRes = await fetch(`/api/admin/products/${productId}`, {
            headers: {
                'X-Forwarded-Host': `${slug}.localhost:3000`,
                'Authorization': `Bearer ${token}`
            }
        })
        const productBody = await productRes.json()
        expect(productBody.variants.length).toBe(2)
        expect(productBody.options.length).toBe(1)
        expect(productBody.options[0].name).toBe('Size')
    })

    // Cleanup
    it('cleanups', async () => {
        // Delete tenant-owned data first (FKs do not cascade on Tenant delete)
        await prisma.productVariant.deleteMany({ where: { productId } })
        await prisma.product.deleteMany({ where: { id: productId } })
        await prisma.category.deleteMany({ where: { tenantId } })
        await prisma.user.deleteMany({ where: { email } })
        await prisma.tenant.delete({ where: { slug } })
    })
})
