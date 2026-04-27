import { test, expect } from '@playwright/test'

test.describe('Storefront i18n', () => {
  const timestamp = Date.now()
  const slug = `i18n-store-${timestamp}`
  const email = `admin-i18n-store-${timestamp}@example.com`
  const password = 'Password123!'
  const phone = '+213550000001'

  test('switches tenant storefront UI to French and Arabic', async ({ page }) => {
    test.setTimeout(120000)

    // Register tenant on SaaS host
    await page.goto('/register')
    await page.waitForLoadState('networkidle')
    await page.fill('input[name="name"]', `I18n Store ${timestamp}`)
    await page.fill('input[name="slug"]', slug)
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="phone"]', phone)
    await page.getByTestId('register-send-otp').click()
    await page.fill('input[name="otp"]', '123456')
    await page.getByTestId('register-verify-otp').click()
    await page.fill('input[name="password"]', password)
    await page.fill('input[name="confirmPassword"]', password)
    const registerResponsePromise = page.waitForResponse(
      (r) => r.url().includes('/api/register') && r.request().method() === 'POST'
    )
    await page.click('button[type="submit"]')
    const registerRes = await registerResponsePromise
    expect(registerRes.ok()).toBe(true)

    // Open tenant storefront on same origin, injecting X-Forwarded-Host for tenant resolution.
    const forwardedHost = `${slug}.localhost:3000`
    let acceptLanguage = 'en'
    await page.route('http://localhost:3000/**', async (route) => {
      const headers = {
        ...route.request().headers(),
        'x-forwarded-host': forwardedHost,
        'accept-language': acceptLanguage
      }
      await route.continue({ headers })
    })
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // French
    acceptLanguage = 'fr'
    await page.context().addCookies([
      { name: 'i18n_redirected', value: 'fr', domain: 'localhost', path: '/' }
    ])
    await page.goto('/cart', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('text=Commencer vos achats').first()).toBeVisible()

    // Arabic (RTL)
    acceptLanguage = 'ar'
    await page.context().addCookies([
      { name: 'i18n_redirected', value: 'ar', domain: 'localhost', path: '/' }
    ])
    await page.goto('/cart', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')

    await expect(page.locator('text=ابدأ التسوق').first()).toBeVisible()
  })
})
