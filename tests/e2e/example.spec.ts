import { test, expect } from '@playwright/test'

test('has title', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Swekly/);
});

test('welcome message', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Ready to launch?')).toBeVisible();
});
