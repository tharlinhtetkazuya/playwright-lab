import { test, expect, Page } from '@playwright/test';

const PRODUCT_A = /classic t-shirt/i;
const PRODUCT_B = /winter jacket/i;

/** Open the catalog, pick a product, choose a variant if needed, add to cart. */
async function addToCart(page: Page, productName: RegExp, expectedCartCount: number) {
  await page.goto('/vn/store');

  const productCard = page.getByRole('link', { name: productName }).first();
  await expect(productCard).toBeVisible({ timeout: 15000 });
  await productCard.click();
  await expect(page).toHaveURL(/.*products/, { timeout: 15000 });

  const actionBtn = page.getByRole('button', { name: /add to cart|select variant|out of stock/i });
  await expect(actionBtn).toBeVisible({ timeout: 15000 });

  const sizeLButton = page.getByRole('button', { name: 'L', exact: true });
  if (await sizeLButton.isVisible()) {
    await sizeLButton.click();
  }
  const colorBlackButton = page.getByRole('button', { name: /black/i });
  if (await colorBlackButton.isVisible()) {
    await colorBlackButton.click();
  }

  // Now the label should have switched to "Add to cart"
  const addToCartBtn = page.getByRole('button', { name: /add to cart/i });
  await expect(addToCartBtn).toBeEnabled({ timeout: 15000 });
  await addToCartBtn.click();

  // Wait for the backend/server action to finish: nav badge shows the new count
  const cartCounter = page.getByText(new RegExp(`Cart\\s*\\(${expectedCartCount}\\)`, 'i')).first();
  await expect(cartCounter).toBeVisible({ timeout: 25000 });
}

/** Read the numeric subtotal from the data-value attribute (e.g. "250000"). */
async function cartSubTotal(page: Page): Promise<number> {
  const raw = await page.getByTestId('cart-subtotal').first().getAttribute('data-value');
  return Number(raw);
}

/** Row container for one cart line item – keeps every row action strict-mode safe. */
const cartRow = (page: Page, productName: RegExp) =>
  page.getByTestId('product-row').filter({ hasText: productName });

// ---------- test ----------

test('E2E Extended: multi-item cart, quantity update, remove item, go to checkout', async ({ page }) => {
  // Long multi-page flow + Render cold start > default 30s test timeout
  test.setTimeout(120_000);

  await test.step('Add first product (Classic T-shirt)', async () => {
    await addToCart(page, PRODUCT_A, 1);
  });

  await test.step('Add second distinct product (Winter jacket)', async () => {
    await addToCart(page, PRODUCT_B, 2);
  });

  await test.step('Open /vn/cart and verify both line items', async () => {
    await page.goto('/vn/cart');
    await expect(page).toHaveURL(/.*\/cart/, { timeout: 15000 });

    await expect(cartRow(page, PRODUCT_A)).toBeVisible({ timeout: 15000 });
    await expect(cartRow(page, PRODUCT_B)).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('product-row')).toHaveCount(2);
  });

  await test.step('Increase quantity of Classic T-shirt from 1 to 2', async () => {
    const subtotalBefore = await cartSubTotal(page);

    const qtySelect = cartRow(page, PRODUCT_A).getByTestId('product-select-button');
    await expect(qtySelect).toBeVisible({ timeout: 15000 });
    await qtySelect.selectOption('2');

    await expect(qtySelect).toHaveValue('2', { timeout: 20000 });
    await expect
      .poll(() => cartSubTotal(page), { timeout: 20000, message: 'subtotal should increase after qty 2' })
      .toBeGreaterThan(subtotalBefore);
  });

  await test.step('Remove Winter jacket and verify subtotal drops', async () => {
    const subtotalBefore = await cartSubTotal(page);

    const jacketRow = cartRow(page, PRODUCT_B);
    const removeBtn = jacketRow.getByRole('button');
    await expect(removeBtn).toBeVisible({ timeout: 15000 });
    await removeBtn.click();

    await expect(jacketRow).toBeHidden({ timeout: 20000 });
    await expect(page.getByTestId('product-row')).toHaveCount(1);
    await expect(cartRow(page, PRODUCT_A)).toBeVisible();

    await expect
      .poll(() => cartSubTotal(page), { timeout: 20000, message: 'subtotal should decrease after removal' })
      .toBeLessThan(subtotalBefore);
  });

  await test.step('Go to checkout and verify the checkout page', async () => {
    const checkoutBtn = page.getByRole('button', { name: /go to checkout/i }).first();
    await expect(checkoutBtn).toBeVisible({ timeout: 15000 });
    await expect(checkoutBtn).toBeEnabled();
    await checkoutBtn.click();

    await expect(page).toHaveURL(/.*\/checkout/, { timeout: 20000 });

    // Shipping address form
    await expect(page.getByTestId('shipping-first-name-input')).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('shipping-last-name-input')).toBeVisible();
    await expect(page.getByTestId('shipping-address-input')).toBeVisible();
    await expect(page.getByTestId('shipping-email-input')).toBeVisible();

    // Order summary panel (still shows the remaining Classic T-shirt)
    await expect(page.getByText(PRODUCT_A).first()).toBeVisible();
  });
});