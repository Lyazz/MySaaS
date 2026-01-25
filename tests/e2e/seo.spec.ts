import { test, expect } from '@playwright/test'
import prisma from '../../backend/src/lib/prisma'

test.describe('Storefront SEO', () => {
    const timestamp = Date.now()
    const tenantSlug = `seo-${timestamp}`
    const tenantHost = `${tenantSlug}.localhost:3000`

    let tenantId: string
    let categoryId: string

    test.beforeAll(async () => {
        const tenant = await prisma.tenant.create({
            data: { name: 'SEO Store', slug: tenantSlug }
        })
        tenantId = tenant.id

        await prisma.storeSettings.create({ data: { tenantId: tenant.id } })

        const category = await prisma.category.create({
            data: {
                tenantId: tenant.id,
                title: 'Electronics',
                slug: 'electronics'
            }
        })
        categoryId = category.id

        await prisma.product.create({
            data: {
                tenantId: tenant.id,
                title: 'Awesome Product',
                slug: 'awesome-product',
                description: 'A product used for SEO tests.',
                price: 99.99,
                stock: 5,
                isActive: true,
                categoryId: category.id
            }
        })
    })

    test.afterAll(async () => {
        if (!tenantId) return
        await prisma.product.deleteMany({ where: { tenantId } })
        await prisma.category.deleteMany({ where: { id: categoryId } })
        await prisma.storeSettings.deleteMany({ where: { tenantId } })
        await prisma.tenant.delete({ where: { id: tenantId } })
    })

    test('Home page has correct SEO', async ({ page }) => {
        await page.goto(`http://${tenantHost}/`)
        await expect(page).toHaveTitle(/Home - SEO Store/, { timeout: 15000 })

        const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
        expect(canonical).toContain(tenantHost)
        expect(canonical).toMatch(/\/$/)
    })

    test('Product page has correct SEO and Schema', async ({ page }) => {
        await page.goto(`http://${tenantHost}/p/awesome-product`)
        await expect(page).toHaveTitle(/Awesome Product/, { timeout: 15000 })

        const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
        expect(canonical).toContain(tenantHost)
        expect(canonical).toContain('/p/awesome-product')

        const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content')
        expect(ogTitle).toContain('Awesome Product')

        const schemaScript = await page.locator('script[type="application/ld+json"]').textContent()
        const schema = JSON.parse(schemaScript || '{}')
        expect(schema['@type']).toBe('Product')
        expect(schema.name).toContain('Awesome Product')
    })

    test('Category page has correct SEO', async ({ page }) => {
        await page.goto(`http://${tenantHost}/c/electronics`)
        await expect(page).toHaveTitle(/Electronics/, { timeout: 15000 })

        const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
        expect(canonical).toContain(tenantHost)
        expect(canonical).toContain('/c/electronics')
    })

    test('Static pages have SEO', async ({ page }) => {
        await page.goto(`http://${tenantHost}/about`)
        await expect(page).toHaveTitle(/About - SEO Store/, { timeout: 15000 })

        await page.goto(`http://${tenantHost}/contact`)
        await expect(page).toHaveTitle(/Contact - SEO Store/, { timeout: 15000 })
    })
})
