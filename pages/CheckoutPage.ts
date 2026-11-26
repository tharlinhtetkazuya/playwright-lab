import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export interface ShippingDetails {
  email: string;
  firstName: string;
  lastName: string;
  address: string;
  postalCode: string;
  city: string;
  phone?: string;
  /** Visible option label in the country dropdown. Omit to keep the default. */
  country?: string;
}

/**
 * Student B - Guest checkout page object.
 * Also holds the Medusa Admin locators/actions (construct it with the admin tab's Page)
 * so pages/ stays at the four files the DoD asks for.
 * RULE: locators + user actions ONLY. No expect() in here.
 */
export class CheckoutPage extends BasePage {
  readonly emailInput: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly addressInput: Locator;
  readonly postalCodeInput: Locator;
  readonly cityInput: Locator;
  readonly phoneInput: Locator;
  readonly countrySelect: Locator;
  readonly continueToDeliveryButton: Locator;

  readonly standardDeliveryOption: Locator;
  readonly continueToPaymentButton: Locator;

  readonly paymentOption: Locator;
  readonly continueToReviewButton: Locator;
  readonly placeOrderButton: Locator;

  readonly orderConfirmation: Locator;
  readonly orderId: Locator;

  // Medusa Admin portal
  readonly adminEmailInput: Locator;
  readonly adminPasswordInput: Locator;
  readonly adminLoginButton: Locator;
  readonly adminOrdersHeading: Locator;

  constructor(page: Page) {
    super(page);
    // Step 1 - shipping address (+ guest email)
    this.emailInput = page.getByTestId('shipping-email-input');
    this.firstNameInput = page.getByTestId('shipping-first-name-input');
    this.lastNameInput = page.getByTestId('shipping-last-name-input');
    this.addressInput = page.getByTestId('shipping-address-input');
    this.postalCodeInput = page.getByTestId('shipping-postal-code-input');
    this.cityInput = page.getByTestId('shipping-city-input');
    this.phoneInput = page.getByTestId('shipping-phone-input');
    this.countrySelect = page.getByTestId('shipping-country-select');
    this.continueToDeliveryButton = page.getByTestId('submit-address-button');

    // Step 2 - delivery
    this.standardDeliveryOption = page
      .getByRole('radio', { name: /standard/i })
      .or(page.getByTestId('delivery-option-radio'))
      .first();
    this.continueToPaymentButton = page.getByTestId('submit-delivery-option-button');

    // Step 3 - payment + review
    this.paymentOption = page.getByRole('radio').first();
    this.continueToReviewButton = page.getByTestId('submit-payment-button');
    this.placeOrderButton = page.getByTestId('submit-order-button');

    // Confirmation page
    this.orderConfirmation = page.getByTestId('order-complete-container');
    this.orderId = page.getByTestId('order-id');

    this.adminEmailInput = page.getByLabel(/email/i);
    this.adminPasswordInput = page.getByLabel(/password/i);
    this.adminLoginButton = page.getByRole('button', { name: /continue with email|sign in|log in/i });
    this.adminOrdersHeading = page.getByRole('heading', { name: /orders/i }).first();
  }

  /** Text of a product somewhere on the checkout page (order summary). */
  summaryItem(productName: string | RegExp): Locator {
    const name = typeof productName === 'string' ? new RegExp(productName, 'i') : productName;
    return this.page.getByText(name).first();
  }

  async fillShippingAddress(d: ShippingDetails): Promise<void> {
    await this.emailInput.fill(d.email);
    await this.firstNameInput.fill(d.firstName);
    await this.lastNameInput.fill(d.lastName);
    await this.addressInput.fill(d.address);
    await this.postalCodeInput.fill(d.postalCode);
    await this.cityInput.fill(d.city);
    if (d.country) {
      await this.countrySelect.selectOption({ label: d.country });
    }
    if (d.phone) {
      await this.phoneInput.fill(d.phone);
    }
  }

  async continueToDelivery(): Promise<void> {
    await this.continueToDeliveryButton.click();
  }

  async selectStandardDelivery(): Promise<void> {
    await this.standardDeliveryOption.click();
  }

  async continueToPayment(): Promise<void> {
    await this.continueToPaymentButton.click();
  }

  async selectPaymentMethod(): Promise<void> {
    await this.paymentOption.click();
  }

  async continueToReview(): Promise<void> {
    await this.continueToReviewButton.click();
  }

  async placeOrder(): Promise<void> {
    await this.placeOrderButton.click();
  }

  /** Display id shown on the confirmation page, e.g. "12". */
  async getOrderId(): Promise<string> {
    return (await this.orderId.innerText()).replace(/\D/g, '');
  }

  // ---------- Medusa Admin ----------
  async adminLogin(adminUrl: string, email: string, password: string): Promise<void> {
    await this.page.goto(`${adminUrl}/app/login`);
    await this.adminEmailInput.fill(email);
    await this.adminPasswordInput.fill(password);
    await this.adminLoginButton.click();
  }

  async adminOpenOrders(adminUrl: string): Promise<void> {
    await this.page.goto(`${adminUrl}/app/orders`);
  }

  adminOrderRow(orderId: string): Locator {
    return this.page.getByRole('row').filter({ hasText: new RegExp(`#${orderId}\\b`) });
  }
}