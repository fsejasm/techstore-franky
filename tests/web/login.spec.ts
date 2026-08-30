import { test, expect } from '../../src/fixtures/test-fixtures';
import { env } from '../../src/config/env';
import { allure } from 'allure-playwright';

/**
 * Pruebas de Web UI de login usando el Page Object Model,
 * contra la Demo App local.
 */
test.describe('Login', () => {
  test.beforeEach(async ({ loginPage }) => {
    await allure.epic('Web UI');
    await allure.feature('Autenticación');
    await loginPage.open();
  });

  test('login exitoso muestra el catálogo de la tienda', async ({ loginPage, shopPage }) => {
    await allure.severity('critical');
    await allure.story('Login exitoso');

    await loginPage.login(env.credentials.username, env.credentials.password);

    await expect(shopPage.view).toBeVisible();
    await expect(shopPage.currentUser).toHaveText(env.credentials.username);
  });

  test('login con credenciales inválidas muestra un error', async ({ loginPage }) => {
    await allure.severity('normal');
    await allure.story('Login fallido');

    await loginPage.login('admin', 'clave-incorrecta');

    await expect(loginPage.error).toBeVisible();
    await expect(loginPage.error).toContainText('Credenciales inválidas');
  });

  test('el catálogo es visible sin iniciar sesión', async ({ loginPage, shopPage }) => {
    await allure.story('Catálogo público');

    // Sin autenticarse: el panel de login y el catálogo coexisten.
    await expect(loginPage.view).toBeVisible();
    await expect(shopPage.homeView).toBeVisible();
    await expect(shopPage.products()).toHaveCount(10);
    // El menú de navegación permanece oculto hasta iniciar sesión.
    await expect(shopPage.sidebar).toBeHidden();
  });

  test('agregar al carrito sin sesión redirige al login', async ({ loginPage, shopPage }) => {
    await allure.story('Acceso protegido');

    await shopPage.addProductToCart(1);

    // No se abre el carrito; en su lugar se pide iniciar sesión.
    await expect(shopPage.cartPanel).toBeHidden();
    await expect(loginPage.error).toContainText('Inicia sesión');
  });
});
