import { test, expect } from '@playwright/test';
import { ProductPage } from '../pages/ProductPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage, ShippingDetails } from '../pages/CheckoutPage';

const PRODUCT = 'Classic T-Shirt';

const guest: ShippingDetails = {
  email: `guest.${Date.now()}@example.com`,
  firstName: 'An',
  lastName: 'Nguyen',
  address: '123 Nguyen Hue',
  postalCode: '700000',
  city: 'Ho Chi Minh City',
  phone: '0901234567',
};

// CO02 needs the order id created by CO01.
test.describe.configure({ mode: 'serial' });

test.describe('Medusa - Guest Checkout E2E + Admin verification', () => {
  let orderId = '';

  test('CO01: guest completes checkout and gets an order id', async ({ page }) => {
    test.setTimeout(180_000);
    const productPage = new ProductPage(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);

    await test.step('Add product to cart', async () => {
      await productPage.openProductFromStore(PRODUCT);
      await productPage.selectSize('M');
      await productPage.selectColor('White');
      await productPage.addToCart();
      await expect(cartPage.cartCounterOne).toBeVisible({ timeout: 25000 });
    });

    await test.step('Go to cart, then checkout', async () => {
      await expect(cartPage.goToCartButton).toBeVisible({ timeout: 10000 });
      await cartPage.goToCartButton.click();
      await expect(page).toHaveURL(/.*\/cart/, { timeout: 20000 });
      await expect(cartPage.checkoutButton).toBeVisible({ timeout: 15000 });
      await cartPage.proceedToCheckout();
      await expect(page).toHaveURL(/.*\/checkout/, { timeout: 20000 });
      await expect(checkoutPage.summaryItem(PRODUCT)).toBeVisible({ timeout: 20000 });
    });

    await test.step('Shipping address', async () => {
      await expect(checkoutPage.firstNameInput).toBeVisible({ timeout: 20000 });
      await checkoutPage.fillShippingAddress(guest);
      await checkoutPage.continueToDelivery();
    });

    await test.step('Standard delivery', async () => {
      await expect(checkoutPage.standardDeliveryOption).toBeVisible({ timeout: 20000 });
      await checkoutPage.selectStandardDelivery();
      await checkoutPage.continueToPayment();
    });

    await test.step('Payment and place order', async () => {
      await expect(checkoutPage.paymentOption).toBeVisible({ timeout: 20000 });
      await checkoutPage.selectPaymentMethod();
      await checkoutPage.continueToReview();
      await expect(checkoutPage.placeOrderButton).toBeVisible({ timeout: 20000 });
      await checkoutPage.placeOrder();
    });

    await test.step('Order confirmation', async () => {
      await expect(checkoutPage.orderConfirmation).toBeVisible({ timeout: 60000 });
      await expect(checkoutPage.orderId).toHaveText(/\d+/);
      orderId = await checkoutPage.getOrderId();
    });
  });

  test('CO02: order id is visible in Medusa Admin', async ({ browser }) => {
    const { ADMIN_URL, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
    test.skip(!ADMIN_URL || !ADMIN_EMAIL || !ADMIN_PASSWORD, 'Set ADMIN_URL, ADMIN_EMAIL, ADMIN_PASSWORD');
    test.skip(!orderId, 'No order id from CO01');

    const context = await browser.newContext();
    const admin = new CheckoutPage(await context.newPage()); // admin members live in CheckoutPage

    await admin.adminLogin(ADMIN_URL!, ADMIN_EMAIL!, ADMIN_PASSWORD!);
    await expect(admin.adminOrdersHeading).toBeVisible({ timeout: 60000 });
    await admin.adminOpenOrders(ADMIN_URL!);
    await expect(admin.adminOrderRow(orderId)).toBeVisible({ timeout: 30000 });

    await context.close();
  });
});