import { test, expect } from '@playwright/test'
import prisma from '../../backend/src/lib/prisma'

test.describe('Super Admin Dashboard', () => {
    test.describe.configure({ mode: 'serial' })

    const timestamp = Date.now()
    const tenantSlug = `test-sa-${timestamp}`
    const adminEmail = `superadmin-${timestamp}@test.com`
    const password = 'SuperAdmin123!'

    let superAdminUserId: string
    let tenantId: string
    let createdTenantSlug: string | null = null
    let suspendTenantSlug: string | null = null

    const loginSuperAdmin = async (page: any) => {
        await page.goto('/super-admin/login')
        await page.waitForLoadState('networkidle')
        await page.fill('input[type="email"]', adminEmail)
        await page.fill('input[type="password"]', password)

        const loginResponsePromise = page.waitForResponse(
            (r: any) => r.url().includes('/api/login') && r.request().method() === 'POST'
        )
        await page.click('button[type="submit"]')
        const loginRes = await loginResponsePromise
        expect(loginRes.ok()).toBeTruthy()
        await expect(page).toHaveURL(/\/super-admin\/?$/, { timeout: 15000 })
    }

    test.beforeAll(async () => {
        // Create a test tenant
        const tenant = await prisma.tenant.create({
            data: {
                name: 'Super Admin Test Tenant',
                slug: tenantSlug
            }
        })
        tenantId = tenant.id

        // Create a super admin user
        const bcrypt = await import('bcryptjs')
        const hashedPassword = await bcrypt.hash(password, 10)
        const superAdmin = await prisma.user.create({
            data: {
                email: adminEmail,
                passwordHash: hashedPassword,
                role: 'owner',
                isSuperAdmin: true,
                tenantId: tenant.id
            }
        })
        superAdminUserId = superAdmin.id
    })

    test.afterAll(async () => {
        const slugs = [tenantSlug, createdTenantSlug, suspendTenantSlug].filter(Boolean) as string[]
        if (!slugs.length) return

        const tenants = await prisma.tenant.findMany({ where: { slug: { in: slugs } }, select: { id: true } })
        const tenantIds = tenants.map((t) => t.id)

        if (tenantIds.length) {
            await prisma.auditLog.deleteMany({ where: { tenantId: { in: tenantIds } } }).catch(() => { })
            await prisma.storeSettings.deleteMany({ where: { tenantId: { in: tenantIds } } }).catch(() => { })
            await prisma.user.deleteMany({ where: { tenantId: { in: tenantIds } } }).catch(() => { })
            await prisma.tenantDomain.deleteMany({ where: { tenantId: { in: tenantIds } } }).catch(() => { })
            await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } }).catch(() => { })
        }

        // Best-effort cleanup for the initial super admin user if it still exists
        if (superAdminUserId) {
            await prisma.user.delete({ where: { id: superAdminUserId } }).catch(() => { })
        }
    })

    test('should login as super admin and access dashboard', async ({ page }) => {
        await loginSuperAdmin(page)

        // Verify dashboard content
        await expect(page.locator('h1:has-text("Platform Dashboard")')).toBeVisible({ timeout: 15000 })
        await expect(page.locator('text=Total Tenants')).toBeVisible({ timeout: 15000 })
        await expect(page.locator('text=Total Users')).toBeVisible({ timeout: 15000 })
    })

    test('should navigate between super admin pages', async ({ page }) => {
        await loginSuperAdmin(page)

        // Navigate to Tenants page
        await page.click('a[href="/super-admin/tenants"]')
        await expect(page).toHaveURL(/.*\/super-admin\/tenants/)
        await expect(page.locator('h1:has-text("Tenant Management")')).toBeVisible()

        // Navigate to Analytics page
        await page.click('a[href="/super-admin/analytics"]')
        await expect(page).toHaveURL(/.*\/super-admin\/analytics/)
        await expect(page.locator('h1:has-text("Platform Analytics")')).toBeVisible()

        // Navigate to Audit Logs page
        await page.click('a[href="/super-admin/audit-logs"]')
        await expect(page).toHaveURL(/.*\/super-admin\/audit-logs/)
        await expect(page.locator('h1:has-text("Audit Logs")')).toBeVisible()
    })

    test('should create a new tenant', async ({ page }) => {
        await loginSuperAdmin(page)

        // Go to tenants page
        await page.click('a[href="/super-admin/tenants"]')
        await expect(page).toHaveURL(/.*\/super-admin\/tenants/, { timeout: 15000 })

        // Click Create Tenant button
        await page.click('button:has-text("Create Tenant")')
        await expect(page.locator('text=Create New Tenant')).toBeVisible({ timeout: 5000 })

        // Fill in the form
        const newTenantSlug = `test-sa-new-${timestamp}`
        await page.fill('input[placeholder="Acme Corp"]', 'New Test Tenant')
        await page.fill('input[placeholder="acme"]', newTenantSlug)
        await page.fill('input[placeholder="admin@acme.com"]', `owner-${timestamp}@test.com`)
        await page.fill('input[type="password"]', 'Password123!')

        // Submit the form
        const createResponsePromise = page.waitForResponse(
            (r) => r.url().includes('/api/super-admin/tenants') && r.request().method() === 'POST'
        )
        await page.click('button[type="submit"]:has-text("Create")')
        const createRes = await createResponsePromise
        expect(createRes.ok()).toBeTruthy()

        // Wait for modal to close and tenant to appear in the list
        await expect(page.locator(`text=${newTenantSlug}`)).toBeVisible({ timeout: 15000 })
        createdTenantSlug = newTenantSlug

        // Verify the tenant was created
        const tenant = await prisma.tenant.findUnique({ where: { slug: newTenantSlug } })
        expect(tenant).toBeTruthy()
        expect(tenant?.name).toBe('New Test Tenant')
    })

    test('should suspend and unsuspend a tenant', async ({ page }) => {
        // Create a tenant to suspend
        suspendTenantSlug = `test-sa-suspend-${timestamp}`
        const tenant = await prisma.tenant.create({
            data: {
                name: 'Suspend Test Tenant',
                slug: suspendTenantSlug!
            }
        })

        await loginSuperAdmin(page)

        // Go to tenants page
        await page.click('a[href="/super-admin/tenants"]')
        await expect(page).toHaveURL(/.*\/super-admin\/tenants/, { timeout: 15000 })

        // Find the tenant row and click suspend
        const tenantRow = page.locator(`tr:has-text("${suspendTenantSlug}")`)
        page.once('dialog', (dialog) => dialog.accept())
        await tenantRow.locator('button[title="Suspend"]').click()

        // Wait for the status to change
        await expect(tenantRow.locator('text=Suspended')).toBeVisible({ timeout: 5000 })

        // Verify in database
        let updatedTenant = await prisma.tenant.findUnique({ where: { id: tenant.id } })
        expect(updatedTenant?.isSuspended).toBe(true)

        // Now unsuspend
        await tenantRow.locator('button[title="Activate"]').click()

        // Wait for status to change back
        await expect(tenantRow.locator('text=Active')).toBeVisible({ timeout: 5000 })

        // Verify in database
        updatedTenant = await prisma.tenant.findUnique({ where: { id: tenant.id } })
        expect(updatedTenant?.isSuspended).toBe(false)
    })

    test('should view platform analytics', async ({ page }) => {
        await loginSuperAdmin(page)

        // Navigate to analytics
        await page.goto('/super-admin/analytics')

        // Verify analytics content loads
        await expect(page.locator('h1:has-text("Platform Analytics")')).toBeVisible()
        await expect(page.locator('text=Total Platform Revenue')).toBeVisible()
        await expect(page.locator('text=Active Tenants')).toBeVisible()
        await expect(page.locator('text=Revenue by Tenant')).toBeVisible()
    })

    test('should view and filter audit logs', async ({ page }) => {
        await loginSuperAdmin(page)

        // Navigate to audit logs
        await page.goto('/super-admin/audit-logs')

        // Verify audit logs page loads
        await expect(page.locator('h1:has-text("Audit Logs")')).toBeVisible()

        // Test filtering
        await page.selectOption('select', 'CREATE_TENANT')

        // All rows should have CREATE_TENANT action
        const rows = page.locator('tbody tr')
        const count = await rows.count()
        if (count > 0) {
            await expect(rows.first()).toContainText(/CREATE TENANT/)
        }
    })

    test('should prevent non-super-admin from accessing super admin area', async ({ page }) => {
        // Create a regular user
        const regularUserEmail = `regular-${Date.now()}@test.com`
        const bcrypt = await import('bcryptjs')
        const hashedPassword = await bcrypt.hash(password, 10)
        const regularUser = await prisma.user.create({
            data: {
                email: regularUserEmail,
                passwordHash: hashedPassword,
                role: 'staff',
                isSuperAdmin: false,
                tenantId: tenantId
            }
        })

        // Try to login as regular user to super admin area
        await page.goto('/super-admin/login')
        await page.waitForLoadState('networkidle')
        await page.fill('input[type="email"]', regularUserEmail)
        await page.fill('input[type="password"]', password)
        await page.click('button[type="submit"]')

        // Should see error message
        await expect(page.locator('text=Access denied: Super admin privileges required')).toBeVisible({ timeout: 5000 })

        // Should NOT redirect to super admin dashboard
        await expect(page).toHaveURL(/.*\/super-admin\/login/)

        // Cleanup
        await prisma.user.delete({ where: { id: regularUser.id } })
    })

    test('should redirect super admin from tenant admin area to super admin dashboard', async ({ page }) => {
        await loginSuperAdmin(page)

        // Try to access tenant admin dashboard
        await page.goto('/admin')

        // Should be redirected back to super admin dashboard
        await expect(page).toHaveURL(/\/super-admin\/?$/)
        await expect(page.locator('h1:has-text("Platform Dashboard")')).toBeVisible()
    })
})
