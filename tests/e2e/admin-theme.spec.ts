import { expect, test } from '@playwright/test'

async function registerTenant(page: import('@playwright/test').Page) {
  const timestamp = Date.now()
  const slug = `theme-${timestamp}`
  const email = `theme-${timestamp}@example.com`
  const password = 'Password123!'
  const phone = '+213550000001'

  await page.goto('/register', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('register-company')).toBeVisible()
  await page.getByTestId('register-company').fill(`Theme Tenant ${timestamp}`)
  await page.getByTestId('register-slug').fill(slug)
  await page.getByTestId('register-email').fill(email)
  await page.getByTestId('register-phone').fill(phone)
  await page.getByTestId('register-send-otp').click()
  await page.getByTestId('register-otp').fill('123456')
  await page.getByTestId('register-verify-otp').click()
  await page.getByTestId('register-password').fill(password)
  await page.getByTestId('register-confirm-password').fill(password)

  const registerResponsePromise = page.waitForResponse((response) =>
    response.url().includes('/api/register') && response.request().method() === 'POST'
  )

  await page.click('button[type="submit"]')
  const registerResponse = await registerResponsePromise
  expect(registerResponse.ok()).toBeTruthy()

  await expect(page.getByTestId('register-success')).toBeVisible({ timeout: 30000 })
  await page.getByTestId('register-go-dashboard').click()
  await expect(page).toHaveURL(/.*\/admin(\/onboarding)?$/, { timeout: 30000 })
}

test('admin light theme keeps brand controls readable', async ({ page }) => {
  test.setTimeout(120000)

  await registerTenant(page)

  await page.goto('/admin/settings/functional', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('switch').first()).toBeVisible()

  await page.getByRole('button', { name: /switch to light mode/i }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  const mainBg = await page.locator('.admin-shell').evaluate((element) => getComputedStyle(element).backgroundColor)
  expect(mainBg).toBe('rgb(230, 237, 244)')

  const firstToggle = page.getByRole('switch').first()
  await firstToggle.click()
  await expect(firstToggle).toHaveAttribute('aria-checked', 'true')

  const toggleBackground = await firstToggle.evaluate((element) => getComputedStyle(element).backgroundColor)
  expect(toggleBackground).toBe('rgb(198, 244, 50)')

  await page.screenshot({ path: 'test-results/admin-functional-light.png', fullPage: true })

  await page.goto('/admin/users', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('input[type="checkbox"]').first()).toBeVisible()

  const includeInactiveCheckbox = page.locator('input[type="checkbox"]').first()
  await includeInactiveCheckbox.check()

  const checkboxStyles = await includeInactiveCheckbox.evaluate((element) => {
    const styles = getComputedStyle(element)
    return {
      backgroundColor: styles.backgroundColor,
      backgroundImage: styles.backgroundImage,
    }
  })

  expect(checkboxStyles.backgroundColor).toBe('rgb(198, 244, 50)')
  expect(checkboxStyles.backgroundImage).not.toBe('none')

  await page.goto('/admin/orders', { waitUntil: 'domcontentloaded' })

  const primaryAction = page.locator("button[class*='[background:var(--brand)]'], a[class*='[background:var(--brand)]']").first()
  await expect(primaryAction).toBeVisible()

  const primaryActionColor = await primaryAction.evaluate((element) => getComputedStyle(element).color)
  expect(primaryActionColor).toBe('rgb(5, 7, 10)')

  await page.screenshot({ path: 'test-results/admin-orders-light.png', fullPage: true })
})
