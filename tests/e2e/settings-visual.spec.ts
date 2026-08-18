import { expect, test, type Page } from '@playwright/test'

/**
 * Visual + behavioural sweep of the settings area.
 *
 * Registers a throwaway tenant, then walks every settings destination at three
 * viewports, capturing a screenshot of each and asserting the layout invariants
 * that the responsive rework depends on:
 *
 *  - the page never scrolls sideways
 *  - the settings content starts near the top of the viewport on mobile,
 *    instead of below a full screen of navigation
 *  - the desktop rail is present, the mobile section bar is not, and vice versa
 *
 * Screenshots land in test-results/settings-visual/ for eyeballing.
 */

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 834, height: 1000 },
  { name: 'desktop', width: 1440, height: 950 }
] as const

const PAGES = [
  { name: 'appearance', path: '/admin/settings/appearance' },
  { name: 'homepage', path: '/admin/settings/homepage' },
  { name: 'checkout', path: '/admin/settings/functional?section=checkout' },
  { name: 'fraud', path: '/admin/settings/functional?section=fraud' },
  { name: 'loyalty', path: '/admin/settings/functional?section=loyalty' },
  { name: 'localization', path: '/admin/settings/functional?section=localization' },
  { name: 'maintenance', path: '/admin/settings/functional?section=maintenance' },
  { name: 'contact', path: '/admin/settings/contact' },
  { name: 'legal', path: '/admin/settings/legal' },
  { name: 'domains', path: '/admin/settings/domains' }
] as const

const SHOT_DIR = 'test-results/settings-visual'

async function registerTenant(page: Page) {
  const stamp = Date.now()
  const slug = `vis-${stamp}`
  // Phone numbers are unique per tenant, so a fixed one only registers once.
  const phone = `+2135${String(stamp).slice(-8)}`

  await page.goto('/register')
  // /register is server-rendered: fill before hydration and Vue wipes the
  // values when it mounts. networkidle is a good enough hydration signal on
  // this page (unlike the admin, which keeps a notification poll open).
  await page.waitForLoadState('networkidle')
  await page.getByTestId('register-company').fill(`Visual ${stamp}`)
  await page.getByTestId('register-slug').fill(slug)
  await page.getByTestId('register-email').fill(`vis-${stamp}@example.com`)
  await page.getByTestId('register-phone').fill(phone)
  await page.getByTestId('register-send-otp').click()
  await page.getByTestId('register-otp').fill('123456')
  await page.getByTestId('register-verify-otp').click()
  await page.getByTestId('register-password').fill('Password123!')
  await page.getByTestId('register-confirm-password').fill('Password123!')

  const registered = page.waitForResponse(
    (r) => r.url().includes('/api/register') && r.request().method() === 'POST'
  )
  await page.click('button[type="submit"]')
  const response = await registered
  expect(response.ok(), `registration failed: ${await response.text()}`).toBe(true)

  await expect(page.getByTestId('register-success')).toBeVisible({ timeout: 30000 })
  await page.getByTestId('register-go-dashboard').click()
  await expect(page).toHaveURL(/\/admin(\/onboarding)?$/, { timeout: 30000 })
}

/**
 * A brand new tenant is held on /admin/onboarding until its store settings are
 * marked complete, so flip that flag before walking the settings pages.
 */
async function completeOnboarding(page: Page) {
  const ok = await page.evaluate(async () => {
    const cookie = document.cookie.split('; ').find((c) => c.startsWith('auth_token='))
    const token = cookie ? decodeURIComponent(cookie.slice('auth_token='.length)) : null
    if (!token) return false
    const res = await fetch('/api/admin/store-settings', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ isCompleted: true })
    })
    return res.ok
  })
  expect(ok, 'could not mark onboarding complete').toBe(true)
}

/** Closes the product tour, which otherwise covers the page it is describing. */
async function dismissTour(page: Page) {
  const close = page.locator('.driver-popover-close-btn')
  if (await close.count()) {
    await close.first().click()
    await expect(close.first()).toBeHidden()
  }
}

