import { test, expect } from '@playwright/test'

test('has title', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/MySaaS/);
});

test('welcome message', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Ready to find your forever customers?')).toBeVisible();
});
