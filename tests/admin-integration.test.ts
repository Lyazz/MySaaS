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

    it('Create Variant (Admin)', async () => {
        const res = await fetch(`/api/admin/products/${productId}/variants`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Forwarded-Host': `${slug}.localhost:3000`,
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                sku: 'VALID-SKU', // Correct field now
                optionName: 'Size',
                optionValue: 'L',
                priceDelta: 10,
                stock: 5
            })
        })
        const body = await res.json()
        expect(res.status).toBe(200)
        expect(body.sku).toBe('VALID-SKU')
    })

    // Cleanup
    it('cleanups', async () => {
        // Delete tenant-owned data first (FKs do not cascade on Tenant delete)
        await prisma.variant.deleteMany({ where: { productId } })
        await prisma.product.deleteMany({ where: { id: productId } })
        await prisma.user.deleteMany({ where: { email } })
        await prisma.tenant.delete({ where: { slug } })
    })
})
