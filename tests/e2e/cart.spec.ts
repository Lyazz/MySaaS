import { test, expect } from '@playwright/test';

test.describe('Cart Functionality', () => {
    const tenantHost = 'apple.localhost:3000';

    test('Empty cart state', async ({ page }) => {
        await page.goto(`http://${tenantHost}/cart`);

        await expect(page.getByText('Your cart is empty')).toBeVisible();
        await expect(page.getByText('Start Shopping')).toBeVisible();

        // Verify "Start Shopping" button links to products
        await page.getByText('Start Shopping').click();
        await expect(page).toHaveURL(/.*\/products/);
    });

    test('Add item to cart and verify details', async ({ page }) => {
        // Go to home/products to add an item
        await page.goto(`http://${tenantHost}/`);

        // Find a product that is IN STOCK and add to cart
        const firstProductCard = page.locator('.grid .group').filter({ hasText: 'In Stock' }).first();
        await expect(firstProductCard).toBeVisible();

        // Get product title to verify later
        const productTitle = await firstProductCard.locator('h3').innerText();
        // Get price
        const priceText = await firstProductCard.locator('.text-lg.font-bold').innerText();
        const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));

        // Add to cart
        await firstProductCard.hover();
        const addToCartBtn = firstProductCard.getByTitle('Add to Cart');
        await addToCartBtn.click(); // Removed force: true, should be actionable

        // Navigate to cart
        await page.waitForTimeout(500); // Wait for potential state update
        await page.goto(`http://${tenantHost}/cart`);

        // Verify item is in cart
        await expect(page.getByText(productTitle)).toBeVisible();
        // Flexible price check
        const priceString = price.toFixed(2);
        await expect(page.getByText(priceString).first()).toBeVisible();

        // Verify subtotal matches
        await expect(page.locator('dt:has-text("Subtotal") + dd')).toContainText(priceString);
    });

    test('Update quantity and remove item', async ({ page }) => {
        // Setup: Add item first
        await page.goto(`http://${tenantHost}/`);
        // Find a product that is IN STOCK
        const firstProductCard = page.locator('.grid .group').filter({ hasText: 'In Stock' }).first();
        await firstProductCard.hover();

        // Click add to cart
        await firstProductCard.getByTitle('Add to Cart').click();

        // Wait for the cart badge in the header to update. 
        // This confirms the action was processed and allows time for local storage save if async (though it's sync)
        // Header cart link has href="/cart"
        const cartBadge = page.locator('a[href="/cart"] span').filter({ hasText: /[0-9]+/ });
        await expect(cartBadge).toBeVisible();

        await page.goto(`http://${tenantHost}/cart`);

        // Verify cart is not empty by checking the header count
        // "Shopping Cart" h1 is followed by count
        // My layout: <span ...>{{ cartStore.itemCount }} items</span>
        await expect(page.getByText('1 items')).toBeVisible();

        // Check initial quantity is 1 using role
        const cartItem = page.getByRole('listitem').first();
        const quantitySpan = cartItem.locator('span.text-gray-900.font-semibold');
        await expect(quantitySpan).toHaveText('1');

        // Increase quantity
        // svg path for plus: M12 6v6m0 0v6m0-6h6m-6 0H6
        const increaseBtn = cartItem.locator('button:has(svg path[d*="M12 6v6"])');
        await increaseBtn.click();

        // Check update
        await expect(quantitySpan).toHaveText('2');
        await expect(page.getByText('2 items')).toBeVisible();

        // Decrease quantity
        // svg path for minus: M20 12H4
        const decreaseBtn = cartItem.locator('button:has(svg path[d*="M20 12H4"])');
        await decreaseBtn.click();
        await expect(quantitySpan).toHaveText('1');

        // Remove item
        const removeBtn = cartItem.locator('button:has(span.sr-only:has-text("Remove"))');
        await removeBtn.click();

        // Expect empty state
        await expect(page.getByText('Your cart is empty')).toBeVisible();
    });
});
