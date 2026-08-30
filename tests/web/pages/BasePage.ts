import type { Page } from '@playwright/test';

/**
 * Base class for all page objects. Holds the Playwright Page instance
 * and common navigation/utility helpers shared across pages.
 */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  /** Navigate to a path relative to the configured web baseURL. */
  async goto(path = '/'): Promise<void> {
    await this.page.goto(path);
  }

  /** Return the current page title. */
  async title(): Promise<string> {
    return this.page.title();
  }

  /** Wait until the network is idle (useful after client-side navigation). */
  async waitForIdle(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }
}
