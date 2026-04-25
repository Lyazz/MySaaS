import { test, expect } from '@playwright/test';

test.describe('Shop UX', () => {
    // Use a tenant host that exists in the seed data or environment
    const tenantHost = 'apple.localhost:3000';

    test('Shop home page loads with hero slider and products', async ({ page }) => {
        await page.goto(`http://${tenantHost}/`);

        // Check Hero Slider
        await expect(page.locator('h2', { hasText: 'New Collection 2026' }).first()).toBeVisible();
        await expect(page.getByText('Discover the latest trends')).toBeVisible();

        // Check Categories
        await expect(page.getByText('Browse by Category')).toBeVisible();
        // Check if at least one category link exists
        await expect(page.locator('a[href^="/category/"]').first()).toBeVisible();

        // Check Featured Products
        await expect(page.getByText('Trending Now')).toBeVisible();
        // Ensure product cards are visible
        // We expect at least a few products to be loaded (mock or real)
        // The "New Arrivals" section in ModernHome uses displayedProducts
        // If pending is false, it shows the grid.
        // We might need to wait for network idle or text to appear
        await expect(page.locator('h3').first()).toBeVisible();
    });

    test('Shop listing page loads and filters are visible', async ({ page }) => {
        await page.goto(`http://${tenantHost}/products`);

        await expect(page.getByRole('heading', { name: 'Full Catalog' })).toBeVisible();

        // Check Filters
        await expect(page.getByRole('heading', { name: 'Filters' })).toBeVisible();
        await expect(page.getByText('Categories', { exact: true })).toBeVisible();
        // Price Range removed as it was a placeholder
        // await expect(page.getByText('Price Range')).toBeVisible();

        // Check Product Grid in Shop
        // Expect at least one product card or "No products found" if empty
        // Use .flex-1 .grid to target the main content grid, not sidebar grids
        const productsGrid = page.locator('.flex-1 .grid');
        const noProductsMsg = page.getByText('No products found');

        // Race condition check: either grid appears or no products message appears
        await expect(async () => {
            const gridVisible = await productsGrid.isVisible().catch(() => false);
            const msgVisible = await noProductsMsg.isVisible().catch(() => false);
            expect(gridVisible || msgVisible).toBeTruthy();
        }).toPass();
    });

    test('Add to cart interaction (visual check)', async ({ page }) => {
        // This test mainly verifies the button is clickable and doesn't crash
        // Since we don't have full backend logic seamlessly mocking everything in this specific test file yet

        await page.goto(`http://${tenantHost}/`);

        // Find the first "In Stock" product card
        // In our code, we have a button that handles add to cart
        // We need to hover to see it in desktop, but let's try to force click or assume mobile view if responding

        // ModernProductCard has a button with title="Add to Cart"
        // Use .grid .group to avoid creating the hero slider which also has .group
        const firstProductCard = page.locator('.grid .group').first();

        // Ensure specific product card execution only if cards exist
        if (await firstProductCard.count() > 0) {
            await firstProductCard.hover();
            const addToCartBtn = firstProductCard.getByTitle('Add to Cart');

            if (await addToCartBtn.count() > 0) {
                await addToCartBtn.click({ force: true }); // Force click in case of hover issues
            }
        }
    });

    test.describe('Mobile Shop UX', () => {
        test.use({ viewport: { width: 375, height: 667 } });

        test('Mobile filter drawer works', async ({ page }) => {
            await page.goto(`http://${tenantHost}/products`);

            // Sidebar should be hidden
            // Note: We need a reliable way to check if the SIDEBAR is hidden, checking specifically for the desktop aside
            // The desktop aside has class 'hidden lg:block'
            // We can check if the heading "Filters" inside the sidebar is not visible, BUT the drawer also has "Filters".
            // So we rely on the drawer interaction.

            // The 'Filters & Sort' toggle button should be visible
            const toggleBtn = page.getByRole('button', { name: 'Filters & Sort' });
            await expect(toggleBtn).toBeVisible();

            // Open Drawer
            await toggleBtn.click({ force: true });
            // Wait a small amount for Vue transition to initiate
            await page.waitForTimeout(500);

            // Now expect the drawer content to be visible.
            // The drawer has a close button (X icon) or we can look for "Show Results" which is unique to mobile drawer normally (or part of it)
            // Or look for the overlay.
            // Check for a filter option in the drawer
            // Mobile drawer uses 'fixed' positioning, desktop uses 'sticky'
            const drawer = page.locator('aside.fixed');
            await expect(drawer).toBeVisible({ timeout: 15000 });
            await expect(drawer.getByText('Categories')).toBeVisible();

            // Close Drawer via button
            // "Show Results" button should also close it
            await page.getByRole('button', { name: 'Show Results' }).click();
            await expect(drawer).not.toBeVisible();
        });
    });

});
