import { test as base } from '@playwright/test';
import { LoginPage } from '../../tests/web/pages/LoginPage';
import { ShopPage } from '../../tests/web/pages/ShopPage';
import { ApiClient } from '../../tests/api/clients/ApiClient';

/**
 * Fixtures personalizados que extienden el test base de Playwright con
 * objetos reutilizables:
 * - page objects para pruebas de Web UI
 * - un cliente de API para pruebas de API
 *
 * Importa { test, expect } desde este módulo en lugar de '@playwright/test'
 * para que estos fixtures se inyecten automáticamente.
 */
type Fixtures = {
  loginPage: LoginPage;
  shopPage: ShopPage;
  apiClient: ApiClient;
};

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  shopPage: async ({ page }, use) => {
    await use(new ShopPage(page));
  },

  apiClient: async ({ request }, use) => {
    await use(new ApiClient(request));
  },
});

export { expect } from '@playwright/test';
