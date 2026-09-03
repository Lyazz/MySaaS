import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
    // Unique values for each run to avoid collisions
    const timestamp = Date.now()
    const slug = `test-${timestamp}`
    const email = `admin-${timestamp}@example.com`
    const password = 'Password123!'
    const phone = '+213550000001'

    test('should register a new tenant and access admin without re-login', async ({ page }) => {
        test.setTimeout(120000)
        await page.goto('/register')
        await page.waitForLoadState('networkidle')
        await page.getByTestId('register-company').fill(`Test Tenant ${timestamp}`)
        await page.getByTestId('register-slug').fill(slug)
        await page.getByTestId('register-email').fill(email)
        await page.getByTestId('register-phone').fill(phone)
        // Signup now demands a verified contact. The dev server echoes the code
        // back (OTP_DEV_ECHO, set in playwright.config.ts) because there is no
        // inbox to read here; a hardcoded 123456 has not worked since the flow
        // stopped being a placeholder.
        const otpResponsePromise = page.waitForResponse(
            (r) => r.url().includes('/api/auth/otp/send') && r.request().method() === 'POST'
        )
        await page.getByTestId('register-send-otp').click()
        const otpResponse = await otpResponsePromise
        const { devCode } = (await otpResponse.json()) as { devCode?: string }
        if (!devCode) {
            throw new Error('The dev server did not echo an OTP code; is OTP_DEV_ECHO set?')
        }
        await page.getByTestId('register-otp').fill(devCode)
        await page.getByTestId('register-verify-otp').click()
        await page.getByTestId('register-password').fill(password)
        await page.getByTestId('register-confirm-password').fill(password)
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

        await page.getByTestId('register-go-dashboard').click()

        try {
            await expect(page).toHaveURL(/.*\/admin(\/onboarding)?$/, { timeout: 30000 })
        } catch (e) {
            const errorLocator = page.locator('text=/error|invalid|failed/i')
            if (await errorLocator.count() > 0) {
                const errorText = await errorLocator.first().textContent()
                throw new Error(`Admin redirect failed on page: ${errorText}`)
            }
            throw e
        }

        await expect(page).not.toHaveURL(/.*\/login/, { timeout: 5000 })

        const dashboardHeading = page.locator('h2:has-text("Welcome back!")')
        const onboardingHeading = page.locator('h2:has-text("Store setup")')
        if (await dashboardHeading.count()) {
            await expect(dashboardHeading).toBeVisible()
        } else {
            await expect(onboardingHeading).toBeVisible()
        }
    })
})
