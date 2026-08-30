import type { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object para la vista de login de la Demo App local.
 */
export class LoginPage extends BasePage {
  readonly view: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly error: Locator;

  constructor(page: Page) {
    super(page);
    this.view = page.getByTestId('login-view');
    this.usernameInput = page.getByTestId('username-input');
    this.passwordInput = page.getByTestId('password-input');
    this.submitButton = page.getByTestId('login-button');
    this.error = page.getByTestId('login-error');
  }

  /** Abre la home (que arranca en la vista de login). */
  async open(): Promise<void> {
    await this.goto('/');
  }

  /** Completa el formulario y envía. */
  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
