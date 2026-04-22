import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
    // Unique values for each run to avoid collisions
    const timestamp = Date.now()
    const slug = `test-${timestamp}`
    const email = `admin-${timestamp}@example.com`
    const password = 'Password123!'

    test('should register a new tenant and then login', async ({ page }) => {
        test.setTimeout(120000)
        await page.goto('/register')
        await page.waitForLoadState('networkidle')
        await page.getByTestId('register-company').fill(`Test Tenant ${timestamp}`)
        await page.getByTestId('register-slug').fill(slug)
        await page.getByTestId('register-email').fill(email)
        await page.getByTestId('register-password').fill(password)
        const registerResponsePromise = page.waitForResponse((r) => r.url().includes('/api/register') && r.request().method() === 'POST')
        await page.click('button[type="submit"]')
        const registerRes = await registerResponsePromise
        if (!registerRes.ok()) {
            const body = await registerRes.text()
            throw new Error(`Registration failed: ${registerRes.status()} ${body}`)
        }

        try {
            await expect(page.getByTestId('register-success')).toBeVisible({ timeout: 30000 })
        } catch (e) {
            const errorLocator = page.locator('text=/error|invalid|failed/i')
            if (await errorLocator.count() > 0) {
                const errorText = await errorLocator.textContent()
                console.log(`Registration failed with error on page: ${errorText}`)
                throw new Error(`Registration failed: ${errorText}`)
            }
            throw e
        }

        await page.goto('/login')
        await page.waitForLoadState('networkidle')
        await page.getByTestId('login-email').fill(email)
        await page.getByTestId('login-password').fill(password)

        const loginResponsePromise = page.waitForResponse(
            (r) => r.url().includes('/api/login') && r.request().method() === 'POST'
        )
        await page.click('button[type="submit"]')
        const loginRes = await loginResponsePromise
        if (!loginRes.ok()) {
            const body = await loginRes.text()
            throw new Error(`Login failed: ${loginRes.status()} ${body}`)
        }

        try {
            await expect(page).toHaveURL(/.*\/admin/, { timeout: 30000 })
        } catch (e) {
            const errorLocator = page.locator('text=/error|invalid|failed/i')
            if (await errorLocator.count() > 0) {
                const errorText = await errorLocator.first().textContent()
                throw new Error(`Login failed on page: ${errorText}`)
            }
            throw e
        }

        const dashboardHeading = page.locator('h2:has-text("Welcome back!")')
        const onboardingHeading = page.locator('h2:has-text("Store setup")')
        if (await dashboardHeading.count()) {
            await expect(dashboardHeading).toBeVisible()
        } else {
            await expect(onboardingHeading).toBeVisible()
        }
    })
})
