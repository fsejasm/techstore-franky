import { test, expect } from '../../../src/fixtures/test-fixtures';
import { env } from '../../../src/config/env';

/**
 * Suite "bug-hunting" (didáctica) — Web UI.
 *
 * Detecta bugs plantados a propósito en el frontend/backend
 * (ver app/src/bugs.ts y app/public/app.js). Activa el modo Bug Hunting
 * vía API antes de cargar la página, por lo que estos tests FALLAN a
 * propósito demostrando que atrapan el defecto. El afterEach lo apaga.
 *
 * Cómo correrlas (PowerShell):
 *   npm run test:bugs
 *
 * No se usa modo serial: cada test resetea el estado en su beforeEach para
 * que cada bug se evidencie de forma independiente (aunque otro falle).
 */
test.describe('Bug-hunting Web', () => {
  test.beforeEach(async ({ request, loginPage, shopPage }) => {
    await request.post(`${env.apiBaseURL}/api/test/reset`);
    // Enciende el modo Bug Hunting antes de cargar la página, para que el
    // frontend lea el flag activo desde /api/config al arrancar.
    await request.post(`${env.apiBaseURL}/api/config/bugs`, { data: { enabled: true } });

    await loginPage.open();
    await loginPage.login(env.credentials.username, env.credentials.password);
    await expect(shopPage.homeView).toBeVisible();
  });

  test.afterEach(async ({ request }) => {
    await request.post(`${env.apiBaseURL}/api/config/bugs`, { data: { enabled: false } });
  });

  // BUG(4): contador de favoritos con off-by-one en la UI.
  test('BUG 4: el contador de favoritos coincide con los favoritos reales', async ({
    shopPage,
  }) => {
    await shopPage.toggleFavorite(1);

    // Con BUGS=on el contador muestra "0" (off-by-one) en vez de "1".
    await expect(shopPage.favoritesCount).toHaveText('1');

    // Y la vista de favoritos sí tiene 1 producto: evidencia la desincronización.
    await shopPage.goToView('favorites');
    await expect(shopPage.favorites()).toHaveCount(1);
  });

  // BUG(1) visto desde la UI: el total del carrito ignora la cantidad.
  test('BUG 1 (UI): el total del carrito refleja la cantidad', async ({ shopPage }) => {
    // Agrega el mismo producto dos veces (Teclado, id 3, 89.50 c/u).
    await shopPage.addProductToCart(3);
    await shopPage.addProductToCart(3);
    await shopPage.openCart();

    await expect(shopPage.cartCount).toHaveText('2');
    // Con BUGS=on el total muestra $89.50 en vez de $179.00.
    await expect(shopPage.cartTotal).toHaveText('$179.00');
  });

  // BUG(6) desde la UI: el login acepta cualquier contraseña.
  test('BUG 6 (UI): login con contraseña incorrecta muestra error', async ({
    loginPage,
    shopPage,
  }) => {
    // Recarga para volver a la pantalla de login (sin sesión en el cliente).
    await loginPage.open();
    await loginPage.login(env.credentials.username, 'contraseña-incorrecta');

    // Con BUGS=on entra igual (catálogo visible) en vez de mostrar el error.
    await expect(loginPage.error).toBeVisible();
    await expect(shopPage.currentUser).toBeHidden();
  });

  // BUG(7): el porcentaje de descuento se calcula mal.
  test('BUG 7: el porcentaje de descuento del producto es correcto', async ({ shopPage }) => {
    // Laptop Pro 14" (id 1): $1299 sobre $1499 → descuento correcto = 13%.
    // Con BUGS=on la fórmula está mal y muestra -87%.
    await expect(shopPage.dealBadge(1)).toHaveText('-13%');
  });
});
