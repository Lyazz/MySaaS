import { test, expect } from '@playwright/test'
import prisma from '../../backend/src/lib/prisma'

test.describe('Landing Page Separation', () => {
    test.use({
        extraHTTPHeaders: {
            'X-Forwarded-Host': 'localhost:3000', // Simulator for main site
        }
    });

    test('Root domain shows SaaS Landing Page', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/Swekly - The Future of Commerce/);
        await expect(page.locator('text=Ready to launch?')).toBeVisible();
        await expect(page.locator('nav >> text=Pricing')).toBeVisible();
    });
});

test.describe('Tenant Storefront', () => {
    const timestamp = Date.now()
    const tenantSlug = `tenant-e2e-${timestamp}`
    const tenantHost = `${tenantSlug}.localhost:3000`
    let tenantId: string

    test.beforeAll(async () => {
        const tenant = await prisma.tenant.create({
            data: { name: 'Tenant E2E Store', slug: tenantSlug }
        })
        tenantId = tenant.id
        await prisma.storeSettings.create({ data: { tenantId: tenant.id, templateKey: 'modern' } })
    })

    test.afterAll(async () => {
        if (!tenantId) return
        await prisma.storeSettings.deleteMany({ where: { tenantId } })
        await prisma.tenant.delete({ where: { id: tenantId } })
    })

    test('Tenant host shows Tenant Storefront (not SaaS landing)', async ({ page }) => {
        await page.goto(`http://${tenantHost}/`);

        await expect(page.getByRole('link', { name: /Tenant E2E Store/ })).toBeVisible()
        await expect(page.locator('nav >> text=Products')).toBeVisible()

        // Should NOT see SaaS landing elements
        await expect(page.locator('nav >> text=Pricing')).toBeHidden()
    });
});
