import { test, expect } from '@playwright/test'
import prisma from '../../backend/src/lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

test.describe('Orders Dashboard - Tenant Isolation', () => {
    test.describe.configure({ mode: 'serial' })

    const timestamp = Date.now()
    const tenantASlug = `tenant-a-${timestamp}`
    const tenantBSlug = `tenant-b-${timestamp}`

    let tenantAId: string
    let tenantBId: string
    let tenantAToken: string
    let tenantBToken: string
    let tenantAOrderId: string
    let tenantBOrderId: string
    let tenantAProductId: string
    let tenantBProductId: string

    const baseUrl = 'http://localhost:3000'

    const loginAs = async (page: any, email: string, password: string) => {
        await page.goto(`${baseUrl}/login`)
        await page.waitForLoadState('networkidle')
        await page.fill('input[name="email"]', email)
        await page.fill('input[name="password"]', password)

        const loginResponsePromise = page.waitForResponse(
            (r: any) => r.url().includes('/api/login') && r.request().method() === 'POST'
        )
        await page.click('button[type="submit"]')

        const loginRes = await loginResponsePromise
        expect(loginRes.ok()).toBeTruthy()
        await page.waitForURL(/.*\/admin/)
    }

    test.beforeAll(async ({ request }) => {

        // Create Tenant A in database
        const tenantA = await prisma.tenant.create({
            data: {
                publishedAt: new Date(),
                name: 'Tenant A Store',
                slug: tenantASlug
            }
        })
        tenantAId = tenantA.id
        await prisma.storeSettings.create({ data: { tenantId: tenantA.id, isCompleted: true } })

        // Create Tenant B in database
        const tenantB = await prisma.tenant.create({
            data: {
                publishedAt: new Date(),
                name: 'Tenant B Shop',
                slug: tenantBSlug
            }
        })
        tenantBId = tenantB.id
        await prisma.storeSettings.create({ data: { tenantId: tenantB.id, isCompleted: true } })

        // Create user for Tenant A
        const hashedPasswordA = await bcrypt.hash('password123', 10)
        const userA = await prisma.user.create({
            data: {
                email: 'admin-a@tenant-a.com',
                passwordHash: hashedPasswordA,
                role: 'owner',
                isSuperAdmin: false,
                tenantId: tenantA.id
            }
        })

        // Generate token for Tenant A
        tenantAToken = jwt.sign(
            { userId: userA.id, email: userA.email, role: userA.role, tenantId: userA.tenantId },
            process.env.JWT_SECRET!,
            { expiresIn: '24h' }
        )

        // Create user for Tenant B
        const hashedPasswordB = await bcrypt.hash('password123', 10)
        const userB = await prisma.user.create({
            data: {
                email: 'admin-b@tenant-b.com',
                passwordHash: hashedPasswordB,
                role: 'owner',
                isSuperAdmin: false,
                tenantId: tenantB.id
            }
        })

        // Generate token for Tenant B
        tenantBToken = jwt.sign(
            { userId: userB.id, email: userB.email, role: userB.role, tenantId: userB.tenantId },
            process.env.JWT_SECRET!,
            { expiresIn: '24h' }
        )

        // Create product for Tenant A
        const productA = await request.post(`${baseUrl}/api/admin/products`, {
            headers: {
                Authorization: `Bearer ${tenantAToken}`
            },
            data: {
                title: 'Product A',
                slug: 'product-a',
                price: 100,
                description: 'Test product for tenant A',
                isActive: true,
                stock: 20
            }
        })
        expect(productA.ok()).toBeTruthy()
        const productAData = await productA.json()
        tenantAProductId = productAData.id

        // Create order for Tenant A
        const orderA = await request.post(`${baseUrl}/api/orders`, {
            headers: { 'X-Forwarded-Host': `${tenantASlug}.localhost:3000` },
            data: {
                customerName: 'Customer A',
                customerPhone: '+213555000001',
                customerAddress: 'Algiers, Algeria',
                items: [
                    {
                        productId: tenantAProductId,
                        quantity: 2,
                        price: 100
                    }
                ]
            }
        })
        expect(orderA.ok()).toBeTruthy()
        const orderAData = await orderA.json()
        tenantAOrderId = orderAData.orderId

        // Create product for Tenant B
        const productB = await request.post(`${baseUrl}/api/admin/products`, {
            headers: {
                Authorization: `Bearer ${tenantBToken}`
            },
            data: {
                title: 'Product B',
                slug: 'product-b',
                price: 200,
                description: 'Test product for tenant B',
                isActive: true,
                stock: 20
            }
        })
        expect(productB.ok()).toBeTruthy()
        const productBData = await productB.json()
        tenantBProductId = productBData.id

        // Create order for Tenant B
        const orderB = await request.post(`${baseUrl}/api/orders`, {
            headers: { 'X-Forwarded-Host': `${tenantBSlug}.localhost:3000` },
            data: {
                customerName: 'Customer B',
                customerPhone: '+213555000002',
                customerAddress: 'Oran, Algeria',
                items: [
                    {
                        productId: tenantBProductId,
                        quantity: 1,
                        price: 200
                    }
                ]
            }
        })
        expect(orderB.ok()).toBeTruthy()
        const orderBData = await orderB.json()
        tenantBOrderId = orderBData.orderId
    })

    test.afterAll(async () => {
        // Cleanup - only if tenant IDs are defined
        if (tenantAId || tenantBId) {
            const tenantIds = [tenantAId, tenantBId].filter(id => id !== undefined)
            if (tenantIds.length > 0) {
                await prisma.orderItem.deleteMany({ where: { order: { tenantId: { in: tenantIds } } } })
                await prisma.order.deleteMany({ where: { tenantId: { in: tenantIds } } })
                await prisma.product.deleteMany({ where: { tenantId: { in: tenantIds } } })
                await prisma.user.deleteMany({ where: { tenantId: { in: tenantIds } } })
                await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } })
            }
        }
    })

    test('Tenant A can list their own orders', async ({ page }) => {
        await loginAs(page, 'admin-a@tenant-a.com', 'password123')

        // Navigate to orders
        await page.goto(`${baseUrl}/admin/orders`)

        // Wait for orders to load
        await page.waitForSelector('table', { timeout: 10000 })

        // Verify Tenant A sees their order
        const orderText = await page.textContent('body')
        expect(orderText).toContain('Customer A')
        expect(orderText).not.toContain('Customer B')
    })

    test('Tenant B can list their own orders', async ({ page }) => {
        await loginAs(page, 'admin-b@tenant-b.com', 'password123')

        // Navigate to orders
        await page.goto(`${baseUrl}/admin/orders`)

        // Wait for orders to load
        await page.waitForSelector('table', { timeout: 10000 })

        // Verify Tenant B sees their order
        const orderText = await page.textContent('body')
        expect(orderText).toContain('Customer B')
        expect(orderText).not.toContain('Customer A')
    })

    test('Tenant A can view and update their order status', async ({ page }) => {
        await loginAs(page, 'admin-a@tenant-a.com', 'password123')

        // View order detail
        await page.goto(`${baseUrl}/admin/orders/${tenantAOrderId}`)

        // Verify order details are visible
        await expect(page.locator('text=Customer A')).toBeVisible()
        await expect(page.locator('text=+213555000001')).toBeVisible()

        // Update status to CONFIRMED
        await page.selectOption('select#status', 'CONFIRMED')
        await page.click('button[type="submit"]')

        // Verify success message
        await expect(page.locator('text=Order status updated successfully')).toBeVisible({ timeout: 5000 })
    })

    test('Tenant B cannot access Tenant A order via API', async ({ request }) => {
        // Attempt to access Tenant A's order using Tenant B's token
        const response = await request.get(`${baseUrl}/api/admin/orders/${tenantAOrderId}`, {
            headers: {
                Authorization: `Bearer ${tenantBToken}`
            }
        })

        // Should return 404 (order not found in Tenant B's context)
        expect(response.status()).toBe(404)
    })

    test('Tenant B cannot update Tenant A order status via API', async ({ request }) => {
        // Attempt to update Tenant A's order using Tenant B's token
        const response = await request.patch(`${baseUrl}/api/admin/orders/${tenantAOrderId}`, {
            headers: {
                Authorization: `Bearer ${tenantBToken}`
            },
            data: { status: 'CANCELLED' }
        })

        // Should return 404 (order not found in Tenant B's context)
        expect(response.status()).toBe(404)

        // Verify Tenant A's order status hasn't changed
        const verifyResponse = await request.get(`${baseUrl}/api/admin/orders/${tenantAOrderId}`, {
            headers: {
                Authorization: `Bearer ${tenantAToken}`
            }
        })
        const orderData = await verifyResponse.json()
        expect(orderData.status).not.toBe('CANCELLED')
    })

    test('Tenant B admin cannot access Tenant A order via browser', async ({ page }) => {
        await loginAs(page, 'admin-b@tenant-b.com', 'password123')

        // Try to access Tenant A's order
        await page.goto(`${baseUrl}/admin/orders/${tenantAOrderId}`)

        // Should see "Order not found" error
        await expect(page.locator('text=Order not found')).toBeVisible({ timeout: 5000 })
    })

    test('Orders can be filtered by status', async ({ page }) => {
        await loginAs(page, 'admin-a@tenant-a.com', 'password123')

        // Navigate to orders
        await page.goto(`${baseUrl}/admin/orders`)
        await page.waitForSelector('table', { timeout: 10000 })

        // Filter by CONFIRMED status
        await page.selectOption('select', 'CONFIRMED')
        await page.waitForTimeout(1000) // Wait for filter to apply

        // Should see Customer A (confirmed order)
        const orderText = await page.textContent('body')
        expect(orderText).toContain('Customer A')

        // Filter by PENDING status (might be empty depending on previous updates)
        await page.selectOption('select', 'PENDING')
        await page.waitForTimeout(1000)
    })

    test('Orders can be searched by customer name', async ({ page }) => {
        await loginAs(page, 'admin-a@tenant-a.com', 'password123')

        // Navigate to orders
        await page.goto(`${baseUrl}/admin/orders`)
        await page.waitForSelector('table', { timeout: 10000 })

        // Search for customer
        await page.fill('input[placeholder*="Search"]', 'Customer A')
        await page.waitForTimeout(1000)

        // Should see Customer A
        const orderText = await page.textContent('body')
        expect(orderText).toContain('Customer A')
    })
})