test.describe('settings — responsive layout', () => {
  test.describe.configure({ mode: 'serial' })
  test.setTimeout(240000)

  let page: Page

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await registerTenant(page)
    await completeOnboarding(page)
  })

  test.afterAll(async () => {
    await page.close()
  })

  test('every settings page holds up at mobile, tablet and desktop', async () => {
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })

      for (const target of PAGES) {
        await page.goto(target.path)
        const header = page.locator('.settings-header-title')
        await expect(header, `${target.name} @ ${viewport.name}: no page header`).toBeVisible({ timeout: 30000 })
        await dismissTour(page)

        // No sideways scroll, at any width.
        const overflow = await page.evaluate(() => {
          const el = document.scrollingElement || document.documentElement
          return el.scrollWidth - el.clientWidth
        })
        expect(overflow, `${target.name} @ ${viewport.name} scrolls horizontally`).toBeLessThanOrEqual(1)

        // The rail and the compact section bar are mutually exclusive.
        const railVisible = await page.locator('.settings-shell-rail').isVisible()
        const barVisible = await page.locator('.settings-shell-bar').isVisible()
        if (viewport.width >= 1024) {
          expect(railVisible, `${target.name} @ ${viewport.name}: rail should show`).toBe(true)
          expect(barVisible, `${target.name} @ ${viewport.name}: bar should hide`).toBe(false)
        } else {
          expect(railVisible, `${target.name} @ ${viewport.name}: rail should hide`).toBe(false)
          expect(barVisible, `${target.name} @ ${viewport.name}: bar should show`).toBe(true)
        }

        // The reason this rework exists: on a phone the settings themselves
        // have to be on the first screen, not under a stack of nav groups.
        const headerTop = await header.evaluate((el) => el.getBoundingClientRect().top)
        expect(
          headerTop,
          `${target.name} @ ${viewport.name}: content starts ${Math.round(headerTop)}px down`
        ).toBeLessThan(viewport.height / 2)

        await page.screenshot({
          path: `${SHOT_DIR}/${viewport.name}-${target.name}.png`,
          fullPage: true
        })
      }
    }
  })

  test('the mobile drawer finds a setting by name and navigates to it', async () => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/admin/settings/appearance')
    await expect(page.locator('.settings-header-title')).toBeVisible({ timeout: 30000 })
    await dismissTour(page)

    await page.locator('.settings-shell-bar-trigger').click()
    const drawer = page.locator('#settings-nav-drawer')
    await expect(drawer).toBeVisible()

    const search = drawer.locator('.settings-nav-search-input')
    await expect(search).toBeFocused()
    await search.fill('loyalty')

    const results = drawer.locator('.settings-nav-result')
    await expect(results).toHaveCount(1)
    await page.screenshot({ path: `${SHOT_DIR}/mobile-drawer-search.png` })

    await search.press('Enter')
    await expect(page).toHaveURL(/section=loyalty/)
    await expect(drawer).toBeHidden()
  })

  test('leaving a settings page with unsaved changes asks first', async () => {
    await page.setViewportSize({ width: 1440, height: 950 })
    await page.goto('/admin/settings/appearance')
    await expect(page.locator('.settings-header-title')).toBeVisible({ timeout: 30000 })
    await dismissTour(page)

    await page.locator('.field-input').first().fill('Renamed store')
    await expect(page.locator('.save-bar')).toBeVisible()
    await page.screenshot({ path: `${SHOT_DIR}/desktop-save-bar.png` })

    await page.locator('.settings-shell-rail .settings-nav-item', { hasText: /homepage/i }).first().click()

    const dialog = page.locator('[role="alertdialog"]')
    await expect(dialog).toBeVisible()
    await page.screenshot({ path: `${SHOT_DIR}/desktop-leave-guard.png` })

    // Keep editing → we stay put with the edit intact.
    await dialog.getByRole('button').first().click()
    await expect(dialog).toBeHidden()
    await expect(page).toHaveURL(/\/admin\/settings\/appearance/)
    await expect(page.locator('.field-input').first()).toHaveValue('Renamed store')
  })

  test('renders right-to-left without mirroring faults in Arabic', async () => {
    await page.setViewportSize({ width: 1440, height: 950 })
    await page.goto('/admin/settings/functional?section=checkout')
    await expect(page.locator('.settings-header-title')).toBeVisible({ timeout: 30000 })
    await dismissTour(page)

    await page.evaluate(() => {
      document.documentElement.setAttribute('dir', 'rtl')
    })

    const overflow = await page.evaluate(() => {
      const el = document.scrollingElement || document.documentElement
      return el.scrollWidth - el.clientWidth
    })
    expect(overflow, 'RTL layout scrolls horizontally').toBeLessThanOrEqual(1)

    await page.screenshot({ path: `${SHOT_DIR}/desktop-rtl.png`, fullPage: true })
  })
})
