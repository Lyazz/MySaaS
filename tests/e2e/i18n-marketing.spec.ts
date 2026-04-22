import { test, expect } from '@playwright/test'

test.describe('Marketing i18n', () => {
  test('switches marketing UI to French and Arabic', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expect(page.getByTestId('marketing-hero')).toBeVisible()
    await page.locator('[data-testid="locale-switch-toggle"]:visible').click()

    const frButton = page.locator('[data-testid="locale-switch-fr"]:visible')
    await expect(frButton).toBeVisible()
    await frButton.click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr-FR')
    await expect(page.locator('a:has-text("Tarifs")').first()).toBeVisible()

    await page.locator('[data-testid="locale-switch-toggle"]:visible').click()
    const arButton = page.locator('[data-testid="locale-switch-ar"]:visible')
    await arButton.click()
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  })
})
