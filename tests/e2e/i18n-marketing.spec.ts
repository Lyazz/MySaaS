import { test, expect } from '@playwright/test'

test.describe('Marketing i18n', () => {
  test('switches marketing UI to French and Arabic', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const frButton = page.locator('[data-testid="locale-switch-fr"]').first()
    await expect(frButton).toBeVisible()
    await frButton.click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr-FR')
    await expect(page.locator('a:has-text("Tarifs")').first()).toBeVisible()

    const arButton = page.locator('[data-testid="locale-switch-ar"]').first()
    await arButton.click()
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  })
})
